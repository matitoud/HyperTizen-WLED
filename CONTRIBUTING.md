# Cómo contribuir

Se aceptan reportes y propuestas de cambios. Describí el modelo de TV, versión de Tizen y firmware, ruta de captura (`libve` o `secvideo`), versión de WLED, cantidad de píxeles y método de prueba. **No publiques** DUID de la TV, direcciones IP reales, certificados, claves, datos de cuenta ni registros completos sin revisar. Eliminá los datos privados antes de adjuntar archivos.

Para cambios en el servicio, ejecutá `dotnet build -c Release`. Para cambios en la interfaz, comprobá la sintaxis de `HyperTizenUI/js/wsClient.js`. Indicá si probaste en una TV real: compilar correctamente no confirma compatibilidad. Conservá el modo HyperHDR, los créditos y la licencia GPL-3.0. No incluyas paquetes firmados ni archivos generados.

Si modificás captura o tiempos, informá por separado FPS de captura y FPS de envío DDP, así como cualquier cambio en latencia o consumo. Las rutas experimentales deben seguir siendo opcionales hasta comprobarse en modelos concretos.
