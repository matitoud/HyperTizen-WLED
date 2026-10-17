# Instalación y comandos en Windows

Esta guía explica el procedimiento manual que se usó para probar HyperTizen WLED Direct. La única configuración de TV comprobada está indicada en el [README principal](../README.md). Para funcionar después de la instalación, la TV envía DDP directamente al ESP32: la PC puede estar apagada.

## Antes de empezar

- Instalá [Tizen Studio con el TV SDK](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) y el .NET SDK.
- Activá el modo desarrollador en la TV y conectala a la misma red que la PC durante la instalación.
- Creá un [perfil de certificado Samsung](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) para **tu** TV. No copies certificados ni identificadores de otros usuarios.
- Configurá el ESP32 con WLED y comprobá que acepta DDP en UDP 4048.
- Si ya tenés una versión que funciona, guardá su `.tpk` en una carpeta privada antes de actualizar. No subas ese paquete a GitHub.

Los ejemplos usan PowerShell. Sustituí los valores entre `<...>` por los tuyos. Abrí PowerShell en la raíz de este repositorio y prepará las variables:

```powershell
$tvIp = '<IP_DE_TU_TV>'
$perfil = '<NOMBRE_DE_TU_PERFIL_SAMSUNG>'
$tizen = 'C:\tizen-studio\tools\ide\bin\tizen.bat'
$sdb = 'C:\tizen-studio\tools\sdb.exe'
```

Si Tizen Studio se instaló en otra carpeta, ajustá `$tizen` y `$sdb`.

## Compilar

```powershell
dotnet build -c Release
$paquetes = (Resolve-Path '.\HyperTizen\bin\Release\tizen90').Path
$tpk = Join-Path $paquetes 'io.gh.reisxd.HyperTizen-1.0.0.tpk'
```

Una compilación correcta termina con `0 errores`. Esto verifica el código, **no** confirma que tu modelo de TV pueda capturar la imagen.

## Conectar la TV y firmar

```powershell
& $sdb connect "${tvIp}:26101"
& $sdb devices
& $tizen package -t tpk -s $perfil -- $tpk
```

Confirmá que `sdb devices` muestre tu TV. La firma debe hacerse con tu propio perfil. Si falla, revisá el certificado, el modo desarrollador y la conexión antes de instalar.

## Instalar y ejecutar

```powershell
& $tizen install -n io.gh.reisxd.HyperTizen-1.0.0.tpk -- $paquetes
& $tizen run -p io.gh.reisxd.HyperTizen
```

No hace falta reiniciar la TV después de instalar. No desinstales primero una versión funcional salvo que hayas preparado un método de restauración y entiendas que podrías perder su configuración.

## Configurar WLED desde la TV

La IP del ESP32 se ingresa con el control remoto **en la TV**:

1. Instalá [TizenBrew](https://github.com/reisxd/TizenBrew) según su guía oficial. Esto es independiente del paquete `.tpk` del servicio HyperTizen.
2. Abrí TizenBrew en la TV y entrá en **Administrador de módulos → Añadir módulo GitHub**.
3. Escribí `matitoud/HyperTizen-WLED` y confirmá. No agregues `gh/` ni la subcarpeta `HyperTizenUI` al nombre. TizenBrew busca el manifiesto `package.json` en la raíz del repositorio.
4. Abrí **HyperTizen WLED Direct**, elegí **WLED DDP** en **Salida** y completá **IP de WLED** con la dirección local del ESP32 (ejemplo: `192.168.1.100`; reemplazala por la tuya). Usá **↑/↓** para navegar, **OK** para editar el campo con el teclado de la app y **Listo** para confirmar. El campo enfocado se marca con un borde amarillo; **Volver** cancela la edición.
5. Configurá el total de píxeles **direccionables**, los cuatro lados, inicio y sentido. Los lados deben sumar el total. Pulsá **Guardar configuración de WLED** y después marcá **Activado**.

La interfaz se conecta con el servicio dentro de la propia TV. Los scripts PowerShell que configuraban por red a versiones anteriores no corresponden a esta versión pública. Este recorrido del módulo publicado todavía necesita una prueba de instalación en TV; la prueba funcional anterior se hizo con una instalación local. Si aparece «Unknown Module», comprobá que el manifiesto raíz ya esté publicado y reiniciá TizenBrew.

Si la pantalla muestra una IP antigua de HyperHDR, actualizá el módulo `HyperTizenUI`. Una dirección guardada no significa que la TV esté conectada a esa PC. La interfaz actual muestra el destino del modo elegido y llama “Configuración disponible” a su propia conexión con el servicio.

Si aparece **«Sin conexión con el servicio»**, la interfaz no puede leer ni guardar ajustes en el `.tpk`; reintenta sin recargar la página. Prueba primero `127.0.0.1:8086` y, para paquetes funcionales anteriores, la IP de **la propia TV** en el mismo puerto. Si la detección automática falla, ingresá la IP de la TV en el panel **«Conexión con el servicio»** y pulsá **Conectar con HyperTizen**. No pongas ahí la IP de WLED. La IP de la TV queda guardada solo en el almacenamiento local de la interfaz. Que los LED sigan encendidos solo confirma que la configuración ya guardada continúa funcionando; no confirma que la interfaz esté conectada.

## Comprobar el funcionamiento

Apagá HyperHDR en la PC y cambiá entre imágenes de distintos colores en la TV. La tira debería responder aunque la PC se apague después de instalar. Para consultar registros mientras la PC está conectada:

```powershell
& $sdb dlog | Select-String 'WLED perf|WLED DDP|Capture loop crashed'
```

Una línea `WLED perf` informa **FPS reales de captura** y **FPS de envío DDP** por separado. El suavizado puede aumentar la cadencia de envío, pero no la de captura.

### Comparar latencia y captura rápida

La captura rápida requiere instalar el `.tpk` compilado desde la versión nueva del servicio. Actualizar solo el módulo de TizenBrew cambia la interfaz, no la captura. Conservá el `.tpk` firmado que ya funciona antes de instalar una versión experimental.

1. Con la misma escena en la TV, dejá **Captura rápida · 4 puntos** desactivada. La interfaz actualiza **Captura real**, **DDP** y **ms/lote** aproximadamente cada segundo. Observá varios valores o esperá diez segundos para una línea `WLED perf` más estable en el registro.
2. Activá **Captura rápida · 4 puntos**, guardá y compará varios valores. El modo rápido repite un color por lado en las dos zonas LED de ese lado; comprobá también si esa pérdida de detalle te resulta aceptable.
3. Probá el suavizado a **60 ms** y luego desactivado. Con suavizado desactivado, los lotes se envían apenas terminan; compará el retardo visible además de los FPS.
4. Si la captura no alcanza 10 FPS, anotá `batchesPerFrame`/lotes por captura y `batchMs`/ms por lote. El límite puede ser la API del televisor. Volvé al modo de ocho puntos si preferís más detalle.

Que DDP indique 30 o más envíos por segundo **no significa** que la TV capture 30 cuadros por segundo. Informá el modelo exacto, versión de Tizen y las mediciones al abrir un issue; quitá las IP y otros datos privados de los registros.

## Restaurar un paquete anterior

Si conservaste un `.tpk` que funcionaba, copialo a una carpeta privada con el nombre esperado y volvé a instalarlo. Por ejemplo:

```powershell
$respaldo = '<CARPETA_PRIVADA_DEL_RESPALDO>'
& $tizen install -n io.gh.reisxd.HyperTizen-1.0.0.tpk -- $respaldo
& $tizen run -p io.gh.reisxd.HyperTizen
```

No publiques el respaldo: puede estar firmado específicamente para tu TV. Si la reinstalación falla, guardá el mensaje exacto antes de desinstalar nada.

## Actualizar el código publicado en GitHub

Este apartado es para quien mantiene **su propio repositorio**. Instalá Git para Windows y asegurate de que `git --version` funcione. Desde la raíz de tu copia local:

```powershell
git status
git diff
git add README.md docs/INSTALACION_WINDOWS.md HyperTizenUI/index.html HyperTizenUI/js/wsClient.js
git diff --cached --check
git diff --cached --name-only
git commit -m "Aclarar el estado de WLED y documentar la instalación"
git push
```

Revisá siempre la lista de archivos preparados antes del commit. **No agregues** `bin/`, `obj/`, `.tpk`, certificados, perfiles, DUID, logs ni respaldos. El repositorio público puede actualizarse sin instalar nada en la TV; la instalación es un paso separado.
