# Knexura Flow: informe de pruebas de carga y fluidez

Fecha: 2026-10-13. Alcance: API (`moneymanagerapi`) y frontend web/PWA (`moneymanager`).
Complementa [PLAN-CORRECCIONES.md](PLAN-CORRECCIONES.md); los IDs nuevos usan el prefijo **R**.

## 1. Resumen

- La API responde bien con carga normal. En un solo proceso sirve unas 700 peticiones/s en endpoints simples, con p99 < 25 ms a 10 conexiones y 0 errores.
- Tres puntos rompen la fluidez de **todos** los usuarios, no solo del que hace la petición:
  1. Búsqueda `GET /registers?q=` (descifra todo en memoria): bloquea el event loop hasta 5,4 s.
  2. `GET /registers` sin `page`: devuelve el historial completo (12,5 MB con 20 000 movimientos) y bloquea 7,3 s.
  3. Picos de memoria de 1,7–1,9 GB por esas respuestas. Con un dyno de 512 MB eso provoca reinicios (R14/R15).
- La API **no comprime** respuestas ni archivos estáticos (confirmado en producción). Además, los assets con hash se sirven con `Cache-Control: max-age=0`.
- Primera carga web en móvil (Lighthouse, login): puntaje **52**, primer render en **13,1 s**, descarga de **2,5 MB**. Solo con gzip: puntaje 61, 5,8 s y 1,1 MB.
- Vuetify se incluye completo (`import * as components`), aunque el plugin ya hace autoimport. Lighthouse marca 421 KB de JS y 842 KB de CSS sin uso en la carga inicial.
- Faltan índices por `user` en `Category`, `Wallet`, `Goal` y `RecurringTransaction`: cada listado recorre la colección completa (COLLSCAN).

## 2. Método

| Elemento | Detalle |
| --- | --- |
| Máquina | AMD Ryzen 5 8640HS (12 hilos), 20 GB RAM, Windows 11, Node 24.16 |
| Base de datos | `mongodb-memory-server` 8.2.6 (WiredTiger), en la misma máquina |
| Datos | 100 usuarios × 1 500 movimientos (18 meses), 12 categorías, 4 cuentas (2 tarjetas), 6 recurrentes y 5 presupuestos cada uno. Un usuario "pesado" con 20 000 movimientos. Total ≈ 170 000 movimientos. |
| App | `src/app.js` real, cifrado de campos activo (`DATA_ENCRYPTION_KEY`), tokens con sesión (`sid`) para medir el costo real de `protect` |
| Rate limit | Desactivado (`NODE_ENV=test`) para medir capacidad; probado aparte con límites activos |
| Herramientas | autocannon 7.15 (8–10 s por escenario), `monitorEventLoopDelay`, `explain('executionStats')`, perfil CPU de V8, Lighthouse 12.2 (móvil, red simulada 4G) |
| Producción | Solo peticiones de lectura `GET`/`HEAD` para revisar cabeceras y latencia |

Límites: la base corre en la misma máquina (sin latencia de red a Atlas), así que en producción los tiempos absolutos serán mayores. Las proporciones entre endpoints sí se mantienen. No se probaron los endpoints de IA reales (Gemini/OpenAI), WhatsApp ni pagos.

## 3. Resultados de la API

### 3.1 Por endpoint (usuarios de 1 500 movimientos)

| Endpoint | Conex. | Req/s | p50 ms | p99 ms | KB/resp | Lag event loop p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `GET /api` (sin auth, referencia) | 10 | 7 860 | 1 | 2 | 1,1 | 12 |
| `GET /auth/me` | 10 | 785 | 12 | 19 | 1,6 | 14 |
| `GET /auth/me` | 50 | 786 | 62 | 79 | 1,6 | 22 |
| `GET /categories` | 10 | 708 | 13 | 20 | 3,8 | 15 |
| `GET /summary` (mes) | 10 | 636 | 15 | 23 | 2,6 | 14 |
| `GET /credits` | 10 | 702 | 13 | 18 | 1,1 | 13 |
| `GET /reports/yearly` | 10 | 733 | 13 | 18 | 2,0 | 14 |
| `GET /simulations/capacity` | 10 | 778 | 12 | 17 | 2,3 | 13 |
| `GET /ai/insights` | 10 | 639 | 14 | 58 | 2,3 | 15 |
| `GET /budgets` | 10 | 581 | 16 | 21 | 2,4 | 14 |
| `GET /wallets` | 10 | 445 | 18 | 25 (máx. 1 172) | 4,5 | 15 |
| `GET /recurring/upcoming` | 10 | 450 | 21 | 28 | 3,0 | 16 |
| `GET /reports/monthly` | 10 | 436 | 22 | 29 | 5,2 | 16 |
| `GET /registers?page=1&limit=25` | 10 | 202 | 48 | 69 | 16,8 | 25 |
| `GET /registers?page=1&limit=25` | 50 | 210 | 227 | 337 | 16,8 | 78 |
| `GET /registers?page=1&q=cena` | 10 | **14** | **685** | **857** | 16,7 | **373** |
| `GET /registers?page=1&q=cena` | 50 | **13** | **3 462** | **4 258** | 16,7 | **2 000** |
| `GET /registers` (sin `page`) | 10 | **9** | **1 110** | **1 665** | **940** | **650** |
| `GET /registers` (sin `page`) | 50 | **7** | **5 083** | **6 449** | **940** | **2 063** |
| `POST /registers` | 10 | 254 | 36 | 70 | 1,5 | 17 |
| `POST /registers` | 50 | 310 | 160 | 188 | 1,5 | 35 |

Ningún escenario dio errores ni timeouts. Con 50 conexiones las peticiones/s no suben: el proceso ya está saturado de CPU y solo crece la cola (p50 ≈ 5× más alto).

### 3.2 Usuario con 20 000 movimientos

| Endpoint | Conex. | Req/s | p50 ms | p99 ms | Lag máx. ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| `GET /summary` (mes) | 10 | 377 | 24 | 64 | 34 |
| `GET /simulations/capacity` | 10 | 402 | 23 | 56 | 78 |
| `GET /wallets` | 10 | 322 | 26 | 57 (máx. 1 141) | 856 |
| `GET /reports/yearly` | 10 | 210 | 46 | 75 | 26 |
| `GET /registers?page=1&limit=25` | 10 | 114 | 85 | 122 | 26 |
| `GET /registers?page=1&q=cena` | 10 | **0,1** (1 en 10 s) | **9 894** | — | **5 402** |
| `GET /registers` (sin `page`), 12,5 MB | 4 | **0,1** | **10 090** | — | **7 286** |

**Efecto colateral:** se midió `GET /categories` de otros usuarios mientras corría una búsqueda `q` del usuario pesado. El resultado bajó de 708 a **13 req/s**, con p99 de **6,8 s**. Una sola búsqueda congela la API para todos.

### 3.3 Apertura del dashboard (mezcla real)

El dashboard dispara unas 10 peticiones: `summary`, `recurring/upcoming`, `credits`, `wallets`, `simulations/capacity`, `ai/insights`, `ai/health-score`, `auth/me`, más `subscriptions/status` y los insights del asistente desde `MainLayout`.

| Conexiones | Req/s | p50 ms | p90 ms | p99 ms | Lag p99 ms |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 25 | 355 | 65 | 92 | 191 | 34 |
| 100 | 382 | 255 | 327 | 406 | 92 |
| 200 | 374 | 517 | 684 | 801 | 138 |

- Capacidad aproximada: **35–38 aperturas de dashboard por segundo por proceso**.
- El 12 % de las peticiones de la mezcla son `403` de `GET /ai/health-score`. El frontend lo pide en cada visita aunque el usuario no aceptó el consentimiento de IA.
- La misma prueba, justo después de las respuestas grandes, dio **112 req/s y p99 de 711 ms**. El heap tenía 1,3 GB de basura pendiente y la recolección de memoria frenaba todo. Tras forzar GC el heap volvió a 52 MB: **no es una fuga**, son picos.

### 3.4 Memoria

| Momento | RSS |
| --- | ---: |
| Arranque | 126 MB |
| Tras endpoints normales | 300–420 MB |
| Tras búsqueda `q` / listado completo | **1 700–1 910 MB** |
| Tras GC forzado | 197 MB (heap 52 MB) |

Si producción usa un dyno de 512 MB (Basic/Standard-1X), un usuario con historial grande que abre la búsqueda puede provocar `R14 Memory quota exceeded` o reinicio (`R15`).

### 3.5 Consultas (`explain`)

| Consulta | Plan | Documentos examinados / devueltos |
| --- | --- | --- |
| `Category.find({user})` | **COLLSCAN** | 1 212 / 12 |
| `Wallet.find({user})` | **COLLSCAN** | 404 / 4 |
| `RecurringTransaction.find({user, startDate})` | **COLLSCAN** | 606 / 6 |
| `Goal.find({user})` | **COLLSCAN** | toda la colección |
| `Register` página (`user`, `date`, `_id`) | IXSCAN | 25 / 25 |
| `Register` resumen del mes | IXSCAN | 30 / 30 |
| `Register.countDocuments({user})` | IXSCAN | 1 500 / 1 500 (cuenta todo en cada página) |
| `Budget`, `AIInsight`, `Session` | IXSCAN | correcto |

Con 101 usuarios no se nota. Con 10 000 usuarios, cada listado de categorías leería unos 120 000 documentos para devolver 12.

### 3.6 Perfil de CPU

Sin contar tiempo ocioso, **Mongoose consume ~44 % de la CPU activa** (hidratación de documentos, getters, `populate`). El driver y BSON suman ~15 %, y el cifrado/descifrado AES ~5 %. Ningún endpoint de lectura usa `.lean()`.

Costo fijo de autenticación: cada petición protegida verifica el JWT dos veces (rate limiter y `protect`) y hace 2 consultas (`User.findById` y `Session.exists`). Por eso pasar de `/api` a `/auth/me` divide la capacidad por 10.

### 3.7 Rate limiting

| Escenario | Resultado |
| --- | --- |
| 1 usuario, 20 conexiones, 5 s | 400 aceptadas y luego `429` (límite de 400/min por usuario). El `429` es barato: 2 500 req/s. |
| Anónimo, misma IP | 100 aceptadas y luego `429` (100/min por IP) |

Funciona como está diseñado. El store es en memoria: con varios procesos o dynos, cada uno cuenta por separado y el límite real se multiplica.

## 4. Resultados del frontend

### 4.1 Lighthouse móvil, página `/login`

Build actual, servido igual que en producción (`express.static`):

| Métrica | Sin compresión (producción hoy) | Con gzip |
| --- | ---: | ---: |
| Puntaje de rendimiento | **52** | 61 |
| First Contentful Paint | **13,1 s** | 5,8 s |
| Largest Contentful Paint | **14,4 s** | 7,1 s |
| Time to Interactive | 14,4 s | 7,2 s |
| Total Blocking Time | 220 ms | 110 ms |
| CLS | 0,003 | 0,003 |
| Bytes descargados | **2 495 KB** | 1 104 KB |

Recursos sin uso en la carga inicial, según Lighthouse:

| Archivo | Tamaño | Sin uso |
| --- | ---: | ---: |
| `vuetify-*.js` | 618 KB | 421 KB |
| `vuetify-*.css` | 508 KB | 495 KB |
| `index-*.css` (incluye las ~7 000 clases de MDI) | 358 KB | 347 KB |
| `index-*.js` | 277 KB | 82 KB |

### 4.2 Producción (verificado con `curl`)

- `/login` y `/assets/vuetify-*.js` (632 KB) se sirven **sin `Content-Encoding`**, con `Cache-Control: public, max-age=0`. Los assets tienen hash en el nombre y podrían ser `immutable` por un año.
- Latencia de red a `/api`: 250–330 ms por petición desde aquí. Cada pantalla con 10 peticiones depende de esa latencia.

### 4.3 Build

- Chunks iniciales: `vuetify` 632 KB (201 KB gzip), `index` 284 KB, `MainLayout` 194 KB (73 KB gzip), `charts` 184 KB.
- `MainLayout` importa de forma estática `AIChatPanel` (con `markdown-it` y `dompurify`), `AssistantSheet` (816 líneas), `QuickNav` y el botón de voz. Todo eso baja antes de mostrar la primera pantalla.
- `driver.js/dist/driver.css` y `tour.css` se cargan globalmente aunque el tour se use pocas veces.
- Precache del service worker: **111 archivos, 4,6 MB**. Incluye PNG de 317 KB (`pwa-512x512.png`, `knexura-flow-icon.png`) que la app no muestra.
- En la app nativa (Capacitor) los assets van dentro del paquete. Ahí no pesa la red, pero sí el tiempo de parseo de JS y CSS.

### 4.4 Fluidez en pantalla

- `TransactionsView` ya pagina en servidor (25 filas). No hay riesgo de listas enormes en el DOM.
- `backdrop-filter: blur()` en `finance.css:340` y `flow.css:392`, y `filter: blur` en `VoiceOrb.vue`. Son costosos en Android de gama baja si cubren áreas grandes o se animan. Hay que verificarlo en un dispositivo real (pendiente 4.2 del plan anterior).
- Cada visita al dashboard dispara de nuevo 10 peticiones. Solo las categorías tienen caché.

## 5. Puntos de mejora

| # | Hallazgo | Evidencia | Impacto | Severidad |
| --- | --- | --- | --- | --- |
| R1 | La búsqueda `q` carga y descifra todos los movimientos del usuario en memoria, con `populate`. | `registerService.getPage` → `getAll`; §3.1, §3.2 | Congela la API para todos (lag 5,4 s) y sube la memoria a 1,9 GB | Crítica |
| R2 | `GET /registers` sin `page` devuelve el historial completo. El frontend ya no lo usa, pero sigue abierto a cualquier cliente. | `registerController.getRegisters`; §3.2 | 12,5 MB y 10 s por petición; bloqueo de 7,3 s | Crítica |
| R3 | Sin compresión HTTP en la API ni en los archivos estáticos. | `app.js`; `curl` a producción | 2,5 MB en lugar de 1,1 MB en la primera carga; JSON 5–20 veces más grande | Alta |
| R4 | Assets con hash servidos con `max-age=0`. | `express.static` sin opciones | Revalidación de cada archivo en cada visita web | Media |
| R5 | Vuetify completo: `import * as components` y `directives` en `main.js` anulan el autoimport del plugin. `vuetify/styles` incluye todo el CSS. | `main.js:4-5`, `main.js:8`; §4.1 | 421 KB de JS y 495 KB de CSS sin uso | Alta |
| R6 | Fuente MDI completa: CSS de ~7 000 íconos (≈ 300 KB) y woff2 de 394 KB. | `main.js:9`; §4.1 | 347 KB de CSS sin uso y fuente bloqueante | Media |
| R7 | Faltan índices `{user}` en `Category`, `Wallet`, `Goal` y `RecurringTransaction`. | §3.5 | Coste lineal con el total de usuarios | Alta (a mediano plazo) |
| R8 | Lecturas sin `.lean()`: Mongoose usa ~44 % de la CPU activa. | §3.6 | Capacidad 1,5–2 veces menor de lo posible | Media |
| R9 | La página de movimientos hace 3 consultas (`countDocuments` + `aggregate` + `find` con 2 `populate`) y cuenta todo el historial en cada página. | `getPage`; 202 req/s frente a ~700 en otros | Pantalla de movimientos ~3 veces más lenta que el resto | Media |
| R10 | Autenticación: JWT verificado dos veces y 2 consultas a la base por petición. | `rateLimiter.tokenUserId`, `auth.protect` | Costo fijo en cada una de las ~10 peticiones por pantalla | Media |
| R11 | Un solo proceso Node: usa 1 de 12 núcleos y se satura con unas 380 req/s mezcladas. | §3.3 | Escalar requiere más procesos; el rate limit en memoria no se comparte | Media |
| R12 | `GET /ai/health-score` se llama sin consentimiento de IA y responde 403. | `aiInsights.fetchHealthScore`; 12 % de la mezcla | Petición desperdiciada en cada visita al dashboard | Baja |
| R13 | `GET /wallets` calcula el resumen de cada tarjeta con una agregación por tarjeta (N+1). | `walletService.getAll` → `getCreditSummary` | 445 req/s; crece con el número de tarjetas | Baja |
| R14 | `MainLayout` carga de forma estática el chat de IA, el asistente de voz, `markdown-it` y `dompurify`. | §4.3 | 194 KB extra antes de la primera pantalla | Media |
| R15 | El precache del service worker es de 4,6 MB e incluye PNG grandes que no se muestran. | `vite.config.js` `globPatterns` | Instalación de la PWA pesada en datos móviles | Baja |
| R16 | `POST /registers` hace 4–5 viajes secuenciales a la base y ajusta el saldo sin transacción. | `registerService.create` | 254–310 req/s; un fallo a mitad deja el saldo descuadrado | Baja (rendimiento) / Media (consistencia) |
| R17 | Efectos `blur` en áreas grandes. | `finance.css:340`, `flow.css:392` | Posibles saltos de cuadros en Android de gama baja | Por verificar |

## 6. Plan de mejoras

Prioridad: **A** (hacer ya), **B** (siguiente), **C** (después). Esfuerzo: S ≤ 1 día, M 2–4 días, L > 4 días.

### Fase R1: Estabilidad bajo carga (semana 1)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| R1.1 | Búsqueda `q` sin descifrar todo. Opción recomendada: guardar un índice de búsqueda ciego (tokens normalizados con HMAC, como `belvoLinkId` determinista) en un campo `searchTokens` con índice `{user, searchTokens}`, y buscar por igualdad de token. Mientras tanto: recorrer con cursor `lean()` por lotes, cortar al llenar la página y ceder el event loop (`setImmediate`) entre lotes. También buscar en nombres de categoría y cuenta mediante sus ids, no con `populate`. | R1 | A | M | `q` con 20 000 movimientos < 300 ms; lag del event loop < 50 ms; RSS < 300 MB |
| R1.2 | `GET /registers` sin `page`: aplicar paginación por defecto (`limit` 100) o exigir `page`. Revisar antes que ningún cliente externo dependa del arreglo completo (el asistente y WhatsApp usan el servicio directamente, no la ruta). | R2 | A | S | Ninguna respuesta de `/registers` > 200 KB |
| R1.3 | Añadir `compression` en `app.js` antes de las rutas y del `express.static`. | R3 | A | S | `curl -H 'Accept-Encoding: gzip'` devuelve `Content-Encoding: gzip`; Lighthouse ≥ 60 |
| R1.4 | `express.static(publicPath, { immutable: true, maxAge: '1y' })` para `/assets`, y `no-cache` para `index.html`, `sw.js` y `manifest.webmanifest`. | R4 | A | S | Segunda visita sin peticiones a `/assets` |
| R1.5 | Índices `{user: 1}` (o compuestos según el orden usado) en `Category`, `Wallet`, `Goal` y `RecurringTransaction` (`{user:1, startDate:1}`). | R7 | A | S | `explain` sin COLLSCAN en las 4 colecciones |
| R1.6 | Alertas de memoria: revisar el tamaño del dyno y fijar `--max-old-space-size` acorde (p. ej. 400 MB en un dyno de 512 MB). Activar métricas de Heroku (`R14`). | R1, R2 | A | S | Sin `R14` durante una semana |

### Fase R2: Primera carga del frontend (semanas 1–2)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| R2.1 | Quitar `import * as components` y `directives` de `main.js`. Dejar que `vite-plugin-vuetify` (`autoImport: true`) importe solo lo usado. Usar `styles: { configFile }` o `'sass'` del plugin para el CSS por componente. | R5 | A | S | Chunk `vuetify` < 250 KB; CSS de Vuetify < 150 KB |
| R2.2 | Íconos: cambiar `@mdi/font` por `@mdi/js` con el iconset `mdi-svg` de Vuetify, importando solo los íconos usados. Alternativa: un subset de la fuente. | R6 | B | M | Sin `materialdesignicons.css`; íconos < 50 KB |
| R2.3 | Carga diferida en `MainLayout`: `defineAsyncComponent` para `AIChatPanel`, `AssistantSheet`, `VoiceActionButton` y `QuickNav`. Montarlos al abrirlos por primera vez. Llevar `driver.css` y `tour.css` a `useTour`. | R14 | B | S | `MainLayout` < 80 KB; `markdown-it` fuera de la carga inicial |
| R2.4 | Precache: excluir de `globPatterns` los PNG de íconos (`pwa-*.png`, `knexura-flow-icon.png`) y las vistas de admin. Usar `runtimeCaching` `CacheFirst` para imágenes. | R15 | C | S | Precache < 2 MB |
| R2.5 | Meta: Lighthouse móvil ≥ 85 en `/login` y en el dashboard autenticado, medido en CI con `lighthouse-ci`. | R3, R5, R6 | B | M | Presupuesto de rendimiento en CI |

### Fase R3: Capacidad de la API (semanas 2–3)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| R3.1 | `.lean({ getters: true })` en lecturas que solo se serializan (`categories`, `wallets`, `budgets`, `credits`, `recurring`, `registers` página, `auth/me`). Cuidar que el descifrado siga funcionando: con `lean` los getters del plugin no corren solos. Usar `mongoose-lean-getters` o descifrar explícitamente. | R8 | B | M | +50 % de req/s en esos endpoints; tests de cifrado en verde |
| R3.2 | Página de movimientos: devolver `total` y `totals` en una sola agregación `$facet`. Reemplazar `populate` por un mapa de categorías y cuentas del usuario (12 + 4 documentos, cacheables). Opcional: no recalcular `total`/`totals` al cambiar solo de página. | R9 | B | M | `registers?page=1` ≥ 500 req/s (hoy 202) |
| R3.3 | `protect`: verificar el JWT una sola vez (guardar el resultado en `req` desde el rate limiter). Cachear `User` y el estado de la sesión 30–60 s en memoria, invalidando en logout, cambio de `tokenVersion` o desactivación. | R10 | B | M | `auth/me` ≥ 1 500 req/s; revocar sesión sigue tomando < 1 min |
| R3.4 | Escalar procesos: `cluster`/`throng` con `WEB_CONCURRENCY` según el dyno, o más dynos. Mover el rate limit a Redis (`rate-limit-redis`) para que el límite sea global. | R11 | B | M | Capacidad lineal con los procesos; límite de 400/min respetado en total |
| R3.5 | `GET /wallets`: una sola agregación para todas las tarjetas (`$match wallet $in` + `$group` por cuenta) en lugar de una por tarjeta. | R13 | C | S | 1 agregación por petición |
| R3.6 | `POST /registers`: paralelizar `assertOwned` y `validateWalletTransaction`. Crear el movimiento y ajustar el saldo dentro de una transacción (Atlas soporta replica set). | R16 | C | M | Saldo consistente ante fallos simulados; ≥ 400 req/s |

### Fase R4: Fluidez percibida (semanas 3–4)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| R4.1 | Pedir `health-score` solo si `authStore.user.aiConsentAcceptedAt` existe. | R12 | A | S | 0 respuestas 403 en el dashboard |
| R4.2 | Endpoint agregado `GET /dashboard` (resumen, próximos recurrentes, créditos, cuentas y capacidad) o caché "mostrar y refrescar" de 30–60 s en los stores. Así el dashboard pasa de 10 peticiones a 2–3. | F7, R10 | B | M | Volver al dashboard dentro de 60 s no repite peticiones |
| R4.3 | Revisar `backdrop-filter`/`blur` en un Android de gama baja con el panel de rendimiento de Chrome. Sustituirlo por fondo semitransparente sólido si hay caída de cuadros. | R17 | B | S | ≥ 55 fps al hacer scroll en Movimientos y Dashboard |

### Fase R5: Control continuo

| ID | Acción | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| R5.1 | Llevar el arnés de esta prueba a `moneymanagerapi/test/load/` (servidor con datos sembrados + autocannon) y un script `npm run test:load`. | B | S | Se repite en < 10 min y guarda resultados JSON |
| R5.2 | Umbrales para cada release: p99 < 100 ms a 10 conexiones en endpoints de lectura, lag del event loop p99 < 50 ms y RSS < 400 MB tras la suite. | B | S | La suite falla si se supera un umbral |
| R5.3 | Métricas en producción: tiempo por ruta y lag del event loop (log estructurado o APM). | C | M | Panel con p95 por ruta |

## 7. Orden recomendado

1. **Días 1–2:** R1.2, R1.3, R1.4, R1.5, R4.1 y R2.1. Son cambios pequeños con el mayor efecto: quitan el peor bloqueo y reducen la primera carga a la mitad o menos.
2. **Semana 1:** R1.1 y R1.6.
3. **Semana 2:** R2.3, R3.2, R3.1 y R2.2.
4. **Semana 3:** R3.3, R3.4 y R4.2.
5. **Después:** R2.4, R2.5, R3.5, R3.6, R4.3 y R5.

Después de cada fase, repetir la suite de carga y Lighthouse, y actualizar este documento con los números nuevos.

## 8. Notas

- La suite de esta prueba ya está versionada en `moneymanagerapi/loadtest/` (R5.1).
- El rendimiento absoluto en Heroku + Atlas será menor por la latencia de red a la base. Conviene repetir la prueba contra un entorno de staging con Atlas.
- No se midieron la IA, WhatsApp, pagos ni la app nativa en un dispositivo real. El punto 4.2 del plan anterior sigue pendiente.

## 9. Ejecución del plan (2026-10-13)

### 9.1 Estado

| ID | Estado | Nota |
| --- | --- | --- |
| R1.1 | Hecho (solución intermedia) | La búsqueda `q` recorre un cursor `lean` que solo trae los campos necesarios. Descifra la descripción solo si la categoría o la cuenta no coinciden ya, y cede el event loop cada 500 documentos. El índice ciego queda pendiente: requiere decidir qué se revela (igualdad de palabras) y migrar datos. |
| R1.2 | Hecho | Sin `page` se mantiene la forma de arreglo para versiones antiguas de la app, con tope de los 500 movimientos más recientes. |
| R1.3 | Hecho | `compression` 1.8.2. La exportación CSV usaba el callback de `res.write`, que `compression` no llama: se cambió a contrapresión con `drain`. |
| R1.4 | Hecho | `/assets/*`: `max-age=31536000, immutable`. `index.html`, `sw.js` y el manifest: `no-cache`. |
| R1.5 | Hecho | Índice `{user: 1}` en las 4 colecciones. `explain` ya no muestra COLLSCAN. Se usó índice simple y no compuesto porque varias consultas sin `sort` dependen del orden de inserción (lo detectaron los tests del asistente). |
| R1.6 | Pendiente (requiere tu OK) | Producción usa un dyno **Eco** (512 MB, se duerme tras 30 min sin tráfico). Falta `heroku config:set NODE_OPTIONS=--max-old-space-size=384 -a moneymanager`. Ya se fijó `engines.node` (>=22 <25) en el API. |
| R2.1 | Hecho | Sin `import * as components/directives`. Además, Vuetify ya no se fuerza a un chunk único: cada componente viaja con las vistas que lo usan. Prueba de humo en Chrome: las 14 vistas sin etiquetas `<v-*>` sin resolver. |
| R2.2 | Pendiente (decisión) | Los íconos de categoría se guardan en la base como nombres `mdi-*` libres y la IA también los elige. Para recortar la fuente hace falta una lista cerrada de íconos. |
| R2.3 | Hecho | Chat de IA, asistente, consentimiento y navegación rápida en chunks diferidos. Se montan en el primer uso. CSS del tour movido a `useTour`. |
| R2.4 | Hecho | Precache de 4,6 a 3,4 MB. |
| R2.5 | Hecho | Job `lighthouse` en el CI del frontend (`lighthouserc.json`): falla si el puntaje móvil baja de 50 o el TBT pasa de 600 ms; avisa por JS/CSS sin uso. El CI solo corría con push a `main` y la rama es `master`: corregido. |
| R3.1 | Parcial | `lean` en categorías, presupuestos y el listado de movimientos. Faltan créditos, metas y recurrentes, que tienen campos cifrados. |
| R3.2 | Hecho | Conteo y totales en una sola agregación, página leída en paralelo y mapas de categorías y cuentas en lugar de `populate`. |
| R3.3 | Parcial | JWT verificado una vez por petición (antes 3); usuario y sesión consultados en paralelo. Sin caché de usuario o sesión, para no retrasar la revocación inmediata de sesiones. |
| R3.4 | Pendiente (decisión) | Varios procesos requieren rate limit compartido (Redis) y elegir el plan de Heroku. |
| R3.5 | Hecho | `GET /wallets`: una agregación para todas las tarjetas. |
| R3.6 | Parcial | Validación de categoría y cuenta en paralelo. La transacción queda pendiente: los tests usan MongoDB sin replica set. |
| R4.1 | Hecho | `health-score` se pide solo con consentimiento de IA, y también justo después de aceptarlo. |
| R4.2 | Hecho | `GET /api/dashboard`: el inicio pasa de 5 peticiones a 1 (1 autenticación en lugar de 5). |
| R4.3 | Pendiente | Prueba de `blur` en un dispositivo real. |
| R5.1 | Hecho | `moneymanagerapi/loadtest/` con README. |
| R5.2 | Hecho | `npm run test:load` falla si se supera un umbral. |
| R5.3 | Hecho (básico) | Log `perf slow_request` para peticiones de más de 1 s (solo el patrón de ruta) y `perf event_loop_lag` cada minuto si el p99 pasa de 200 ms. Se consulta con `heroku logs --tail`, filtrando por `perf`. |

Tests: API 206/206 (7 nuevos en `test/security/performance.test.js`), frontend 14/14, lint sin errores (5 avisos previos). `npm audit --omit=dev`: 0 vulnerabilidades (se actualizó `proxy-addr`, que tenía un aviso crítico previo).

### 9.2 Antes y después (API)

Misma máquina y misma sesión, con las versiones vieja y nueva intercaladas (2 rondas, promedio). Clientes con `Accept-Encoding: gzip`. 10 conexiones salvo que se indique otra cosa.

| Escenario | Req/s antes | Req/s después | p99 antes (ms) | p99 después (ms) | KB/resp antes | KB/resp después | Lag p99 antes (ms) | Lag p99 después (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `GET /auth/me` | 505 | 622 | 38 | 23 | 1,6 | 1,6 | 17 | 17 |
| `GET /categories` | 469 | 560 | 38 | 27 | 3,8 | 1,4 | 16 | 16 |
| `GET /summary` | 453 | 499 | 34 | 28 | 2,6 | 1,5 | 15 | 15 |
| `GET /registers?page=1` | 129 | 291 | 115 | 47 | 16,8 | 2,4 | 30 | 19 |
| `GET /registers?q=` | 9 | 45 | 1 238 | 261 | 16,8 | 2,4 | 598 | 57 |
| `GET /registers` sin `page` | 6 | 63* | 1 729 | 217* | 940 | 15 | 904 | 79* |
| `GET /wallets` | 319 | 381 | 43 | 40 | 4,5 | 1,9 | 19 | 18 |
| `GET /budgets` | 391 | 442 | 41 | 33 | 2,4 | 1,4 | 17 | 18 |
| Mezcla dashboard (50 conex.) | 353 | 374 | 353 | 325 | 2,3 | 1,5 | 48 | 43 |
| Búsqueda `q`, usuario de 20 000 (4 conex.) | 1 | 3,5 | 4 648 | 1 062 | 16,8 | 2,5 | 1 436 | 30 |
| Otros usuarios durante esa búsqueda | 17 | 127 | 2 179 | 169 | 3,8 | 1,4 | 2 493 | 47 |
| RSS máximo del proceso | 2 020 MB | 562 MB | | | | | | |

\* Medido después de pasar el listado sin `page` también a `lean` + mapas (en la A/B daba 17,5 req/s y p99 de 712 ms).

La máquina rindió menos durante esta sesión que en la medición de la sección 3 (`/api` sin auth: 5 600 req/s frente a 7 860). Por eso los números absolutos de esta tabla no se comparan con los de la sección 3, sino solo entre sí.

### 9.3 Antes y después (frontend, Lighthouse móvil en `/login`, promedio de 2 corridas)

| Build | Puntaje | FCP | LCP | TBT | Descarga |
| --- | ---: | ---: | ---: | ---: | ---: |
| Anterior, sin compresión (producción hoy) | 51 | 13,1 s | 14,5 s | 245 ms | 2 495 KB |
| Anterior, con gzip | 61 | 5,7 s | 7,1 s | 130 ms | 1 104 KB |
| Nueva, con gzip | **64** | **5,1 s** | **6,6 s** | **1 ms** | **979 KB** |

Lo que más pesa ahora en la primera carga: la fuente MDI (394 KB, R2.2), el JS principal (137 KB gzip) y el banner WebP (97 KB).

### 9.4 Corrección de `cycleStart`

`walletService.getCreditDates` iniciaba el ciclo un día después del corte, así que las compras del día siguiente al corte quedaban fuera de `cyclePurchases`/`cyclePayments` (en `creditCardService` lo facturado es `<= latestCutOff`). Ahora el ciclo empieza justo después del corte, con test.
