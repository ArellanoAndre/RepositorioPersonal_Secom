# SECOM Cotizador (Interfaz Web)

Proyecto web (HTML/CSS/JS) para gestionar cotizaciones: lista, creación por pasos (Recibo / Datos / Cotización / Exportar) y exportación a PDF.

## Requisitos
- **Python 3.x** (recomendado 3.10+)
- Navegador (Chrome/Edge)

## Ejecutar en Windows (PowerShell)
1) Abre PowerShell en la carpeta del proyecto.
2) Levanta un servidor local:

```powershell
cd secom-ui
python -m http.server 5500
```

3) Abre el navegador en:

`http://localhost:5500`

## Notas
- Se usan librerías por CDN (Chart.js, html2canvas y jsPDF). Si necesitas ejecutar sin internet, puedes descargarlas y referenciarlas localmente en `index.html`.
