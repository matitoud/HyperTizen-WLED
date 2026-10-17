# Propuesta de primera publicación

**Nombre del repositorio:** `HyperTizen-WLED`

**Descripción de GitHub:** Ambilight directo desde televisores Samsung Tizen a WLED por UDP/DDP, basado en HyperTizen.

**Título de la primera release:** HyperTizen WLED Direct — versión preliminar del código fuente.
**Etiqueta sugerida:** `v1.0.0-wled.1`. El paquete Tizen conserva por ahora la versión interna `1.0.0`; revisarla antes de distribuir binarios.

Temas sugeridos para GitHub: `tizen`, `samsung-tv`, `wled`, `esp32`, `ambilight`, `ddp`, `hyperhdr`, `ambient-lighting`, `open-source`.

1. Revisar [la auditoría](PUBLICATION_AUDIT.md), [la lista exacta de archivos](PUBLICATION_FILES.md), los metadatos del primer commit y cualquier archivo adjunto.
2. Compilar desde una copia limpia con `dotnet build -c Release`. Probar en una TV el modo WLED, la interfaz limitada a `localhost` y el modo HyperHDR. Conservar antes el paquete DDP funcional.
3. Probar TizenBrew Installer Desktop con **este servicio** y una TV distinta antes de anunciar ese método como comprobado. Verificar refirma, instalación, arranque, persistencia y restauración.
4. Para una release de solo código, publicar el código y las instrucciones. Si más adelante se ofrece un `.tpk` genérico, generarlo desde el código público e inspeccionar su archivo, manifiesto y firmas. Nunca subir el paquete firmado para una TV particular.
5. Elegir entre un repositorio nuevo con historial limpio y un fork que incluya los metadatos públicos heredados. Esta carpeta está preparada con historial limpio y atribución explícita.
6. Pedir aprobación expresa antes del primer push o de crear una release.
