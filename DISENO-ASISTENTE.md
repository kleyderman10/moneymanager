# Asistente de voz: conversación, memoria y ¿agente propio?

Fecha: 2026-10-05.

## Qué se hizo

| Tema | Cambio |
| --- | --- |
| Dejar de escuchar | `useSpeechRecognition` corta solo: 2,5 s sin palabras nuevas tras haber hablado, 8 s si no se oye nada y 30 s como tope. Antes iOS y Android nunca cortaban por silencio. |
| Datos que faltan | Al dictar un movimiento, si falta la categoría o la cuenta, el asistente pregunta con opciones tocables y también acepta la respuesta hablada ("de bancolombia", "la primera", "sin cuenta", "crear"). Con una sola cuenta la usa sin preguntar. |
| Conversación | La pantalla muestra el hilo completo. Tras guardar, "¿Algo más?" sigue la charla. Hay una intención `chat` para saludos y comentarios. El historial viaja con cada mensaje. |
| Memoria | Aprende de lo que el usuario confirma (ya con sus ediciones): qué categoría y qué cuenta usa para cada palabra ("taxi" → Transporte). Se aplica antes de preguntar y se le muestra al modelo como contexto. Se ve y se borra desde Perfil. |
| Cuota de IA | Responder una pregunta del asistente se resuelve sin modelo y devuelve la unidad de cuota. |

## ¿Hace falta desarrollar un agente o modelo propio?

No, por ahora.

- **Lo que el modelo externo hace bien:** entender frases libres, montos ("20k", "1,5 palos"), fechas relativas y varios movimientos en un mensaje. El proveedor ya es intercambiable (OpenAI, Gemini, OpenRouter u Ollama) en `aiService.LLM`.
- **Lo que no necesita un modelo:** aprender hábitos. Son conteos por palabra clave con umbrales (mínimo 2 repeticiones y 60 % de predominio; cuenta por defecto con 5 usos y 70 %). Es explicable, barato, instantáneo y el usuario puede borrarlo.
- **Entrenar o afinar un modelo propio** exigiría datos de muchos usuarios, infraestructura, evaluación continua y tratar datos financieros personales como material de entrenamiento. Hoy no compensa y choca con la privacidad prometida.

### Cuándo reconsiderarlo

| Señal | Qué hacer |
| --- | --- |
| Costo de IA por usuario alto | Cambiar a un modelo más pequeño o a Ollama propio solo para la clasificación; el diseño actual lo permite sin tocar el resto. |
| Muchos movimientos mal clasificados aun con memoria | Medir el porcentaje de ediciones en la vista previa. Si pasa de ~25 %, añadir un clasificador ligero (por ejemplo, embeddings de la descripción comparados con las categorías del usuario). |
| Se quiere memoria de hechos ("mi sueldo llega el 30", "mi pareja se llama...") | Añadir notas explícitas que el usuario pueda ver y borrar. Las notas libres extraídas por el modelo sin control del usuario no se recomiendan. |
| Respuestas más largas o planificación ("¿cómo ahorro para un carro?") | Ahí sí conviene un agente con herramientas de lectura sobre `READ_INTENTS`, con el mismo modelo externo. |

## Límites actuales

- La conversación con preguntas de cuenta y categoría funciona en la app. WhatsApp mantiene su flujo anterior (el modelo propone y el usuario confirma o corrige), con la memoria aplicada.
- Deshacer una acción no "desaprende" lo que se aprendió de ella.
- Las palabras clave se calculan sobre la descripción del movimiento; si el usuario no dicta descripción, no hay nada que aprender salvo la cuenta por defecto.
- Sin probar con voz real ni en dispositivos: la lógica está cubierta por tests del API, pero el corte por silencio y el flujo de preguntas hay que validarlos hablando.
