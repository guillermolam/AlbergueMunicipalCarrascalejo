#!/usr/bin/env python3
"""
Dynamic port assignment for development services
"""
import socket
import json
import os
import sys
from typing import List, Dict


#!/usr/bin/env python3
"""
Asignación inteligente de puertos para servicios del proyecto.

Este script analiza los puertos disponibles y asigna rangos consistentes
para cada servicio basándose en su tipo y dependencias.
"""

import json
import socket
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class PortManager:
    """Gestor de asignación de puertos para servicios."""

    # Rangos base para diferentes tipos de servicios
    BASE_RANGES = {
        'gateway': (8000, 8099),
        'auth': (8100, 8199),
        'booking': (8200, 8299),
        'location': (8300, 8399),
        'reviews': (8400, 8499),
        'notification': (8500, 8599),
        'info-on-arrival': (8600, 8699),
        'rate-limiter': (8700, 8799),
        'frontend': (3000, 3099),
        'database': (5432, 5499),
        'redis': (6379, 6399),
    }

    def __init__(self, config_file: str = "ports.json"):
        self.config_file = Path(config_file)
        self.assigned_ports: Dict[str, int] = {}
        self.load_existing_config()

    def load_existing_config(self) -> None:
        """Carga la configuración existente de puertos."""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    self.assigned_ports = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.assigned_ports = {}

    def save_config(self) -> None:
        """Guarda la configuración de puertos asignados."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.assigned_ports, f, indent=2)
        except IOError as e:
            print(f"Error guardando configuración: {e}", file=sys.stderr)
            sys.exit(1)

    def is_port_available(self, port: int) -> bool:
        """Verifica si un puerto está disponible."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                return s.connect_ex(('localhost', port)) != 0
        except socket.error:
            return False

    def find_available_port(self, start_port: int, end_port: int) -> Optional[int]:
        """Encuentra el primer puerto disponible en un rango."""
        for port in range(start_port, end_port + 1):
            if self.is_port_available(port):
                return port
        return None

    def assign_port(self, service_name: str, force_reassign: bool = False) -> int:
        """Asigna un puerto a un servicio específico."""
        if not force_reassign and service_name in self.assigned_ports:
            existing_port = self.assigned_ports[service_name]
            if self.is_port_available(existing_port):
                print(f"✅ {service_name}: manteniendo puerto {existing_port}")
                return existing_port

        # Determinar el rango base para el servicio
        service_type = service_name.split('-')[0]  # Ej: 'booking-service' -> 'booking'
        if service_type not in self.BASE_RANGES:
            service_type = 'gateway'  # Default

        start_port, end_port = self.BASE_RANGES[service_type]

        # Buscar puerto disponible
        assigned_port = self.find_available_port(start_port, end_port)
        if assigned_port is None:
            # Si no hay puertos en el rango base, buscar en rango extendido
            extended_start = 9000
            extended_end = 9999
            assigned_port = self.find_available_port(extended_start, extended_end)

            if assigned_port is None:
                print(f"❌ No hay puertos disponibles para {service_name}", file=sys.stderr)
                sys.exit(1)

        self.assigned_ports[service_name] = assigned_port
        print(f"🔌 {service_name}: asignado puerto {assigned_port}")
        return assigned_port

    def assign_all_ports(self, services: List[str], force_reassign: bool = False) -> Dict[str, int]:
        """Asigna puertos a todos los servicios especificados."""
        results = {}
        for service in services:
            results[service] = self.assign_port(service, force_reassign)
        return results

    def generate_env_file(self, output_file: str = ".env.ports") -> None:
        """Genera un archivo .env con las variables de puerto."""
        env_content = []
        for service, port in self.assigned_ports.items():
            env_var = f"{service.upper().replace('-', '_')}_PORT={port}"
            env_content.append(env_var)

        try:
            with open(output_file, 'w') as f:
                f.write('\n'.join(env_content))
            print(f"📝 Archivo {output_file} generado")
        except IOError as e:
            print(f"Error escribiendo archivo .env: {e}", file=sys.stderr)

    def print_summary(self) -> None:
        """Imprime un resumen de los puertos asignados."""
        print("\n📊 Resumen de puertos asignados:")
        print("-" * 40)
        for service, port in sorted(self.assigned_ports.items()):
            print(f"  {service:<20} : {port}")


def main():
    """Función principal del script."""
    import argparse

    parser = argparse.ArgumentParser(description="Asignador inteligente de puertos")
    parser.add_argument("--services", nargs="+",
                       default=[
                           "gateway",
                           "auth-service",
                           "booking-service",
                           "location-service",
                           "reviews-service",
                           "notification-service",
                           "info-on-arrival-service",
                           "rate-limiter-service",
                           "frontend"
                       ],
                       help="Servicios a los que asignar puertos")
    parser.add_argument("--force", action="store_true",
                       help="Forzar reasignación de puertos existentes")
    parser.add_argument("--config", default="ports.json",
                       help="Archivo de configuración de puertos")
    parser.add_argument("--env-file", default=".env.ports",
                       help="Archivo .env de salida")
    parser.add_argument("--dry-run", action="store_true",
                       help="Mostrar asignaciones sin guardar")

    args = parser.parse_args()

    manager = PortManager(args.config)

    print("🔍 Analizando puertos disponibles...")
    assignments = manager.assign_all_ports(args.services, args.force)

    if not args.dry_run:
        manager.save_config()
        manager.generate_env_file(args.env_file)

    manager.print_summary()


if __name__ == "__main__":
    main()