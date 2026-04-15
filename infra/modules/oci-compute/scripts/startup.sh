#!/usr/bin/env bash
# =============================================================================
# OCI ARM Instance — Cloud-init startup script (Terraform templatefile)
# =============================================================================
# Template variables injected by Terraform:
#   TIMEZONE                       — IANA timezone string (e.g. Europe/Madrid)
#   ADDITIONAL_SSH_PUB_KEY         — Extra SSH public key (may be empty string)
#   INSTALL_RUNTIPI                — "true" | "false"
#   RUNTIPI_REVERSE_PROXY_IP       — Static IP for RunTipi Traefik
#   RUNTIPI_MAIN_NETWORK_SUBNET    — Docker network subnet for RunTipi
#   RUNTIPI_ADGUARD_IP             — Static IP for AdGuard
#   WIREGUARD_CLIENT_CONFIGURATION — wg0.conf content (may be empty string)
# =============================================================================

set -euo pipefail
exec > >(tee /var/log/startup.log) 2>&1

echo "[startup] Beginning cloud-init at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# =============================================================================
# 1. System configuration
# =============================================================================

# Timezone
timedatectl set-timezone "${TIMEZONE}"
echo "[startup] Timezone set to ${TIMEZONE}"

# Additional SSH key (authorised for root; ubuntu user is set by cloud-init metadata)
if [[ -n ${ADDITIONAL_SSH_PUB_KEY} ]]; then
	mkdir -p /root/.ssh
	chmod 700 /root/.ssh
	echo "${ADDITIONAL_SSH_PUB_KEY}" >>/root/.ssh/authorized_keys
	chmod 600 /root/.ssh/authorized_keys

	# Also add to ubuntu user
	if id ubuntu &>/dev/null; then
		mkdir -p /home/ubuntu/.ssh
		chmod 700 /home/ubuntu/.ssh
		echo "${ADDITIONAL_SSH_PUB_KEY}" >>/home/ubuntu/.ssh/authorized_keys
		chmod 600 /home/ubuntu/.ssh/authorized_keys
		chown -R ubuntu:ubuntu /home/ubuntu/.ssh
	fi
	echo "[startup] Additional SSH public key added"
fi

# Keepalive cron — prevent OCI idle reclamation (CPU < 20% for 7 consecutive days)
# Writes a dummy file every 6 hours to simulate activity without burning real CPU
(
	crontab -l 2>/dev/null
	echo "0 */6 * * * dd if=/dev/urandom bs=1M count=5 of=/dev/null 2>/dev/null"
) | crontab -
echo "[startup] OCI keepalive cron installed"

# =============================================================================
# 2. System packages
# =============================================================================

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
	ca-certificates \
	curl \
	gnupg \
	lsb-release \
	htop \
	iotop \
	net-tools \
	jq \
	unzip \
	fail2ban

echo "[startup] System packages installed"

# =============================================================================
# 3. Docker CE
# =============================================================================

if ! command -v docker &>/dev/null; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
		-o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc

	echo \
		"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		>/etc/apt/sources.list.d/docker.list

	apt-get update -qq
	apt-get install -y -qq \
		docker-ce \
		docker-ce-cli \
		containerd.io \
		docker-buildx-plugin \
		docker-compose-plugin

	systemctl enable docker
	systemctl start docker

	# Allow ubuntu user to run docker without sudo
	if id ubuntu &>/dev/null; then
		usermod -aG docker ubuntu
	fi

	echo "[startup] Docker CE installed"
else
	echo "[startup] Docker already installed, skipping"
fi

# =============================================================================
# 4. Mount block volume at /mnt/data
# =============================================================================

BLOCK_DEV=""
# Paravirtualized attachments on OCI appear as /dev/sdb or /dev/oracleoci/oraclevdb
for dev in /dev/sdb /dev/oracleoci/oraclevdb /dev/vdb; do
	if [[ -b $dev ]]; then
		BLOCK_DEV="$dev"
		break
	fi
done

if [[ -n $BLOCK_DEV ]]; then
	if ! blkid "$BLOCK_DEV" | grep -q ext4; then
		echo "[startup] Formatting $BLOCK_DEV as ext4..."
		mkfs.ext4 -F "$BLOCK_DEV"
	fi

	mkdir -p /mnt/data
	echo "$BLOCK_DEV  /mnt/data  ext4  defaults,nofail  0  2" >>/etc/fstab
	mount /mnt/data
	echo "[startup] Block volume mounted at /mnt/data"

	# Move Docker data dir to the block volume for persistence
	systemctl stop docker || true
	if [[ -d /var/lib/docker ]] && [[ ! -d /mnt/data/docker ]]; then
		mv /var/lib/docker /mnt/data/docker
	fi
	mkdir -p /mnt/data/docker

	# Configure Docker daemon to use /mnt/data/docker
	mkdir -p /etc/docker
	cat >/etc/docker/daemon.json <<'DOCKERD'
{
  "data-root": "/mnt/data/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
DOCKERD

	systemctl start docker
	echo "[startup] Docker data-root moved to /mnt/data/docker"
else
	echo "[startup] WARNING: No block device found to mount. Skipping /mnt/data setup."
fi

# =============================================================================
# 5. WireGuard VPN (optional — client mode)
# =============================================================================

WIREGUARD_CONF="${WIREGUARD_CLIENT_CONFIGURATION}"
if [[ -n $WIREGUARD_CONF ]]; then
	apt-get install -y -qq wireguard

	mkdir -p /etc/wireguard
	chmod 700 /etc/wireguard
	echo "$WIREGUARD_CONF" >/etc/wireguard/wg0.conf
	chmod 600 /etc/wireguard/wg0.conf

	systemctl enable wg-quick@wg0
	systemctl start wg-quick@wg0
	echo "[startup] WireGuard VPN configured and started"
else
	echo "[startup] WireGuard not configured, skipping"
fi

# =============================================================================
# 6. RunTipi homeserver (optional)
# =============================================================================

INSTALL_RUNTIPI_VAL="${INSTALL_RUNTIPI}"
if [[ $INSTALL_RUNTIPI_VAL == "true" ]]; then
	RUNTIPI_DIR="/mnt/data/runtipi"
	mkdir -p "$RUNTIPI_DIR"
	cd "$RUNTIPI_DIR"

	# Download RunTipi bootstrap — verify SHA256 before executing (never pipe curl to bash)
	# Pin to a specific release tag; update RUNTIPI_VERSION and RUNTIPI_SHA256 on upgrades.
	RUNTIPI_VERSION="4.4.2"
	RUNTIPI_SHA256="ac86a73e5e71ef24e4a41e61a42c95b4c7e4e54e6e7b8d8e14a7a6e43f6ff39e"
	RUNTIPI_INSTALLER="/tmp/runtipi-install-$RUNTIPI_VERSION.sh"

	curl -fsSL \
		"https://github.com/runtipi/runtipi/releases/download/v$RUNTIPI_VERSION/install.sh" \
		-o "$RUNTIPI_INSTALLER"

	# Abort if checksum does not match
	echo "$RUNTIPI_SHA256  $RUNTIPI_INSTALLER" | sha256sum --check --strict || {
		echo "[startup] ERROR: RunTipi installer SHA256 mismatch — aborting installation"
		rm -f "$RUNTIPI_INSTALLER"
		exit 1
	}

	chmod +x "$RUNTIPI_INSTALLER"
	bash "$RUNTIPI_INSTALLER"
	rm -f "$RUNTIPI_INSTALLER"

	# Configure custom Docker network settings if RunTipi supports it
	# (RunTipi uses its own docker-compose network; we document our subnet config)
	TIPI_SETTINGS="$RUNTIPI_DIR/settings.json"
	if [[ ! -f $TIPI_SETTINGS ]]; then
		cat >"$TIPI_SETTINGS" <<TIPISETTINGS
{
  "listenIp": "0.0.0.0",
  "dnsIp": "${RUNTIPI_ADGUARD_IP}"
}
TIPISETTINGS
	fi

	echo "[startup] RunTipi installed at $RUNTIPI_DIR"
	echo "[startup] Reverse proxy IP: ${RUNTIPI_REVERSE_PROXY_IP}"
	echo "[startup] AdGuard IP: ${RUNTIPI_ADGUARD_IP}"
	echo "[startup] Network subnet: ${RUNTIPI_MAIN_NETWORK_SUBNET}"
else
	echo "[startup] RunTipi not requested, skipping"
fi

# =============================================================================
# 7. Hardening
# =============================================================================

# fail2ban for SSH brute-force protection
systemctl enable fail2ban
systemctl start fail2ban

# Disable password auth for SSH (keep key-only access)
sed -i 's/#*PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#*PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload sshd || true

echo "[startup] SSH hardening applied"

# =============================================================================
echo "[startup] Cloud-init completed successfully at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
