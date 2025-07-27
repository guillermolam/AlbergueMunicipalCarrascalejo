#!/bin/bash

# Script para crear issues localmente para problemas de calidad
# No rompe el build, solo genera reportes

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
REPORTS_DIR="reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🔍 Generando reporte de calidad sin romper build...${NC}"

# Crear directorio de reportes
mkdir -p "$REPORTS_DIR"

# Verificar formato sin cambios
echo -e "${YELLOW}📐 Verificando formato...${NC}"
trunk fmt --all --check > "$REPORTS_DIR/format-report-$TIMESTAMP.txt" 2>&1 || {
    echo -e "${YELLOW}⚠️  Problemas de formato detectados - no se rompe el build${NC}"
    echo "Reporte guardado en: $REPORTS_DIR/format-report-$TIMESTAMP.txt"
}

# Verificar linting sin cambios
echo -e "${YELLOW}🔍 Verificando linting...${NC}"
trunk check --all --output=json > "$REPORTS_DIR/lint-report-$TIMESTAMP.json" 2>&1 || {
    echo -e "${YELLOW}⚠️  Problemas de linting detectados - no se rompe el build${NC}"
    echo "Reporte guardado en: $REPORTS_DIR/lint-report-$TIMESTAMP.json"
}

# Generar resumen
echo -e "${BLUE}📊 Generando resumen...${NC}"
cat > "$REPORTS_DIR/quality-summary-$TIMESTAMP.md" << EOF
# Quality Report - $(date)

## Summary
This report was generated without breaking the build.

## Issues Found
EOF

if [ -s "$REPORTS_DIR/format-report-$TIMESTAMP.txt" ]; then
    echo "### Formatting Issues" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
    echo "Run: \`task fmt\` to fix formatting issues" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
    echo "" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
fi

if [ -s "$REPORTS_DIR/lint-report-$TIMESTAMP.json" ]; then
    echo "### Linting Issues" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
    echo "Run: \`task lint\` to fix linting issues" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
    echo "" >> "$REPORTS_DIR/quality-summary-$TIMESTAMP.md"
fi

echo -e "${GREEN}✅ Reporte de calidad generado sin romper el build${NC}"
echo -e "${GREEN}📁 Reportes disponibles en: $REPORTS_DIR/${NC}"
echo ""
echo "Archivos generados:"
ls -la "$REPORTS_DIR"/*"$TIMESTAMP"* 2>/dev/null || echo "No hay problemas detectados"