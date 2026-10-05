# Knexura Flow: pendientes y plan de correcciones

Fecha: 2026-10-05. Alcance: `moneymanager` (Vue 3 + Vuetify + Capacitor) y `moneymanagerapi` (Express + Mongoose). Revisión estática del código y de la documentación existente (FLOW-REDESIGN.md, DESIGN-VALIDATION.md). No se ejecutó la app.

## 1. Pendientes abiertos (heredados)

| # | Pendiente | Fuente |
| --- | --- | --- |
| P1 | QA visual renderizado en 360–430 px, 768/820 px y escritorio nunca se hizo | DESIGN-VALIDATION |
| P2 | Validación en dispositivos iOS/Android y build de binarios nativos | FLOW-REDESIGN |
| P3 | Color del texto de la barra de estado en iOS (falta `@capacitor/status-bar`) | FLOW-REDESIGN |
| P4 | Contraste WCAG, apilamiento de overlays y teclado en navegador sin verificar | DESIGN-VALIDATION |
| P5 | Flujos autenticados end-to-end, permisos de micrófono y reconocimiento de voz sin probar | DESIGN-VALIDATION |
| P6 | `npm audit`: 11 vulnerabilidades (1 crítica, 6 altas, 4 moderadas) sin resolver | FLOW-REDESIGN |
| P7 | No hay scripts de lint ni de tests en el frontend; el backend tiene 9 archivos de test pero sin cobertura de registros, reportes ni resumen | package.json |
| P8 | Aviso de Vite por bundles mayores a 500 kB | build |

## 2. Hallazgos por área

### 2.1 Performance

| # | Hallazgo | Evidencia | Impacto |
| --- | --- | --- | --- |
| F1 | `GET /registers` devuelve todos los movimientos sin paginar. La paginación y la búsqueda se hacen en el cliente. | registerService.getAll (sin `limit`/`skip`); TransactionsView `load()` | Crece sin límite con el uso. Pantalla lenta y mucha memoria en móvil. |
| F2 | Exportar CSV y el listado reutilizan `getAll` con `populate` de categoría y cartera para todos los registros. | registerService.exportCSV | Picos de memoria en el servidor. |
| F3 | El borrado masivo hace una petición por registro, en serie. | TransactionsView `doBulkDelete` | Lento con selecciones grandes; si falla a mitad queda en estado parcial. |
| F4 | Índice de `Register` `{user, wallet, date, amount}` no sirve para el listado principal (`user` + `date` desc, con filtros de tipo/categoría). Falta índice `{user, date:-1}` y `{user, category, date}`. | models/Register.js | Consultas lentas al crecer la colección. |
| F5 | Los reportes de presupuesto lanzan una agregación por presupuesto (`Promise.all` de N agregaciones) y el reporte mensual hace 3 agregaciones secuenciales. | reportService líneas 11–75 | N+1 en agregaciones. |
| F6 | `index.js` principal pesa 942 kB; el CSS 887 kB. La fuente MDI se publica en 4 formatos (eot 1.3 MB, ttf 1.3 MB, woff, woff2). Un PNG de símbolo pesa 693 kB. | dist/assets | Primera carga lenta en datos móviles. |
| F7 | Dashboard dispara 5 peticiones, más `fetchInsights` y `fetchHealthScore` (IA) en cada visita, sin caché ni reutilización entre pantallas. | DashboardView `load`/`onMounted` | Carga repetida y costo de IA innecesario. |
| F8 | `TransactionsView.vue` tiene 1235 líneas y `SimulatorsView.vue` 912. | wc -l | Difícil de mantener y de optimizar. |
| F9 | La respuesta de la API lleva `Cache-Control: no-store` y el service worker usa `NetworkOnly` para `/api`. Nada se cachea ni se muestra offline. | app.js, vite.config.js | Cada navegación espera red; sin estado previo mientras carga. |

### 2.2 Usabilidad e intuitividad

| # | Hallazgo | Evidencia | Impacto |
| --- | --- | --- | --- |
| U1 | Los fallos de carga se tragan en silencio (`catch { /* ... */ }`). El usuario ve una pantalla vacía sin saber si falló la red. | DashboardView `load`, registers `fetchTags` | Confusión y falsa sensación de "no tengo datos". |
| U2 | El tour guiado y la ayuda existen, pero el primer uso no guía hacia la primera cartera, categoría y movimiento. No hay estado vacío con acción. | tours/definitions.js, vistas | El nuevo usuario ve un dashboard en cero. |
| U3 | Menú con 14 destinos (Categorías, Cuentas, Créditos, Recurrentes, Simuladores, etc.). Conceptos relacionados (cuentas/créditos, presupuestos/metas) están separados. | router, AppDrawer | Difícil de descubrir. |
| U4 | Búsqueda en Movimientos solo cubre lo ya cargado. Con paginación de servidor dejaría de funcionar. | TransactionsView `search` | Resultados incompletos. |
| U5 | Solo 48 `aria-label` en todo el frontend y el QA de accesibilidad sigue pendiente. | grep | Riesgo de accesibilidad y de rechazo en tiendas. |
| U6 | Estados de carga: no hay esqueletos uniformes; cada vista maneja `loading` por su cuenta. | stores/*.js | Parpadeos y saltos de layout. |
| U7 | Confirmaciones destructivas diferentes por pantalla (diálogos propios). | vistas | Experiencia inconsistente. |
| U8 | Deshacer no existe tras eliminar o editar un movimiento. | registers.remove | Errores costosos para el usuario. |

### 2.3 Manejo de usuarios y sesión

| # | Hallazgo | Evidencia | Impacto |
| --- | --- | --- | --- |
| S1 | Access y refresh token viven en `localStorage`. Cualquier XSS los expone. | api/client.js, stores/auth.js | Riesgo de robo de sesión. Mitigado en parte por CSP estricta. En web, preferir cookie `httpOnly`; en nativo, almacenamiento seguro. |
| S2 | Al fallar el refresh se redirige con `window.location.href`, perdiendo el estado y sin avisar el motivo ("sesión expirada"). | api/client.js | Pérdida de datos no guardados y confusión. |
| S3 | La administración solo permite activar/desactivar, cambiar rol y editar suscripción. No hay cierre de sesiones remoto, reinicio de MFA, ni ver dispositivos/sesiones del usuario. | adminRoutes.js | Soporte limitado. |
| S4 | Los cambios de rol y estado tienen auditoría (`AdminAuditLog`), pero no hay pantalla para consultarla. | models/AdminAuditLog.js, AdminView | Sin trazabilidad visible. |
| S5 | Solo hay roles `user` y `admin`. No hay soporte (solo lectura) ni límites por rol. | User.js | Todo o nada para el personal. |
| S6 | Lista de sesiones y dispositivos del propio usuario: existen modelos (`Session`, `Device`), pero ProfileView debe verificarse para "cerrar sesión en otros dispositivos". | models, ProfileView | Control de cuenta incompleto. |
| S7 | Sin cartera ni datos compartidos (pareja/familia). | modelo de datos | Limitación funcional, no un error. |
| S8 | `.env` está dentro del repositorio del API. Confirmar que `.gitignore` lo excluye y que no hay secretos en el historial. | moneymanagerapi/.env | Riesgo de fuga. |

## 3. Plan de correcciones

Prioridad: **A** (hacer ya), **B** (siguiente), **C** (después). Esfuerzo: S ≤ 1 día, M 2–4 días, L > 4 días.

### Fase 0 — Línea base y seguridad (semana 1)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 0.1 | Ejecutar `npm audit` en ambos proyectos; actualizar lo que no rompa (`npm audit fix`) y listar lo que requiere migración. | P6 | A | S | 0 críticas, 0 altas o excepción documentada. |
| 0.2 | Verificar `.gitignore` y el historial de `moneymanagerapi/.env`; rotar claves si estuvieron versionadas. | S8 | A | S | `git log -- .env` vacío o claves rotadas. |
| 0.3 | Medir línea base: Lighthouse móvil, tamaño de carga inicial, tiempo de `GET /registers` con 5 000 registros. | F1, F6 | A | S | Números registrados en este documento. |
| 0.4 | Añadir ESLint + Vitest en el frontend y un job de CI que ejecute build, lint y tests de ambos proyectos. | P7 | B | M | CI en verde en cada commit. |

### Fase 1 — Performance (semanas 1–3)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Paginación en servidor para `GET /registers` (`page`, `limit` ≤ 100, total en cabecera o en envoltorio) y búsqueda `q` en servidor. Cliente con scroll infinito o paginador. Mantener respuesta compatible hasta migrar el cliente (WhatsApp y asistente también usan registros). | F1, U4 | A | M | Listado responde < 300 ms con 50 000 registros; pantalla carga 25–50 filas. |
| 1.2 | Crear índices `{user:1, date:-1}`, `{user:1, category:1, date:-1}` y `{user:1, type:1, date:-1}`; revisar con `explain()`. | F4 | A | S | `explain` muestra `IXSCAN`, sin `COLLSCAN`. |
| 1.3 | Endpoint `DELETE /registers/bulk` con lista de ids, una sola operación y ajuste de saldos agrupado por cartera. | F3 | A | M | Un solo request; resultado atómico o con reporte de fallos. |
| 1.4 | Exportar CSV por streaming con cursor `lean()`, sin `populate` masivo. | F2 | B | S | Memoria estable con 100 000 registros. |
| 1.5 | Reportes: una sola agregación con `$facet` o `$group` por (tipo, categoría) y calcular presupuestos desde ese resultado. | F5 | B | M | De 3 + N consultas a 1–2 por reporte. |
| 1.6 | Reducir carga inicial: partir `manualChunks` (vuetify, chart.js, vue-i18n); importar solo íconos MDI usados o subset; quitar `.eot`/`.ttf` del build (dejar `woff2`); convertir el PNG de 693 kB a WebP. | F6, P8 | A | M | JS inicial < 350 kB gzip < 120 kB; fuente MDI < 400 kB. |
| 1.7 | Caché de datos de lectura en stores (carteras, categorías, créditos) con política "mostrar caché, refrescar en segundo plano" y TTL corto; `insights` y `health score` solo bajo demanda o 1 vez por día. | F7, F9 | B | M | Navegar entre pantallas no repite peticiones dentro del TTL. |
| 1.8 | Dividir `TransactionsView.vue` (lista, filtros, formulario, importación) en componentes. | F8 | C | M | Ningún archivo de vista > 500 líneas. |

### Fase 2 — Usabilidad e intuitividad (semanas 2–5)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Capa común de errores: banner "no se pudo cargar" con botón Reintentar en cada vista; sustituir `catch {}` silenciosos. | U1 | A | S | Con la red cortada, cada pantalla muestra error y reintento. |
| 2.2 | Onboarding de primer uso: lista de 3 pasos (crear cuenta → elegir categorías → registrar primer movimiento), con estado vacío accionable en Inicio, Movimientos, Presupuestos y Metas. | U2 | A | M | Usuario nuevo registra un movimiento en < 2 min sin ayuda. |
| 2.3 | Componentes `KfSkeleton` y `KfEmptyState` compartidos; usarlos en todas las listas. | U6 | B | M | Sin saltos de layout al cargar. |
| 2.4 | Deshacer: snackbar con "Deshacer" tras eliminar (borrado diferido 5–8 s o `restore` en servidor). | U8 | B | M | Eliminar y restaurar devuelve el saldo correcto. |
| 2.5 | Unificar confirmaciones destructivas en un `ConfirmDialog` único, con texto de consecuencia. | U7 | B | S | Una sola implementación. |
| 2.6 | Reorganizar el menú: Inicio · Movimientos · Presupuestos y metas · Cuentas y créditos · Reportes · Más (Simuladores, Recurrentes, Categorías, Ayuda). Agregar búsqueda global (Ctrl+K). | U3 | B | M | Máximo 6 entradas de primer nivel. |
| 2.7 | Cerrar el QA pendiente: pasar checklist de 3 anchos de pantalla, contraste AA, teclado y lector de pantalla en las 12 vistas; corregir hallazgos. | P1, P4, U5 | A | L | Checklist firmada por pantalla, sin fallos AA. |
| 2.8 | Atajos rápidos: acción flotante "+ Gasto" con último monto/categoría usados y sugerencia de categoría por comercio. | usabilidad | C | M | Registrar un gasto en ≤ 3 toques. |

### Fase 3 — Manejo de usuarios y sesión (semanas 3–6)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Fallo de refresh: avisar "Tu sesión expiró" y regresar a login con `router.push` conservando la ruta de destino; guardar borradores de formularios. | S2 | A | S | Tras expirar, el usuario vuelve a la pantalla en la que estaba. |
| 3.2 | Web: refresh token en cookie `httpOnly` + `SameSite`; nativo: almacenamiento seguro (Keychain/Keystore). Acortar vida del access token. | S1 | B | L | Tokens ausentes de `localStorage`. |
| 3.3 | Perfil: lista de sesiones/dispositivos con "cerrar esta sesión" y "cerrar todas las demás". | S6 | A | M | Revocar una sesión la invalida en < 1 min. |
| 3.4 | Admin: acciones de soporte (cerrar sesiones, reiniciar 2FA, reenviar verificación) y pantalla de auditoría con filtros. | S3, S4 | B | M | Cada acción deja registro en `AdminAuditLog` visible en la UI. |
| 3.5 | Rol `support` (solo lectura de usuarios y suscripciones) y permisos por ruta. | S5 | C | M | `support` no puede cambiar roles ni estados. |
| 3.6 | Exportación y borrado de cuenta guiado (descargar datos, confirmar, periodo de gracia). Revisar que `delete-account` borre todas las colecciones del usuario. | privacidad | B | M | Prueba automática: no quedan documentos del usuario. |
| 3.7 | Evaluar cartera compartida (pareja/familia) con invitaciones y permisos. | S7 | C | L | Documento de diseño aprobado antes de construir. |

### Fase 4 — Validación nativa y cierre (semanas 5–7)

| ID | Acción | Resuelve | Prior. | Esfuerzo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Instalar `@capacitor/status-bar` y fijar estilo claro sobre fondo oscuro en iOS. | P3 | A | S | Texto de barra visible en iOS. |
| 4.2 | Pruebas en dispositivos (iPhone pequeño y grande, Android gama baja): login, biométrico, voz, compras IAP, rotación, teclado. | P2, P5 | A | M | Matriz de dispositivos completada. |
| 4.3 | Pruebas end-to-end (Playwright) de: registro/verificación, login con 2FA, crear movimiento, presupuesto, reporte, suscripción. | P5, P7 | B | L | Suite en CI. |
| 4.4 | Tests de backend para registros, reportes, resumen y administración. | P7 | B | M | Cobertura de servicios críticos ≥ 70 %. |

## 4. Orden recomendado

1. Semana 1: 0.1, 0.2, 0.3, 1.2, 2.1, 3.1, 4.1.
2. Semanas 2–3: 1.1, 1.3, 1.6, 2.2, 3.3.
3. Semanas 4–5: 2.7, 1.5, 1.7, 2.4, 2.6, 3.4.
4. Semanas 6–7: 3.2, 4.2, 4.3, 4.4, 0.4, luego C.

## 5. Estado de avance (2026-10-05)

| ID | Estado | Nota |
| --- | --- | --- |
| 0.1 | Hecho | API sin vulnerabilidades en producción; frontend 5 restantes en tooling de Capacitor (requieren `--force`). |
| 0.2 | Hecho | `.env` nunca se versionó. |
| 1.1 | Hecho | `GET /registers?page&limit&q` con totales; sin `page` devuelve el arreglo de siempre. La búsqueda en servidor descifra en memoria solo cuando hay `q`. |
| 1.2 | Hecho | 3 índices nuevos en `Register`. Falta verificar con `explain()`. |
| 1.3 | Hecho | `POST /registers/bulk-delete` (máx. 200). |
| 1.6 | Hecho | Fuente MDI solo woff2, PNG a WebP, chunks `vuetify`/`charts`/`i18n`. `dist` 8.3 → 4.5 MB; `index.js` 942 → 260 kB. |
| 1.5 | Hecho | Reporte mensual: 3+N → 2 agregaciones; anual: 12 → 1 (`$bucket`). Con tests. |
| 2.1 | Hecho | Aviso global en errores de carga (GET) vía interceptor, más banner con reintento en Inicio. |
| 2.4 | Hecho | "Deshacer" tras eliminar un movimiento simple (no pagos de tarjeta ni cuotas). Recrea el movimiento; no es una restauración en servidor. |
| 2.5 | Hecho | `ConfirmDialog` único usado en 8 diálogos de eliminación. |
| 1.4 | Hecho | Exportar CSV por cursor en lotes de 500, sin cargar todo en memoria. |
| 1.7 | Parcial | Caché de 5 min solo para categorías (se invalida al usar el asistente). Cuentas no se cachean porque sus saldos cambian con cada movimiento. |
| 2.6 | Parcial | Búsqueda rápida Ctrl+K y botón de lupa en escritorio; el menú sigue igual (ya estaba agrupado en 3 secciones). No reorganicé rutas para no romper guías ni enlaces. |
| 3.6 | Hecho | Al borrar la cuenta faltaban `AssistantAction` y `WhatsAppSession` (esta guarda historial de chat). Corregido, con test que recorre todos los modelos con campo `user`. |
| 0.4 | Hecho en archivos | ESLint, Vitest y workflows de GitHub Actions en ambos repos. Se activan al hacer push. |
| 3.4 | Hecho | Admin: cerrar sesiones y reiniciar 2FA por usuario, y pestaña Auditoría. Incluye reenviar verificación. |
| 2.2 | Hecho | Tarjeta de 2 pasos en Inicio. |
| 3.1 | Hecho | Sin guardar borradores de formularios. |
| 3.3 | Hecho | Tarjeta "Sesiones activas" en Perfil; el user-agent ahora se guarda al crear la sesión. |
| 4.1 | Hecho en código | Requiere `npm run cap:sync` y build iOS. |
| 0.3 | Parcial | Medido con 50 000 movimientos en MongoDB en memoria: página 1 de 289 a 59 ms (índice con `_id` evita examinar 50 000 documentos, ahora 25); arreglo completo 1.6 s; búsqueda `q` con descifrado 1.4 s. Falta Lighthouse en la app corriendo. |
| 3.1 | Hecho | Además, el borrador de un movimiento nuevo se conserva en `sessionStorage` y se restaura tras volver a iniciar sesión. |
| 3.5 | Hecho | Rol `support`: consulta usuarios y suscripciones, cierra sesiones y reenvía verificación; no cambia roles, estado, 2FA ni facturación, ni ve la auditoría. |
| 3.2, 3.7 | Diseño | Ver DISENO-3.2-3.7.md. Esperan decisiones. |
| 4.4 | Hecho | Tests de CRUD de movimientos, saldos, resumen y aislamiento entre usuarios. Descubrieron un error: editar un movimiento sin enviar `wallet` revertía el saldo pero no aplicaba el nuevo monto. Corregido. |
| 4.2, 4.3, 2.7 | Pendiente | QA en dispositivos, end-to-end y accesibilidad (diferidos por el usuario). |

## 6. Notas y límites de esta revisión

- Es una revisión estática. Los números de impacto (tiempos, tamaños) salen del build existente en `dist/`; hay que medirlos con 0.3.
- No se revisó a fondo `ProfileView`, `AdminView` ni los controladores de autenticación. S3 y S6 se confirman al implementar 3.3 y 3.4.
- Cambiar la paginación de `GET /registers` (1.1) afecta a la app, al asistente de voz y a WhatsApp. Mantener compatibilidad hasta migrar los tres.
