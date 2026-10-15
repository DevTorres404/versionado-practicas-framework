# Directivas de Ahorro de Tokens (MCP) e IA

## Uso de Navegador/UI
- NUNCA tomes capturas de pantalla (screenshots) ni pidas el DOM completo/HTML de la página.
- Extrae únicamente el texto visible o el selector CSS puntual del elemento que se está testeando.
- Para verificar APIs o respuestas JSON, usa peticiones HTTP directas en lugar de abrir el navegador.

## Uso de Memory (Engram)
- Guarda en memoria persistente ÚNICAMENTE:
  1. Causa raíz y solución final de errores de configuración o entorno recurrentes.
  2. Puertos locales y variables clave del proyecto.
- PROHIBIDO guardar código fuente completo, trazas de error (stack traces) o historial de chat en la memoria.

## Manejo de Errores y Pruebas
- Si una prueba falla, ejecuta SOLO ese test unitario individual, nunca la suite completa.
- Si el mismo error persiste tras 2 intentos de solución, DETENTE y explica la hipótesis conceptual antes de editar más archivos.

## Navegación
- NUNCA hagas escaneos recursivos ni leas carpetas completas. Consulta primero `docs_ia/PROJECT_MAP.md` para ubicar el archivo exacto antes de leer código.

## Seguimiento de tareas
- Al iniciar cualquier sesión o tarea, lee PRIMERO `docs_ia/REQUIREMENTS_CHECKLIST.md` para conocer el estado y qué falta por implementar. No explores el código para adivinar el progreso.

## Actualización continua
- Cada vez que completes una tarea, prueba o endpoint con éxito, debes actualizar inmediatamente `docs_ia/REQUIREMENTS_CHECKLIST.md` marcando la casilla correspondiente (`- [x]`) y actualizando la sección de estado.

## Ahorro de tokens
- Lee únicamente los archivos que vas a modificar de forma puntual. Prohibido reescribir archivos enteros si solo cambia una función.
