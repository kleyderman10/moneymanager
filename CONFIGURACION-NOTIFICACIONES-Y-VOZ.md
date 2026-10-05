# Configuración: notificaciones push y activación por voz

Todo está programado y probado con pruebas automáticas, pero **ninguno de los dos funciona hasta que se configuren las credenciales de abajo**. Sin ellas la app se comporta como antes: en Perfil y en los ajustes de voz aparece un aviso de que falta configurar.

## 1. Activación por voz con Picovoice

Detecta una frase ("Oye Flow") en el dispositivo; el audio no sale de él. Solo escucha con la app abierta y visible, y se pausa mientras el asistente usa el micrófono.

1. Crear una cuenta en <https://console.picovoice.ai> y copiar la **AccessKey**.
2. En el archivo `.env.local` del frontend (no se sube a git; también en `.env.capacitor` para la app nativa):

   ```
   VITE_PICOVOICE_ACCESS_KEY=tu_clave
   ```

   Con solo eso funciona con la frase **"Jarvis"** (palabra incluida en Porcupine, modelo en inglés).
3. **Para "Oye Flow"** (frase propia en español):
   - En la consola, Porcupine → idioma **Spanish** → escribir `oye flow` → plataforma **Web (WASM)** → descargar el `.ppn`.
   - Copiarlo a `public/wakeword/oye-flow_es.ppn` y agregar:

     ```
     VITE_WAKEWORD_PPN=/wakeword/oye-flow_es.ppn
     VITE_WAKEWORD_LANG=es
     VITE_WAKEWORD_LABEL=Oye Flow
     ```
   - Los modelos de idioma (`porcupine_params.pv`, `porcupine_params_es.pv`) ya están en `public/wakeword/`.
4. Reconstruir: `npm run build` (web) o `npm run cap:sync` (nativa).
5. En la app: abrir el asistente → ajustes de voz (icono de controles) → **Activar diciendo «Oye Flow»**.

Notas:
- La AccessKey queda dentro del código de la app: es lo normal en Picovoice y está limitada a tus dispositivos activos. El plan gratuito es para uso personal/no comercial: para una app de pago hay que contratar un plan comercial.
- El motor pesa ~1 MB y solo se descarga cuando alguien activa la función.
- El API ya permite el motor en su política de seguridad (`wasm-unsafe-eval`, workers `blob:` y `*.picovoice.ai`).
- En Android e iOS la función usa el micrófono del WebView: Android pide el permiso al activarla (ya declarado en el manifiesto) e iOS usa el texto de `NSMicrophoneUsageDescription`.

## 2. Notificaciones push

Flow avisa (tarjeta por vencer, presupuesto casi agotado o superado, cuenta en rojo, recurrente próximo) aunque la app esté cerrada. Máximo 3 al día por usuario y sin enviar de 9 p. m. a 8 a. m. (hora de Bogotá).

### Servidor (`moneymanagerapi/.env`)

**Web (navegador / PWA)**
```
# npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:soporte@tu-dominio.com
```

**Android (Firebase Cloud Messaging)**
1. Crear un proyecto en Firebase y registrar la app Android `online.knexura.moneymanager`.
2. Descargar `google-services.json` y copiarlo a `moneymanager/android/app/`.
3. Firebase → Configuración del proyecto → Cuentas de servicio → **Generar nueva clave privada**. Pasar el JSON completo (o en base64) a:
   ```
   FCM_SERVICE_ACCOUNT_JSON=...
   ```

**iOS (APNs directo, sin Firebase)**
1. Apple Developer → Keys → crear una llave con **Apple Push Notifications service (APNs)** y descargar el `.p8`.
2. Variables:
   ```
   APNS_KEY_P8="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   APNS_KEY_ID=ABC123DEFG
   APNS_TEAM_ID=XYZ987TEAM
   APNS_BUNDLE_ID=online.knexura.moneymanager
   APNS_PRODUCTION=true     # false para builds de desarrollo
   ```
3. En Xcode, target App → Signing & Capabilities → **+ Capability → Push Notifications**.

**Ajustes opcionales**
```
PUSH_QUIET_START=21   # hora (Bogotá) desde la que no se envía
PUSH_QUIET_END=8
PUSH_MAX_PER_DAY=3
```

### Programar el envío
Los avisos salen cuando se ejecuta el programador. En Heroku Scheduler, **cada hora**:

```
npm run push:notices
```

Se puede ejecutar tan seguido como se quiera: no repite un aviso ya enviado, respeta el silencio nocturno y el tope diario.

### App nativa
```
npm run cap:sync
```
y reconstruir Android e iOS (el plugin `@capacitor/push-notifications` y los cambios de `AppDelegate.swift` y del manifiesto entran con ese build).

### Probar
Perfil → **Notificaciones de Flow** → activar → **Enviar una notificación de prueba**.

## Privacidad
- Los tokens de dispositivo y suscripciones se guardan cifrados; un dispositivo pertenece a una sola cuenta y se quita al cerrar sesión o eliminar la cuenta.
- Los avisos usan datos reales (sin IA) y no incluyen nada que no estuviera ya visible en la app.
