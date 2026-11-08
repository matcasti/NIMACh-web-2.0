#!/bin/bash
# Doble clic para abrir el editor del sitio NIM-ACh (macOS).
# Si macOS dice que no puede abrirlo: clic derecho sobre este archivo → Abrir → Abrir (solo la primera vez).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Para usar el editor falta instalar Node.js (es gratis).\n\nDescárgalo en https://nodejs.org (versión LTS), instálalo y vuelve a abrir este archivo." buttons {"Entendido"} default button 1 with icon caution' >/dev/null 2>&1
  echo "Falta Node.js: https://nodejs.org"; exit 1
fi
node scripts/admin.mjs
echo; echo "El editor se cerró. Puedes cerrar esta ventana."
