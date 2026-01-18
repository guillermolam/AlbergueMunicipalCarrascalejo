#!/usr/bin/env python3
"""
Advanced Port Manager for Albergue Municipal Carrascalejo
Generates unique random ports for all services and manages port allocation.
"""

import json
import os
import random
import socket
import sys
from typing import Dict, Set


class PortManager:
    def __init__(self, port_range=(30000, 60000)):
        self.port_range = port_range
        self.used_ports: Set[int] = set()
        self.service_ports: Dict[str, int] = {}

    def find_available_port(self, exclude_ports: Set[int] = None) -> int:
        """Find an available port within the specified range."""
        if exclude_ports is None:
            exclude_ports = set()

        all_ports = set(range(self.port_range[0], self.port_range[1] + 1))
        available_ports = all_ports - self.used_ports - exclude_ports

        if not available_ports:
            raise RuntimeError("No available ports in range")

        # Try ports randomly to avoid patterns
        candidate_ports = list(available_ports)
        random.shuffle(candidate_ports)

        for port in candidate_ports:
            if self.is_port_available(port):
                return port

        raise RuntimeError("Could not find available port")

    def is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                return True
        except OSError:
            return False

    def generate_service_ports(self) -> Dict[str, int]:
        """Generate unique ports for all services."""
        services = [
            "FRONTEND",
            "GATEWAY",
            "AUTH_FRONTEND",
            "BOOKING",
            "NOTIFICATION",
            "INFO_ARRIVAL",
            "LOCATION",
            "RATE_LIMITER",
            "REVIEWS",
            "SECURITY",
        ]

        for service in services:
            port = self.find_available_port()
            self.service_ports[service] = port
            self.used_ports.add(port)

        return self.service_ports

    def save_ports(self, filename: str = ".ports.json"):
        """Save port assignments to file."""
        with open(filename, "w") as f:
            json.dump(self.service_ports, f, indent=2)

    def load_ports(self, filename: str = ".ports.json") -> Dict[str, int]:
        """Load port assignments from file."""
        if os.path.exists(filename):
            with open(filename, "r") as f:
                self.service_ports = json.load(f)
                self.used_ports = set(self.service_ports.values())
        return self.service_ports

    def generate_env_file(self, filename: str = ".env.ports"):
        """Generate environment file with port assignments."""
        with open(filename, "w") as f:
            for service, port in self.service_ports.items():
                f.write(f"{service}_PORT={port}\n")

    def print_ports(self):
        """Print port assignments in a formatted way."""
        print("🎲 Random Port Assignments (All Unique)")
        print("=" * 50)
        for service, port in self.service_ports.items():
            service_name = service.replace("_", " ").title()
            print(f"{service_name:<20} http://localhost:{port}")
        print("=" * 50)
        print(f"Total unique ports: {len(self.service_ports)}")


def main():
    manager = PortManager()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "generate":
            ports = manager.generate_service_ports()
            manager.save_ports()
            manager.generate_env_file()
            manager.print_ports()

        elif command == "show":
            ports = manager.load_ports()
            if ports:
                manager.print_ports()
            else:
                print("No port assignments found. Run 'generate' first.")

        elif command == "test":
            ports = manager.load_ports()
            if ports:
                print("Testing port availability...")
                for service, port in ports.items():
                    available = manager.is_port_available(port)
                    status = "✅ Available" if available else "❌ In use"
                    print(f"{service}: {port} - {status}")
            else:
                print("No port assignments found.")

        elif command == "clean":
            files = [".ports.json", ".env.ports"]
            for file in files:
                if os.path.exists(file):
                    os.remove(file)
                    print(f"Removed {file}")
            print("Port assignments cleaned")
    else:
        # Default behavior: generate new ports
        ports = manager.generate_service_ports()
        manager.save_ports()
        manager.generate_env_file()
        manager.print_ports()


if __name__ == "__main__":
    main()
