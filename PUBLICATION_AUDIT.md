# Auditoría previa a la publicación

Fecha: 17 de octubre de 2026. Alcance: esta copia pública, los archivos de trabajo usados para prepararla, los paquetes generados y los nueve commits heredados del fork de lowryn. El repositorio ya tiene commits públicos; se propone reemplazar la rama `main` por un único commit nuevo. No se creó una release.

## Hallazgos y medidas

| Origen | Hallazgo | Medida |
| --- | --- | --- |
| `HyperTizenUI/index.html` original | Una IP local real se usaba como valor inicial. | Se sustituyó por un ejemplo genérico. |
| `tizen_workspace.yaml` original y un comentario de compilación | Rutas locales de Tizen Studio. | Se excluyó el archivo de workspace y se quitó el comentario. |
| `bin/`, `obj/` y carpeta local de pruebas | Salidas generadas y paquetes firmados para una TV; podrían contener rutas, firmas o certificados. | Se excluyeron. El `.tpk` DDP funcional permanece fuera de este candidato para recuperación. |
| Scripts PowerShell locales | Valores de red y procedimiento de prueba particulares. | Se excluyeron; la configuración pública se hace en la TV. |
| Historial Git original | Algunos metadatos públicos de autores contienen direcciones de colaboradores con nombres de equipos locales. | La rama pública se preparó sin el historial heredado. Se mantienen licencia y créditos. Reescribir `main` no elimina copias, cachés, forks o referencias remotas fuera de nuestro control. |
| WebSocket de configuración | La versión funcional escuchaba en toda la red y aceptaba claves de preferencias arbitrarias. | El `.tpk` de esta copia escucha solo en `localhost` del televisor y acepta únicamente claves previstas. Para poder configurar un `.tpk` funcional anterior sin reemplazarlo, la interfaz prueba primero `localhost` y después la IP de la propia TV. Si falla la detección, el usuario puede indicar la IP de su TV; se guarda en el almacenamiento local del módulo y nunca en el repositorio. Ese paquete anterior conserva su exposición a la red local; hace falta probar la variante nueva en la TV antes de una release. |
| Nombres SSDP en la interfaz | Nombres de dispositivos no confiables se insertaban como HTML. | Se muestran como texto mediante el DOM. |

## Archivos preparados

La [lista exacta](PUBLICATION_FILES.md) contiene 54 archivos: código fuente, interfaz, licencia GPL-3.0, documentación y plantillas. No hay `.tpk`, `.wgt`, certificados, perfiles de firma, DUID, tokens, scripts de prueba, logs, cachés, copias de seguridad ni archivos de `bin/` u `obj/`. Los dos iconos PNG son idénticos a los ya publicados en el fork original; no se agregaron fotos ni capturas del usuario.

El `.gitignore` excluye archivos generados y de firma, pero **también se revisó la lista preparada en Git**. Hay commits y un remoto de GitHub. Antes de reescribir `main`, se deben revisar los archivos preparados y conservar una referencia local de recuperación.

## Revisión manual pendiente

1. Probar en la TV la interfaz limitada a `localhost`, la salida WLED y el modo HyperHDR de esta copia. Mantener el paquete funcional disponible para restaurar.
2. Confirmar que la rama remota `main` quedó en un único commit nuevo tras el envío forzado. La atribución mediante licencia y documentación se conserva.
3. Revisar nuevamente `git diff --cached --name-only`, autor del commit y **cada** archivo de una futura release. Inspeccionar por separado cualquier `.tpk` genérico y sus firmas; no publicar uno ligado a la TV original.
4. Probar TizenBrew Installer Desktop con este paquete antes de describir esa instalación como comprobada.
5. Repetir la búsqueda de datos privados después de agregar archivos, commits o binarios.

## Comprobaciones realizadas

- Se inspeccionaron archivos ocultos, código, configuraciones, scripts, directorios generados y nombres de paquetes del proyecto de trabajo.
- Se buscaron IPs locales particulares, rutas de usuario de Windows, marcadores de claves privadas, credenciales e identificadores en el candidato.
- Se revisaron autores de todos los commits heredados y se buscó contenido sensible en el historial original.
- Se verificó la lista de Git: 53 archivos versionados y un nuevo archivo de interfaz; la lista propuesta contiene 54 archivos. Ninguno tiene extensiones o rutas prohibidas. El remoto apunta al repositorio público del proyecto.
- Se inspeccionó el `.tpk` local generado: contiene archivos de firma y permanece excluido. Sus metadatos legibles no coincidieron con los marcadores privados buscados; esto **no** autoriza publicarlo.
- Se comprobó que ambos iconos PNG tienen el mismo contenido que los archivos públicos de lowryn.

Esta auditoría describe el estado actual de la copia pública; no garantiza el contenido de futuros commits, dependencias, instaladores externos o archivos de release.
