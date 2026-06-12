# ForgeList 40K - generar instaladores

Este proyecto esta preparado para generar:

- Windows: instalador `.exe`.
- Android: paquete `.apk`.

Nota: `.apk` es para celulares/tablets Android. Para computadoras Windows se usa `.exe`.

## Opcion mas sencilla: GitHub Actions

1. Sube este proyecto a un repositorio de GitHub.
2. Entra a la pestana `Actions`.
3. Elige `Build installers`.
4. Presiona `Run workflow`.
5. Cuando termine, descarga los artefactos:
   - `ForgeList-40K-Windows`
   - `ForgeList-40K-Android-APK`

Esto evita instalar Electron, Android Studio o Gradle en tu computadora.

## Requisitos

Instala en la computadora que va a compilar:

- Node.js LTS con npm.
- Para Windows `.exe`: no necesitas Android Studio.
- Para Android `.apk`: Android Studio con Android SDK y Java/JDK configurado.

## Instalar dependencias

```powershell
npm install
```

## Probar escritorio

```powershell
npm run desktop
```

## Generar `.exe` para Windows

```powershell
npm run build:exe
```

El instalador queda en:

```text
release/
```

## Preparar Android por primera vez

```powershell
npm run android:init
```

Esto crea la carpeta `android/`.

## Sincronizar cambios de la app a Android

```powershell
npm run android:sync
```

## Generar `.apk`

```powershell
npm run build:apk
```

El APK debug queda normalmente en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para distribuir publicamente conviene crear un APK/AAB firmado desde Android Studio.

## Que incluye el paquete

El script `npm run prepare:web` copia a `dist/web`:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- `pwa.js`
- `assets/`
- `data/`

Asi el instalador no depende de un servidor externo para cargar facciones, datasheets o reglas.
