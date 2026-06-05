# ForgeList 40K - instalacion

ForgeList ahora funciona como PWA instalable y offline.

## Como instalar

1. Sube esta carpeta a cualquier hosting estatico HTTPS, por ejemplo GitHub Pages, Netlify, Vercel static o similar.
2. Abre la URL en el navegador.
3. Espera a que cargue la app una vez.
4. Instala:
   - Chrome / Edge en computadora: boton "Instalar app" o icono de instalar en la barra.
   - Android: boton "Instalar app" o menu del navegador > Instalar app.
   - iPhone / iPad: Compartir > Agregar a pantalla de inicio.

## Uso offline

Despues de la primera carga, la app guarda en cache:

- HTML, CSS y JavaScript.
- Base de facciones.
- Reglas de detachments.
- Estratagemas.
- Datasheets detalladas.

Las listas guardadas y memoria de partidas se quedan en el dispositivo usando `localStorage`.

## Sin servidor de aplicacion

No necesita backend para funcionar. El unico requisito es servir los archivos como sitio estatico la primera vez para que el navegador pueda instalar la PWA y activar el cache offline.

La exportacion YellowScribe online depende de un endpoint externo/backend. En modo instalable sin servidor, la app exporta un archivo `.ros` local para usarlo fuera de la app.
