# Pruebas de "Oye Flow"

## Automáticas

`npm test` ejecuta `src/stores/wakeword.test.js` (sin micrófono, con un plugin simulado): inicio, pausa, reanudación, segundo plano, evento de detección, errores sin reintento automático, umbral por sensibilidad, serialización de llamadas del proveedor y plataformas no soportadas.

Validación del pipeline: el algoritmo de streaming (mismas ventanas y transformaciones que el Kotlin) se probó en Python con los modelos reales; con la voz sintética "Hey Jarvis" el puntaje máximo fue 0.99 y con ruido aleatorio 0.005.

## Manual en Android (dispositivo real)

Compile: `npm run cap:sync`, abra `android/` en Android Studio y ejecute en el teléfono.

- [ ] Ajustes de voz del asistente: activar "Oye Flow" muestra la explicación; al aceptar pide el micrófono.
- [ ] App abierta, asistente cerrado: decir la frase abre el asistente.
- [ ] Conversación normal sin la frase: no se abre.
- [ ] Con el asistente hablando/escuchando: el detector está en pausa (`/dev/wakeword`: PAUSED).
- [ ] Al cerrar el asistente: vuelve a LISTENING.
- [ ] Una sola pronunciación abre una sola vez (cooldown 2 s).
- [ ] Quitar el permiso de micrófono: mensaje claro y la opción se apaga.
- [ ] Mandar la app a segundo plano: el detector se detiene; al volver se reanuda.
- [ ] Pantalla bloqueada: anotar el comportamiento real.
- [ ] Auriculares Bluetooth: anotar el comportamiento.
- [ ] Altavoz: anotar el comportamiento (y que el audio del propio teléfono no la active).
- [ ] CPU/RAM/batería: medir con el perfilador de Android Studio y registrar los resultados aquí.

### Resultados

| Fecha | Dispositivo | Modelo | Umbral | Detección | Falsos/hora | CPU | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _pendiente_ | | | | | | | |
