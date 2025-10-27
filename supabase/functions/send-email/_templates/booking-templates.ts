import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const bookingConfirmationTemplate = (data: {
  userName: string;
  spaceTitle: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
  amount: number;
  currency: string;
  bookingId: string;
  spaceAddress?: string;
  hostName?: string;
  hostPhone?: string;
  cancellationPolicy?: string;
}): EmailTemplate => {
  const content = createHeader(
    '🎉 Prenotazione Confermata!',
    'La tua prenotazione è stata confermata con successo'
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Ottime notizie! La tua prenotazione è stata confermata e sei pronto per iniziare a lavorare.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">📋 Dettagli della Prenotazione</h3>
      <div class="details-table">
        <table>
          <tr><td>Spazio:</td><td><strong>${data.spaceTitle}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.bookingDate}</strong></td></tr>
          <tr><td>Orario:</td><td><strong>${data.startTime} - ${data.endTime}</strong></td></tr>
          <tr><td>Ospiti:</td><td><strong>${data.guestsCount} ${data.guestsCount === 1 ? 'persona' : 'persone'}</strong></td></tr>
          <tr><td>Importo:</td><td><strong>€${(data.amount / 100).toFixed(2)} ${data.currency.toUpperCase()}</strong></td></tr>
          <tr><td>ID Prenotazione:</td><td><strong>#${data.bookingId}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.spaceAddress ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">📍 Indirizzo</h3>
        <p style="margin: 0;">${data.spaceAddress}</p>
      </div>
    ` : ''}

    ${data.hostName ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">👤 Il tuo Host</h3>
        <p style="margin: 0;"><strong>${data.hostName}</strong></p>
        ${data.hostPhone ? `<p style="margin: 4px 0 0 0; color: #6b7280;">Tel: ${data.hostPhone}</p>` : ''}
      </div>
    ` : ''}

    <h3>✅ Prossimi Passi</h3>
    <ul>
      <li>Arriva puntuale all'orario prenotato</li>
      <li>Porta con te un documento di identità</li>
      <li>Il pagamento è già stato elaborato</li>
      <li>Contatta l'host per eventuali esigenze speciali</li>
    </ul>

    ${data.cancellationPolicy ? `
      <div class="info-box warning">
        <h3 style="margin-bottom: 12px; color: #92400e;">⚠️ Politica di Cancellazione</h3>
        <p style="margin: 0;">${data.cancellationPolicy}</p>
      </div>
    ` : ''}

    <p style="text-align: center;">
      <a href="https://workover.it.com/bookings" class="button">Visualizza Prenotazione</a>
    </p>

    <p>Buon lavoro!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `✅ Prenotazione Confermata - ${data.spaceTitle}`,
    html: createBaseTemplate(content)
  };
};

export const bookingPendingTemplate = (data: {
  userName: string;
  spaceTitle: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  hostName: string;
  bookingId: string;
  estimatedResponse: string;
}): EmailTemplate => {
  const content = createHeader(
    '⏳ Prenotazione in Attesa',
    'La tua richiesta è stata inviata all\'host'
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Abbiamo ricevuto la tua richiesta di prenotazione e l'abbiamo inviata all'host per l'approvazione.</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📋 Dettagli della Richiesta</h3>
      <div class="details-table">
        <table>
          <tr><td>Spazio:</td><td><strong>${data.spaceTitle}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.bookingDate}</strong></td></tr>
          <tr><td>Orario:</td><td><strong>${data.startTime} - ${data.endTime}</strong></td></tr>
          <tr><td>Host:</td><td><strong>${data.hostName}</strong></td></tr>
          <tr><td>ID Richiesta:</td><td><strong>#${data.bookingId}</strong></td></tr>
        </table>
      </div>
    </div>

    <div class="info-box warning">
      <p style="margin: 0;"><strong>⏰ Tempo di Risposta Stimato:</strong> ${data.estimatedResponse}</p>
    </div>

    <h3>🔔 Cosa Succede Ora?</h3>
    <ul>
      <li>L'host riceverà una notifica della tua richiesta</li>
      <li>Ti invieremo un'email appena l'host risponde</li>
      <li>Se approvata, procederemo con il pagamento</li>
      <li>Riceverai tutti i dettagli per il tuo arrivo</li>
    </ul>

    <p style="text-align: center;">
      <a href="https://workover.it.com/bookings" class="button">Visualizza Richiesta</a>
    </p>

    <p>Grazie per la pazienza!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `⏳ Richiesta Inviata - ${data.spaceTitle}`,
    html: createBaseTemplate(content)
  };
};

export const bookingCancelledTemplate = (data: {
  userName: string;
  spaceTitle: string;
  bookingDate: string;
  reason?: string;
  cancellationFee: number;
  refundAmount: number;
  currency: string;
  bookingId: string;
  cancelledByHost: boolean;
}): EmailTemplate => {
  const content = createHeader(
    '❌ Prenotazione Cancellata',
    data.cancelledByHost ? 'Cancellata dall\'host' : 'Cancellazione confermata'
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>${data.cancelledByHost 
      ? 'Ci dispiace informarti che l\'host ha dovuto cancellare la tua prenotazione.' 
      : 'La tua richiesta di cancellazione è stata elaborata.'}</p>
    
    <div class="info-box error">
      <h3 style="margin-bottom: 12px; color: #991b1b;">📋 Dettagli Cancellazione</h3>
      <div class="details-table">
        <table>
          <tr><td>Spazio:</td><td><strong>${data.spaceTitle}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.bookingDate}</strong></td></tr>
          <tr><td>ID:</td><td><strong>#${data.bookingId}</strong></td></tr>
          ${data.reason ? `<tr><td>Motivo:</td><td>${data.reason}</td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="info-box ${data.refundAmount > 0 ? 'success' : 'warning'}">
      <h3 style="margin-bottom: 12px; color: ${data.refundAmount > 0 ? '#065f46' : '#92400e'};">💰 Dettagli Rimborso</h3>
      <div class="details-table">
        <table>
          ${data.cancellationFee > 0 ? `<tr><td>Penale:</td><td><strong>€${data.cancellationFee.toFixed(2)}</strong></td></tr>` : ''}
          <tr><td>Rimborso:</td><td><strong>€${data.refundAmount.toFixed(2)} ${data.currency.toUpperCase()}</strong></td></tr>
        </table>
      </div>
      ${data.refundAmount > 0 ? `
        <p style="margin: 12px 0 0 0; color: #065f46;">
          💳 Il rimborso verrà elaborato entro 3-5 giorni lavorativi sul metodo di pagamento originale.
        </p>
      ` : ''}
    </div>

    ${data.cancelledByHost ? `
      <h3>🎁 Come Scusa</h3>
      <p>Comprendiamo la tua delusione. Esplora altri spazi simili nella tua zona:</p>
      <p style="text-align: center;">
        <a href="https://workover.it.com/spaces" class="button">Trova Altri Spazi</a>
      </p>
    ` : ''}

    <p>Per qualsiasi domanda, non esitare a contattarci.</p>
    <p><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `❌ Prenotazione Cancellata - ${data.spaceTitle}`,
    html: createBaseTemplate(content)
  };
};

export const bookingReminderTemplate = (data: {
  userName: string;
  spaceTitle: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  spaceAddress: string;
  hostName: string;
  hostPhone?: string;
  checkInInstructions?: string;
  bookingId: string;
}): EmailTemplate => {
  const content = createHeader(
    '⏰ Promemoria Prenotazione',
    'La tua sessione inizia domani!'
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Ti ricordiamo che la tua sessione di coworking inizia domani. Ecco tutti i dettagli:</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">📋 Dettagli Sessione</h3>
      <div class="details-table">
        <table>
          <tr><td>Spazio:</td><td><strong>${data.spaceTitle}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.bookingDate}</strong></td></tr>
          <tr><td>Orario:</td><td><strong>${data.startTime} - ${data.endTime}</strong></td></tr>
          <tr><td>Indirizzo:</td><td><strong>${data.spaceAddress}</strong></td></tr>
          <tr><td>Host:</td><td><strong>${data.hostName}</strong></td></tr>
          ${data.hostPhone ? `<tr><td>Telefono:</td><td><strong>${data.hostPhone}</strong></td></tr>` : ''}
        </table>
      </div>
    </div>

    ${data.checkInInstructions ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">🔑 Istruzioni Check-in</h3>
        <p style="margin: 0;">${data.checkInInstructions}</p>
      </div>
    ` : ''}

    <h3>✅ Checklist Pre-Arrivo</h3>
    <ul>
      <li>📱 Salva il numero dell'host: ${data.hostPhone || 'Disponibile nell\'app'}</li>
      <li>🗺️ Controlla il percorso e calcola i tempi di viaggio</li>
      <li>🆔 Porta un documento di identità</li>
      <li>💻 Prepara tutto il necessario per lavorare</li>
      <li>☕ Controlla se lo spazio offre caffè o portalo con te</li>
    </ul>

    <p style="text-align: center;">
      <a href="https://workover.it.com/bookings/${data.bookingId}" class="button">Visualizza Prenotazione</a>
    </p>

    <p>Buona giornata di lavoro!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `⏰ Promemoria: ${data.spaceTitle} - Domani alle ${data.startTime}`,
    html: createBaseTemplate(content)
  };
};