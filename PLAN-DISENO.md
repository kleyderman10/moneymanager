# Plan de correcciones de diseño

Fecha: 2026-11-12.

## Resumen

La app no tiene desbordes horizontales en móvil, pero sí tres problemas que se repiten en casi todas las pantallas:

1. **Botones flotantes apilados.** El robot del asistente, el botón "+" y el micrófono central conviven en la esquina inferior y tapan contenido y botones en 11 de 16 pantallas.
2. **Textos cortados.** Nombres de cuentas, movimientos, categorías y beneficios del plan se recortan a una línea con "…" aunque hay espacio para dos; en dos casos el texto se sale de la tarjeta sin "…".
3. **Controles que no caben a 320 px.** Las pestañas tipo píldora y los avisos de Flow se rompen en pantallas pequeñas.

El panel administrativo tiene además un problema propio: en móvil sus seis pestañas se enciman y no se pueden leer.

Lo más urgente es la fase 1: son los errores que impiden leer un dato o tocar un botón.

## Cómo se revisó

| Aspecto | Detalle |
| --- | --- |
| Entorno | Front en `vite dev` contra el API local con MongoDB en memoria y datos de ejemplo (4 cuentas, 9 categorías, 51 movimientos, 4 presupuestos, 2 metas, 2 recurrentes). No se tocó producción. |
| Datos | Nombres largos a propósito ("Bancolombia Cuenta de Ahorros Nómina", "Servicios públicos y suscripciones") para forzar los recortes. |
| Tamaños | Móvil 360×740 y 320×640 con emulación táctil; escritorio 1366×768. |
| Pantallas | Las 16 rutas autenticadas, login, registro, recuperar contraseña, y los diálogos de nuevo movimiento, nueva cuenta, asistente, menú lateral y filtros. |
| Método | Capturas con Playwright más una revisión automática de desbordes, solapamientos y tamaños táctiles. Cada hallazgo de esta lista se confirmó mirando la captura. |

Las capturas están en `.playwright-mcp/shots2/` (móvil) y `.playwright-mcp/shots/` (escritorio), en la raíz del workspace.

## Hallazgos

Prioridad: A = impide leer o usar algo; M = molesta o confunde; B = pulido. Esfuerzo: S = menos de 2 h; M = medio día; L = más de un día.

### 1. Botones flotantes que tapan contenido

| ID | Pantalla | Qué pasa | Prior. |
| --- | --- | --- | --- |
| F1 | Todas (móvil) | Robot y "+" quedan fijos uno sobre otro a la derecha, encima de la barra inferior, que ya tiene el micrófono. Son tres accesos flotantes en la misma zona. | A |
| F2 | Presupuestos | El robot tapa el porcentaje ("71 %") de la tarjeta que pasa por debajo. | A |
| F3 | Metas, Categorías | El "+" tapa el botón de eliminar de la fila; solo se ve un borde rojo. | A |
| F4 | Cuentas | Tapan los valores de "Pago mínimo" e "Interés mensual" de la tarjeta de crédito. | A |
| F5 | Movimientos | El robot queda sobre el campo de búsqueda y sobre los selectores "Categoría" y "Desde" al abrir filtros. A 320 px el "+" tapa el botón "Filtros". | A |
| F6 | Plan y facturación | El robot tapa el final del botón "Suscribirme por $ 36.000", que es la acción de pago. | A |
| F7 | Inicio, Reportes, Simuladores, Perfil | Tapan la tarjeta "Gastos", "Gastos vs. mes anterior", el campo "Tasa de interés" y "Administrar suscripción". | M |
| F8 | Menú lateral (móvil) | Con el menú abierto, robot y "+" siguen visibles por encima del fondo oscurecido. | M |
| F9 | Escritorio | El robot flota sobre la columna de acciones de la tabla de movimientos y sobre el botón de cerrar del aviso de Inicio. | M |

### 2. Textos cortados o encimados

| ID | Pantalla | Qué pasa | Prior. |
| --- | --- | --- | --- |
| T1 | Cuentas (móvil y escritorio) | El nombre de la cuenta se sale de la tarjeta sin "…": "Bancolombia Cuenta de Ahorros N" queda cortado por el borde. | A |
| T2 | Inicio · "Flow te avisa" | El texto del aviso queda en una columna de unos 130 px: 5 líneas a 360 px y 7 a 320 px, con palabras partidas ("presupuest / o"). Los avisos ocupan toda la primera pantalla. | A |
| T3 | Metas | Las pestañas "Todas / En progreso / Completadas" no caben: a 320 px el contador de una se monta sobre el texto de la siguiente; a 360 px el último contador queda pegado al borde. | A |
| T4 | Escritorio · Movimientos | El monto se parte en dos líneas a mitad de número ("-$ 28.50 / 0"). La fecha también se parte. La columna Categoría es ancha y Descripción angosta. | A |
| T5 | Plan y facturación | Los cuatro beneficios del plan se recortan: "Movimientos, cuentas y…", "Pago protegido por Mer…". Es el texto que debe convencer de pagar. | A |
| T6 | Movimientos (móvil) | El título se corta ("Mercado quince…", "Proyecto de d…") mientras el subtítulo usa dos líneas. | M |
| T7 | Reportes, Simuladores | A 320 px la pestaña "Análisis inteligente" queda cortada y "Capacidad" toca el borde. | M |
| T8 | Recurrentes, Categorías, Presupuestos, Metas | Nombres a una línea con "…" habiendo espacio vertical: "Arriendo d…", "Trabajos indep…", "Servicios públicos …", "Fondo de emerg…". | M |
| T9 | Barra inferior a 320 px | "Movimientos" se muestra como "Movimie…". | M |
| T10 | Simuladores a 320 px | El título de la página toca el borde derecho y el de la barra superior se corta ("Simuladores y cap…"). | B |
| T11 | Menú lateral | "Cuentas compartidas" ocupa dos líneas y el último ítem queda cortado detrás de la tarjeta del usuario. | B |

### 3. Uso en móvil

| ID | Pantalla | Qué pasa | Prior. |
| --- | --- | --- | --- |
| U1 | Inicio | El patrimonio, que es el dato principal, queda bajo los avisos y medio oculto por la barra inferior al entrar. | A |
| U2 | Cuentas, Metas | Editar y eliminar son íconos de unos 32 px, pegados entre sí. El de eliminar es muy pequeño. Es fácil borrar por error. | M |
| U3 | Nuevo movimiento, Nueva cuenta | El diálogo a pantalla completa no tiene barra superior ni botón de cerrar; "Cancelar" solo está al final. | M |
| U4 | Nuevo movimiento | Las tres herramientas (sugerir, voz, recibo) ocupan el inicio y el campo "Cuenta" queda fuera de la primera pantalla. | M |
| U5 | Nueva cuenta | Los tres tipos de cuenta van en rejilla de dos columnas: "Crédito" queda solo en la segunda fila. | B |
| U6 | Cuentas · tarjeta de crédito | "Movimientos / Pagar / Transferir" llenan el ancho; "Transferir" termina en el borde a 360 px. | M |
| U7 | Guía de bienvenida | El globo cubre los avisos y el patrimonio; el botón de cerrar mide 32×28 px. | B |
| U8 | Login | "¿Olvidaste tu contraseña?" tiene una letra mucho más pequeña que el resto. | B |

### 4. Consistencia

| ID | Pantalla | Qué pasa | Prior. |
| --- | --- | --- | --- |
| C1 | Inicio · gráfico de categorías | Si las categorías no tienen color, la dona y la leyenda salen en un solo gris. En Categorías los íconos también salen grises. | M |
| C2 | Movimientos | "Total mostrado" es ingresos menos gastos, pero "Promedio por movimiento" promedia valores absolutos. Los dos números no cuadran entre sí. | B |

### 5. Panel administrativo

Revisado aparte con un usuario administrador y 15 usuarios de ejemplo, en sus seis pestañas (Resumen, Usuarios, Suscripciones, Estadísticas, Herramientas, Auditoría) a 360, 320 y 1366 px. Capturas en `.playwright-mcp/shots3/`.

| ID | Pestaña | Qué pasa | Prior. |
| --- | --- | --- | --- |
| P1 | Todas (móvil) | Las seis pestañas no caben en la píldora y se enciman unas sobre otras: se lee "ResumenUsuariosSuscripcionesEstadísticasHerramientasAuditoría". La pestaña activa mide unos 50 px y su texto se sale. No se puede saber dónde tocar. | A |
| P2 | Usuarios (escritorio) | La etiqueta del interruptor se parte letra por letra: "Acti / vos", "Inac / tivo / s". | A |
| P3 | Usuarios (escritorio) | En la columna Acciones, "Hacer admin" y el menú de tres puntos quedan uno encima del otro en cada fila. | M |
| P4 | Usuarios | "Hacer admin" es un botón visible en cada fila, junto al interruptor de activar. Dar permisos de administrador queda a un toque de distancia de una acción rutinaria. | A |
| P5 | Usuarios | El interruptor dice "Activos" o "Inactivos" en plural para una sola cuenta, y mide 28 px. | M |
| P6 | Usuarios | "Sin dato · 12 de nov de 2026" no explica qué dato falta (es la plataforma). Los correos largos se cortan sin forma de verlos completos. | M |
| P7 | Usuarios | Filtros con etiqueta cortada: "Última acti…" a 320 px y en escritorio; en escritorio el buscador muestra "Buscar…". A 320 px el robot tapa "Exportar CSV". | M |
| P8 | Estadísticas (móvil) | La tabla de retención necesita scroll horizontal sin ninguna pista: solo se ven "Usuarios" y "Semana 1"; el encabezado se parte en tres líneas. | A |
| P9 | Estadísticas | "Usuarios con sesión" e "Ingresos" muestran un bloque vacío de unos 200 px cuando no hay datos. En escritorio las tarjetas quedan con alturas distintas y huecos entre filas. | M |
| P10 | Estadísticas | Fechas en formato técnico ("2026-09-18", "2026-11-13") mientras el resto de la app usa "12 de nov de 2026". | M |
| P11 | Estadísticas | "Uso por función" usa barras moradas, un color que no está en el resto de la app. Las donas salen grises cuando todo es "Sin dato". Con una sola versión, la barra ocupa toda la tarjeta. | B |
| P12 | Estadísticas (móvil) | El selector de periodo se corta: "Últimos 90…". | B |
| P13 | Auditoría (móvil) | Tabla con scroll horizontal; el encabezado "Usuario afectado" queda cortado. | M |
| P14 | Herramientas | Estados mezclados en dos idiomas: "connected" junto a "inactivo". | M |
| P15 | Resumen (escritorio) | Los siete estados de suscripción van en fila de seis: "Incompleta" queda sola en la segunda fila. | B |
| P16 | Menú lateral (escritorio) | Con el ítem extra de administración aparece una barra de scroll gris del sistema, sin el estilo de la app, y "Simuladores y capacidad" pasa a dos líneas. | B |

## Plan

### Fase 1: lo que impide leer o tocar

| ID | Acción | Resuelve | Archivos | Esf. | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Dejar un solo botón flotante en móvil. Quitar el robot flotante y abrir el asistente desde el micrófono central (voz y chat en la misma entrada) o desde la barra superior. | F1–F8 | `AIChatPanel.vue`, `flow.css:310`, `finance.css:636`, `MobileBottomNavigation.vue` | M | En las 16 pantallas a 360 y 320 px hay como máximo un botón flotante. |
| 1.2 | Garantizar que el "+" nunca cubra una acción: reservar su ancho en la última columna de las filas o esconderlo al bajar y mostrarlo al subir. Ocultarlo cuando hay un menú o diálogo abierto. | F3, F5, F8 | `flow.css:152`, `finance.css:626` | M | Ningún botón de fila queda bajo el "+" en ninguna posición de scroll. |
| 1.3 | En escritorio, mover el robot a la barra superior junto al micrófono. | F9 | `AIChatPanel.vue` | S | Nada flota sobre la tabla ni sobre los avisos. |
| 1.4 | Nombre de cuenta: `min-width: 0` en la cadena flex y permitir dos líneas con "…" al final. | T1 | `WalletsView.vue:42-47` | S | "Bancolombia Cuenta de Ahorros Nómina" se lee completo o termina en "…" dentro de la tarjeta. |
| 1.5 | Avisos de Flow: texto a todo el ancho y acciones debajo ("Ver" y descartar). Mostrar un aviso y un "ver 1 más". Sin cortes dentro de una palabra. | T2, U1 | `FlowNotices.vue` | M | A 320 px cada aviso ocupa 3 líneas o menos y el patrimonio se ve completo sin hacer scroll. |
| 1.6 | Pestañas tipo píldora: si no caben, scroll horizontal con el borde difuminado; contador dentro de su opción con separación fija. | T3, T7 | `KfSegmented.vue` | M | A 320 px ningún texto ni contador se monta sobre otro en Metas, Reportes y Simuladores. |
| 1.7 | Tabla de escritorio: `white-space: nowrap` y cifras tabulares en Monto y Fecha; dar el ancho sobrante a Descripción. | T4 | `TransactionsView.vue` | S | Ningún monto ni fecha se parte en dos líneas a 1366 px. |
| 1.8 | Beneficios del plan: permitir varias líneas. | T5 | `SubscriptionView.vue` | S | Los cuatro beneficios se leen completos a 320 px. |

### Fase 2: legibilidad

| ID | Acción | Resuelve | Archivos | Esf. | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Regla común para títulos de fila: hasta dos líneas y luego "…"; subtítulo a una línea. Aplicarla con una sola clase. | T6, T8 | `TransactionsView.vue:1451`, `finance.css`, vistas de Recurrentes, Categorías, Presupuestos y Metas | M | Con los datos de ejemplo, ningún nombre de 30 caracteres o menos se recorta a 360 px. |
| 2.2 | Barra inferior: reducir la letra de las etiquetas a 320 px o usar "Movim." como etiqueta corta. | T9 | `MobileBottomNavigation.vue:100` | S | Ninguna etiqueta termina en "…". |
| 2.3 | Título de página con ajuste de línea y tamaño fluido; título corto para la barra superior de Simuladores. | T10 | `finance.css`, `SimulatorsView.vue` | S | El título no toca el borde a 320 px. |
| 2.4 | Menú lateral: espacio inferior igual al alto de la tarjeta del usuario; "Compartidas" como etiqueta corta. | T11 | componente de navegación lateral | S | El último ítem se ve completo al llegar al final. |

### Fase 3: formularios y acciones

| ID | Acción | Resuelve | Archivos | Esf. | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Barra superior fija en los diálogos a pantalla completa: título y botón de cerrar. "Guardar" fijo abajo. | U3 | diálogos de movimiento, cuenta, presupuesto y meta | M | Se puede cerrar cualquier diálogo sin hacer scroll. |
| 3.2 | Nuevo movimiento: herramientas en una fila compacta de íconos; orden Tipo, Monto, Categoría, Cuenta, Fecha. | U4 | formulario de movimiento | M | Monto, categoría y cuenta caben en la primera pantalla a 360×740. |
| 3.3 | Tipo de cuenta en tres columnas. | U5 | `WalletsView.vue` | S | Las tres opciones quedan en una fila. |
| 3.4 | Acciones de fila: área táctil de 44 px, separación de 8 px o más, y eliminar dentro de un menú "más" o con confirmación. | U2 | `WalletsView.vue`, `GoalsView.vue`, `CategoriesView.vue` | M | Ningún botón de fila mide menos de 44×44 px. |
| 3.5 | Tarjeta de crédito: "Pagar" como botón principal a todo el ancho y las otras dos acciones debajo. | U6 | `WalletsView.vue` | S | Las tres acciones caben a 320 px. |

### Fase 4: pulido

| ID | Acción | Resuelve | Archivos | Esf. | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Paleta de respaldo para categorías sin color, asignada por posición. | C1 | `CategoryDonutChart.vue`, `CategoriesView.vue` | S | La dona nunca sale en un solo color con dos o más categorías. |
| 4.2 | Renombrar "Total mostrado" a "Balance" o calcular los dos indicadores sobre la misma base. | C2 | `TransactionsView.vue` | S | El promedio multiplicado por la cantidad da el total mostrado. |
| 4.3 | Guía de bienvenida: globo anclado abajo en móvil y botón de cerrar de 44 px. | U7 | `tour.css` | S | El globo no cubre el dato que está explicando. |
| 4.4 | Enlace de recuperar contraseña con el tamaño de letra del resto del formulario. | U8 | `LoginView.vue` | S | Letra de 14 px o más. |

### Fase 5: panel administrativo

| ID | Acción | Resuelve | Archivos | Esf. | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Pestañas del panel con scroll horizontal y la activa siempre a la vista. Sale de la acción 1.6 si se hace en el componente compartido; verificar aquí con seis opciones. | P1 | `KfSegmented.vue`, `AdminView.vue` | S | A 320 px cada pestaña se lee completa y la activa queda visible al cambiar. |
| 5.2 | Tabla de usuarios: `white-space: nowrap` en la etiqueta del interruptor y ancho mínimo para las columnas Estado y Acciones; acciones en una sola fila. | P2, P3 | `AdminView.vue:134-205` | S | A 1366 px ninguna etiqueta se parte y cada fila tiene una sola línea de acciones. |
| 5.3 | Mover "Hacer admin" y "Quitar admin" al menú de tres puntos y pedir confirmación con el nombre del usuario. | P4 | `AdminView.vue` | S | Cambiar un rol requiere dos pasos y muestra a quién afecta. |
| 5.4 | Etiqueta del interruptor en singular ("Activa" / "Inactiva") y área táctil de 44 px. | P5 | `AdminView.vue`, textos en `es.js` y `en.js` | S | El texto concuerda con una cuenta. |
| 5.5 | Reemplazar "Sin dato" por "Plataforma desconocida" o un ícono con ayuda. Correo completo al tocar la fila o en el detalle. | P6 | `AdminView.vue` | S | Se entiende qué significa cada dato sin abrir el código. |
| 5.6 | Filtros: etiquetas cortas ("Actividad") y buscador con ancho mínimo en escritorio. | P7, P12 | `AdminView.vue`, `AdminStats.vue` | S | Ninguna etiqueta de filtro termina en "…". |
| 5.7 | Retención en móvil: primera columna fija, sombra en el borde que indica más contenido y encabezados cortos ("Sem. 1"). | P8 | `AdminStats.vue` | M | A 360 px se ve que hay más columnas y la fecha no se pierde al desplazar. |
| 5.8 | Estado vacío compacto para los gráficos sin datos (una línea de texto, sin reservar el alto del gráfico). Igualar alturas por fila en escritorio. | P9 | `AdminStats.vue` | M | Una tarjeta sin datos mide menos de 100 px de alto. |
| 5.9 | Fechas con el formato del resto de la app. | P10 | `AdminStats.vue` | S | No queda ninguna fecha en formato `AAAA-MM-DD`. |
| 5.10 | Colores de los gráficos tomados de los tokens de la app; alto de barra máximo en gráficos de una sola categoría. | P11 | `AdminStats.vue`, `design-tokens.css` | S | No hay colores fuera de la paleta. |
| 5.11 | Auditoría en móvil como lista de tarjetas (fecha, administrador, acción, usuario afectado). | P13 | `AdminAuditLog.vue` | M | No hay scroll horizontal a 360 px. |
| 5.12 | Traducir los estados de salud del sistema. | P14 | `AdminTools.vue`, `es.js`, `en.js` | S | Todos los estados salen en el idioma del usuario. |
| 5.13 | Rejilla de estados de suscripción sin elementos sueltos (cuatro por fila, o siete en una). | P15 | `AdminView.vue` | S | La última fila no tiene un solo elemento. |
| 5.14 | Barra de scroll del menú lateral con el estilo de la app. | P16 | componente de navegación lateral | S | La barra usa los colores del tema. |

## Estado (2026-11-12)

Hecho en local y verificado con capturas a 320, 360, 1280 y 1366 px (`.playwright-mcp/after/`). Sin desplegar.

| ID | Estado | Nota |
| --- | --- | --- |
| 1.1 | Hecho | El asistente se abre desde un botón en la barra superior, en móvil y escritorio. Ya no hay robot flotante. |
| 1.2 | Parcial | El "+" se esconde al bajar, vuelve al subir y se oculta con el menú abierto. Quieto al inicio de la página todavía puede quedar sobre un botón de fila (Metas a 360 px) o sobre el final del patrimonio (Inicio a 320 px). |
| 1.3 | Hecho | Mismo botón de la barra superior. |
| 1.4 | Hecho | Nombre de cuenta en dos líneas. Faltaba la clase `min-w-0`, que se usaba sin estar definida; también corrige Créditos y Cuentas compartidas. |
| 1.5 | Hecho | Un aviso visible y "Ver N más". Acciones debajo del texto. |
| 1.6 | Hecho | La píldora se desplaza, centra la opción activa y difumina el lado con más opciones. |
| 1.7 | Hecho | El monto nunca se parte. La fecha sí puede ocupar dos líneas en pantallas angostas; el nombre de categoría se recorta a 140 px con el nombre completo al pasar el cursor. |
| 1.8 | Hecho | Beneficios del plan en varias líneas. |
| 5.1 | Hecho | Sale de 1.6. |
| 5.2 | Hecho | Etiqueta del interruptor en una línea; una sola acción por fila. |
| 5.3 | Hecho | "Hacer admin" y "Quitar admin" están en el menú de tres puntos y piden confirmación con nombre y correo. |
| 5.4 | Parcial | Etiqueta en singular ("Activa" / "Inactiva"). El área táctil del interruptor sigue en 28 px. |

Fase 2, también en local y verificada a 320, 360 y 1366 px (`.playwright-mcp/after2/`):

| ID | Estado | Nota |
| --- | --- | --- |
| 1.2 | Ampliado | En Metas el "+" flotante solo aparece si no hay metas: la lista ya abre con "Agregar nueva meta" y el "+" tapaba editar y eliminar. |
| 2.1 | Hecho | Nombres a dos líneas en Movimientos, Categorías, Presupuestos, Metas, Recurrentes y el gráfico de categorías de Inicio. La línea secundaria ("categoría · cuenta") queda en una. Los cortes caen entre palabras. |
| 2.2 | Hecho | Las cinco etiquetas de la barra inferior se leen completas a 320 px. |
| 2.3 | Hecho | Los títulos de página parten entre palabras. "Simuladores y capacidad" cabe justo en una línea a 320 px. |
| 2.4 | Descartado | El último ítem del menú no estaba cortado: la lista se desplaza entre la marca y la tarjeta del usuario. Se dejó como estaba. |
| 5.14 | Hecho | Barra de scroll del menú lateral con los colores de la app. |

En Recurrentes a 320 px se oculta la flecha de la fila y el monto baja un punto de tamaño, para que el nombre tenga espacio.

Fase 3, también en local y verificada a 320, 360 y 1366 px (`.playwright-mcp/after3/`):

| ID | Estado | Nota |
| --- | --- | --- |
| 3.1 | Hecho | Diez diálogos de formulario (movimiento, cuenta, transferencia, pago de tarjeta, presupuesto, categoría, meta, recurrente, crédito y pago de crédito) tienen botón de cerrar en la cabecera. En móvil la cabecera y la barra Cancelar/Guardar quedan fijas y solo se desplazan los campos. En escritorio no cambia nada. |
| 3.2 | Hecho | Orden nuevo: Tipo, Monto, Categoría, Descripción, Cuenta, Cuotas, Fecha. Las tres herramientas pasan a una fila compacta. A 360×740 se ven monto, categoría, descripción y cuenta sin desplazar. |
| 3.3 | Hecho | Los tres tipos de cuenta en una fila, en móvil y escritorio. |
| 3.4 | Parcial | Botones de ícono pequeños a 44×44 px en pantallas táctiles (regla global). Editar y eliminar de Cuentas van juntos y separados 8 px. Eliminar no se movió a un menú: ya pedía confirmación. |
| 3.5 | Hecho | En la tarjeta de crédito "Pagar" ocupa una fila completa en móvil; debajo van Movimientos y Transferir. |

Dos arreglos que salieron al verificar el diálogo "¿Cómo deseas ingresar el gasto?": la etiqueta "Nuevo" se salía de su tarjeta, y a 320 px las cuatro opciones quedaban en una columna más alta que la pantalla. Ahora van de dos en dos.

En escritorio a 1366 px, editar y eliminar de cada cuenta bajan a una segunda línea porque no caben junto a Movimientos y Transferir; antes el ícono de eliminar se salía del borde.

Fase 4 y resto de la fase 5, en local y verificadas a 360 y 1366 px (`.playwright-mcp/after4/`):

| ID | Estado | Nota |
| --- | --- | --- |
| 4.1 | Hecho | Las categorías sin color propio toman uno fijo de la paleta según su nombre; dentro de un mismo gráfico no se repiten. El gris `#808080` que guarda el API por defecto se trata como "sin color". También aplica a los íconos de Categorías. |
| 4.2 | Hecho | "Total mostrado" pasa a llamarse "Balance mostrado". El cálculo no cambió. |
| 4.3 | Parcial | Botón de cerrar de la guía a 44×44 px. El globo no se movió: varios pasos señalan la barra inferior y anclarlo abajo la taparía. |
| 4.4 | Hecho | "¿Olvidaste tu contraseña?" a 14 px y 44 px de alto. |
| 5.5 | Hecho | "Sin dato" pasa a "Plataforma desconocida" en la lista de usuarios. El correo se ve completo: en móvil ocupa las líneas que necesite; en escritorio aparece al pasar el cursor. |
| 5.6 | Hecho | Etiquetas cortas: "Actividad", "Nombre o correo", "90 días". |
| 5.7 | Hecho | Retención en móvil: primera columna fija, encabezados cortos ("Sem. 1") y borde derecho difuminado. Sigue habiendo scroll horizontal de unos 40 px. |
| 5.8 | Parcial | Los gráficos sin datos ya no reservan su alto, y las barras horizontales crecen según sus filas. Las tarjetas de una misma fila terminan a la misma altura; por eso una tarjeta vacía junto a una con gráfico sigue siendo alta en escritorio. |
| 5.9 | Hecho | Ninguna fecha en formato `AAAA-MM-DD` en Estadísticas. |
| 5.10 | Hecho | Barras y donas con colores de la paleta; grosor máximo de barra. |
| 5.11 | Hecho | Auditoría como tarjetas en móvil. Solo se vio el estado vacío: no había registros de auditoría en los datos de prueba. |
| 5.12 | Hecho | Estado de la base de datos traducido ("conectada"). |
| 5.13 | Hecho | Los estados de suscripción reparten cada fila: 4 y 3 en escritorio. |

Cambios adicionales que salieron al verificar:

- El título de la barra superior en móvil ya no flota centrado sobre los botones: ocupa el espacio libre y se recorta ("Metas de aho…" a 320 px).
- Los montos con la clase `kf-amount` no se parten en ninguna pantalla; el patrimonio de Cuentas reduce su tamaño en teléfonos angostos.
- Las acciones de las tarjetas de cuenta pasan a una segunda línea en vez de salirse del borde.

## Orden sugerido

1. **1.1, 1.2 y 1.3 juntas.** Resuelven nueve hallazgos y cambian la base sobre la que se verifican los demás.
2. **1.4 a 1.8.** Son independientes entre sí y casi todas cortas.
3. **Fase 2**, empezando por 2.1, que toca cinco pantallas con una sola regla.
4. **Fase 5**, empezando por 5.1 a 5.3: las pestañas ilegibles, la tabla de usuarios y el botón "Hacer admin". Solo la usan administradores, pero 5.3 es un riesgo de permisos y conviene hacerla pronto.
5. **Fases 3 y 4** según tiempo.

Después de cada fase conviene repetir las capturas a 360 y 320 px y comparar con las de esta revisión.

## Lo que no se revisó

- Dispositivo real, iOS, áreas seguras con notch y teclado abierto sobre los formularios.
- Tema claro e idioma inglés (los textos en inglés tienen otros largos).
- Tabletas y anchos intermedios (600 a 1024 px) y orientación horizontal.
- Créditos, Cuentas compartidas y Por confirmar con datos: se vieron vacías.
- En el panel administrativo: diálogos de editar suscripción y de acciones por usuario, Auditoría con registros, y las secciones plegadas de Herramientas (correos inexistentes, registros pendientes, avisos masivos).
- Contraste de color y lector de pantalla.
- Las pantallas se revisaron con el build de desarrollo actual, no con lo publicado en producción.
