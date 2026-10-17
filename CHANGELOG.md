# Registro de cambios

## Interfaz 1.0.4

- Campo de recuperación para indicar la IP de la TV cuando la detección automática falla.
- La IP de la TV se conserva en el almacenamiento local de TizenBrew; no se publica en el repositorio.
- Los errores de suma de píxeles muestran los dos valores para facilitar la corrección.

## Interfaz 1.0.3

- Navegación con control remoto, foco visible y teclado numérico en pantalla.
- Reconexión al servicio sin recargar la página ni perder la posición.
- Búsqueda automática del servicio en `127.0.0.1` y, para paquetes anteriores, en la IP de la propia TV.
- El botón de guardar informa cuando no hay conexión; no muestra un éxito falso.

## Versión pública propuesta — todavía sin publicar

- Salida directa UDP/DDP a WLED con las ocho muestras de captura existentes.
- Configuración de cantidad de píxeles, distribución por lado, píxel inicial y dirección.
- Suavizado opcional con objetivo de unos 30 envíos DDP por segundo y transición configurable.
- Métricas separadas de captura, lotes, procesamiento y envío UDP.
- Modo HyperHDR original conservado.
- Interfaz de configuración local al televisor en esta copia pública.
- Estado de la interfaz corregido: muestra el destino del modo elegido y distingue un servidor HyperHDR guardado de una conexión activa.

La versión final y los archivos de la primera release siguen pendientes. No se publicará un `.tpk` firmado para una TV particular.
