# Registro de cambios

## Interfaz 1.0.7 — prueba local

- Crédito «Desarrollado por @matitoud» y enlace al repositorio al pie de la interfaz, accesible con el control remoto.

## Interfaz 1.0.6 y suavizado adaptativo — prueba local

- Casilla experimental de suavizado adaptativo, exclusiva con el suavizado de tiempo fijo en la interfaz y el servicio.
- La transición sigue el intervalo promedio entre capturas completas y queda limitada a 35–120 ms para contener la latencia.
- La medición de la interfaz muestra el tiempo de transición vigente; sigue separando captura real y envíos DDP.
- La captura rápida de cuatro puntos se puede combinar con cualquiera de los dos modos de suavizado.

## Interfaz 1.0.5 y servicio de captura rápida — prueba local

- Modo opcional de cuatro puntos: usa dos lotes donde el modo de ocho puntos usa cuatro si el hardware admite dos puntos por lote. La frecuencia real sigue pendiente de medición en la TV.
- Con suavizado desactivado, envía a WLED cada lote terminado después del primer cuadro completo para reducir la espera de las zonas recién capturadas.
- Muestra en la interfaz FPS reales de captura, envíos DDP y tiempo promedio por lote, medidos en ventanas de un segundo. Los registros detallados conservan ventanas de diez segundos.
- Valor inicial de transición en la interfaz reducido a 60 ms. Las configuraciones ya guardadas conservan su valor.
- El servicio acepta la conexión de configuración desde la propia TV y rechaza equipos externos de la red local.

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
