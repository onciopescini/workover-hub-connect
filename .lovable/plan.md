

## Aggiunta dipendenze: react-qr-code e html5-qrcode

### Cosa faremo
Aggiungeremo due nuove librerie al `package.json` del progetto:

1. **react-qr-code** - Componente React per generare QR code (alternativa/complemento a `qrcode.react` gia presente)
2. **html5-qrcode** - Libreria per scansionare QR code tramite la fotocamera del dispositivo

### Note tecniche
- Il progetto usa gia `qrcode.react` per la generazione QR e `@yudiel/react-qr-scanner` per la scansione. Le nuove librerie verranno aggiunte come dipendenze aggiuntive.
- Verra aggiornato il file `package.json` con le versioni stabili piu recenti di entrambe le librerie.

