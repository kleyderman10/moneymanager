# Diseño: tokens fuera de localStorage (3.2) y cartera compartida (3.7)

Fecha: 2026-10-05. Estos dos puntos del plan cambian el modelo de sesión y el de datos. No se implementaron: necesitan decisiones y pruebas en dispositivos. Este documento propone el enfoque y lista lo que hay que decidir.

## 3.2 Tokens fuera de localStorage

### Situación actual
- Access y refresh token se guardan en `localStorage` (`api/client.js`, `stores/auth.js`).
- El refresh token rota en cada uso y el servidor detecta la reutilización (`sessionService`). Esto limita el daño de un robo, pero un XSS puede leer ambos tokens.
- Mitigaciones existentes: CSP estricta en el API (`helmet`), sin `unsafe-eval`, `DOMPurify` para HTML de IA.

### Propuesta por plataforma

| Plataforma | Access token | Refresh token |
| --- | --- | --- |
| Web (PWA) | En memoria (variable del módulo), 15 min | Cookie `httpOnly; Secure; SameSite=Strict; Path=/api/auth` |
| Android / iOS (Capacitor) | En memoria | Keychain / Keystore mediante un plugin de almacenamiento seguro |

### Cambios necesarios
1. **API:** `refresh-token`, `login`, `2fa/verify`, `biometric/login`, `webauthn/login-verify` y `logout` deben poner y borrar la cookie. Para clientes nativos se mantiene el cuerpo JSON (un encabezado `X-Client: native` decide). `cors` necesita `credentials: true` y orígenes explícitos.
2. **CSRF:** con cookie `SameSite=Strict` y `Path` restringido, solo el endpoint de refresh la recibe. Exigir además el encabezado `X-Requested-With` o un token doble.
3. **Frontend:** el access token pasa a memoria. Al recargar la página se pide uno nuevo con la cookie (un viaje extra al arrancar). `router.beforeEach` hoy lee `localStorage.getItem('accessToken')`: debe esperar a la sesión restaurada.
4. **Nativo:** añadir un plugin de almacenamiento seguro (por ejemplo `@capgo/capacitor-native-biometric` ya instalado guarda credenciales en Keychain/Keystore, o `capacitor-secure-storage-plugin`). Migrar los tokens existentes una sola vez al primer arranque.
5. **Migración:** durante una versión, aceptar ambos caminos; luego borrar `accessToken` y `refreshToken` de `localStorage`.

### Riesgos
- El servicio web y la API están en el mismo origen (`/api`), lo que simplifica la cookie. Si algún día se separan, hay que revisar `SameSite` y dominios.
- La app nativa usa `CapacitorHttp`: confirmar que no mezcla cookies con el WebView.
- Sin pruebas en iOS y Android no se debe liberar.

### Decisión pedida
¿Se acepta el viaje extra de refresh al arrancar la web a cambio de sacar el token de `localStorage`? ¿Qué plugin de almacenamiento seguro se prefiere para nativo?

## 3.7 Cartera compartida (pareja o familia)

### Situación actual
Todo el modelo cuelga de `user`: movimientos, cuentas, categorías, presupuestos, metas, créditos. Cada consulta filtra por `user: userId`.

### Opciones

| Opción | Idea | Costo | Riesgo |
| --- | --- | --- | --- |
| A. Espacio compartido (`Space`) | Nuevo documento `Space` con miembros y roles (`owner`, `editor`, `viewer`). Las cuentas, movimientos y presupuestos que se comparten llevan `space` además de `user`. | Alto: todas las consultas y los índices incluyen `space`. | Fugas de datos entre espacios si falta un filtro. |
| B. Cuentas compartidas solamente | Una `Wallet` se puede compartir con otro usuario (lista `sharedWith`). Los movimientos de esa cuenta son visibles para ambos. | Medio. | Categorías y presupuestos siguen siendo personales; los movimientos del otro aparecen con categorías ajenas. |
| C. Exportar y comparar | Sin datos compartidos. Cada persona usa su cuenta y exporta resúmenes. | Bajo. | No resuelve el caso de uso. |

### Recomendación
Opción B como primera versión, con invitación por correo, roles `editor` y `viewer`, y revocación inmediata. Es la que menos toca el modelo y cubre el caso de pareja con una cuenta común.

### Preguntas antes de construir
1. ¿El caso principal es pareja con gastos comunes, o familia con varios miembros?
2. ¿Los movimientos compartidos deben verse con la categoría de quien los registró, o cada persona usa su categorización?
3. ¿Los presupuestos y metas compartidos son parte de la primera versión?
4. ¿La suscripción de pago cubre a los invitados o cada uno paga la suya?
5. ¿Qué pasa con los datos compartidos cuando uno de los miembros borra su cuenta?

### Trabajo mínimo para la opción B
- Modelo: `Wallet.sharedWith: [{ user, role }]` e `Invitation`.
- API: invitar, aceptar, listar y revocar; las consultas de movimientos de una cuenta compartida pasan por un helper único de permisos (no filtrar a mano).
- Borrado de cuenta: sacar al usuario de `sharedWith` y transferir o borrar las cuentas que posee.
- Pruebas: matriz de permisos por rol y un test que recorre todos los endpoints de lectura con un usuario sin acceso.
