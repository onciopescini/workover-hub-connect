import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const newBookingRequestTemplate = (data: {
  hostName: string;
  guestName: string;
  guestProfile?: string;
  spaceTitle: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
  message?: string;
  bookingId: string;
  guestPhone?: string;
  estimatedEarnings: number;
  currency: string;
}): EmailTemplate => {
  const content = createHeader(
    '🔔 Nuova Richiesta di Prenotazione!',
    'Un coworker vuole prenotare il tuo spazio'
  ) + createContent(`
    <p>Ciao ${data.hostName},</p>
    <p>Hai ricevuto una nuova richiesta di prenotazione per il tuo spazio. Rispondi entro 24 ore per non perdere l'opportunità!</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">👤 Dettagli Ospite</h3>
      <div class="details-table">
        <table>
          <tr><td>Nome:</td><td><strong>${data.guestName}</strong></td></tr>
          ${data.guestPhone ? `<tr><td>Telefono:</td><td><strong>${data.guestPhone}</strong></td></tr>` : ''}
          ${data.guestProfile ? `<tr><td>Profilo:</td><td>${data.guestProfile}</td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">📋 Dettagli Prenotazione</h3>
      <div class="details-table">
        <table>
          <tr><td>Spazio:</td><td><strong>${data.spaceTitle}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.bookingDate}</strong></td></tr>
          <tr><td>Orario:</td><td><strong>${data.startTime} - ${data.endTime}</strong></td></tr>
          <tr><td>Ospiti:</td><td><strong>${data.guestsCount} ${data.guestsCount === 1 ? 'persona' : 'persone'}</strong></td></tr>
          <tr><td>Guadagno:</td><td><strong>€${data.estimatedEarnings.toFixed(2)} ${data.currency.toUpperCase()}</strong></td></tr>
          <tr><td>ID:</td><td><strong>#${data.bookingId}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.message ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">💬 Messaggio dall'Ospite</h3>
        <p style="margin: 0; font-style: italic;">"${data.message}"</p>
      </div>
    ` : ''}

    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">⏰ Azione Richiesta</h3>
      <p style="margin: 0;">Hai <strong>24 ore</strong> per rispondere a questa richiesta. Dopo questo tempo, la richiesta scadrà automaticamente.</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.it.com/host/bookings/${data.bookingId}/approve" class="button success" style="margin-right: 12px;">✅ Approva</a>
      <a href="https://workover.it.com/host/bookings/${data.bookingId}/decline" class="button danger">❌ Rifiuta</a>
    </div>

    <h3>💡 Suggerimenti per Host</h3>
    <ul>
      <li>Controlla il profilo dell'ospite per conoscerlo meglio</li>
      <li>Rispondi rapidamente per migliorare il tuo rating</li>
      <li>Comunica eventuali regole speciali del tuo spazio</li>
      <li>Prepara lo spazio per l'arrivo dell'ospite</li>
    </ul>

    <p><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🔔 Nuova Richiesta: ${data.guestName} - ${data.spaceTitle}`,
    html: createBaseTemplate(content)
  };
};

export const hostPayoutProcessedTemplate = (data: {
  hostName: string;
  amount: number;
  currency: string;
  bookingCount: number;
  periodStart: string;
  periodEnd: string;
  payoutId: string;
  accountLast4?: string;
}): EmailTemplate => {
  const content = createHeader(
    '💰 Pagamento Elaborato!',
    'Il tuo guadagno è in arrivo'
  ) + createContent(`
    <p>Ciao ${data.hostName},</p>
    <p>Ottime notizie! Abbiamo elaborato il tuo pagamento per le prenotazioni del periodo selezionato.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">💰 Dettagli Pagamento</h3>
      <div class="details-table">
        <table>
          <tr><td>Importo:</td><td><strong>€${data.amount.toFixed(2)} ${data.currency.toUpperCase()}</strong></td></tr>
          <tr><td>Periodo:</td><td><strong>${data.periodStart} - ${data.periodEnd}</strong></td></tr>
          <tr><td>Prenotazioni:</td><td><strong>${data.bookingCount} prenotazioni</strong></td></tr>
          <tr><td>ID Pagamento:</td><td><strong>#${data.payoutId}</strong></td></tr>
          ${data.accountLast4 ? `<tr><td>Conto:</td><td><strong>****${data.accountLast4}</strong></td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">⏰ Tempi di Accredito</h3>
      <p style="margin: 0;">Il pagamento verrà accreditato sul tuo conto entro <strong>1-2 giorni lavorativi</strong> da oggi.</p>
    </div>

    <h3>📊 Il Tuo Business</h3>
    <p>Congratulazioni per il successo! Ecco alcuni suggerimenti per continuare a crescere:</p>
    <ul>
      <li>Mantieni il tuo spazio sempre pulito e accogliente</li>
      <li>Rispondi rapidamente alle richieste di prenotazione</li>
      <li>Chiedi feedback ai tuoi ospiti per migliorare</li>
      <li>Considera di aggiungere nuovi servizi o comfort</li>
    </ul>

    <p style="text-align: center;">
      <a href="https://workover.it.com/host/earnings" class="button">Visualizza Guadagni</a>
    </p>

    <p>Continua così!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `💰 Pagamento Elaborato - €${data.amount.toFixed(2)}`,
    html: createBaseTemplate(content)
  };
};

export const spaceApprovedTemplate = (data: {
  hostName: string;
  spaceTitle: string;
  spaceId: string;
  adminNotes?: string;
}): EmailTemplate => {
  const content = createHeader(
    '🎉 Spazio Approvato!',
    'Il tuo spazio è ora pubblico'
  ) + createContent(`
    <p>Ciao ${data.hostName},</p>
    <p>Eccellenti notizie! Il tuo spazio "${data.spaceTitle}" è stato approvato ed è ora visibile a tutti i coworker sulla piattaforma.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">✅ Spazio Pubblicato</h3>
      <p style="margin: 0;"><strong>${data.spaceTitle}</strong> è ora disponibile per le prenotazioni!</p>
    </div>

    ${data.adminNotes ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">📝 Note di Approvazione</h3>
        <p style="margin: 0;">${data.adminNotes}</p>
      </div>
    ` : ''}

    <h3>🚀 Prossimi Passi</h3>
    <ul>
      <li>Il tuo spazio è ora visibile nei risultati di ricerca</li>
      <li>Inizierai a ricevere richieste di prenotazione</li>
      <li>Rispondi entro 24 ore per mantenere un buon rating</li>
      <li>Tieni aggiornate le disponibilità del tuo spazio</li>
    </ul>

    <h3>💡 Suggerimenti per il Successo</h3>
    <ul>
      <li>Aggiungi foto di alta qualità del tuo spazio</li>
      <li>Scrivi una descrizione dettagliata e accogliente</li>
      <li>Imposta prezzi competitivi per la tua zona</li>
      <li>Mantieni sempre pulito e ordinato lo spazio</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.it.com/spaces/${data.spaceId}" class="button" style="margin-right: 12px;">Visualizza Spazio</a>
      <a href="https://workover.it.com/host/spaces" class="button success">Gestisci Spazi</a>
    </div>

    <p>Buona fortuna con il tuo business!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🎉 "${data.spaceTitle}" è stato approvato!`,
    html: createBaseTemplate(content)
  };
};

export const spaceRejectedTemplate = (data: {
  hostName: string;
  spaceTitle: string;
  rejectionReason: string;
  canResubmit: boolean;
  spaceId: string;
}): EmailTemplate => {
  const content = createHeader(
    '❌ Spazio Non Approvato',
    'Il tuo spazio necessita di alcune modifiche'
  ) + createContent(`
    <p>Ciao ${data.hostName},</p>
    <p>Abbiamo revisionato il tuo spazio "${data.spaceTitle}" ma sfortunatamente non possiamo approvarlo nella forma attuale.</p>
    
    <div class="info-box error">
      <h3 style="margin-bottom: 12px; color: #991b1b;">📝 Motivo del Rifiuto</h3>
      <p style="margin: 0;">${data.rejectionReason}</p>
    </div>

    ${data.canResubmit ? `
      <div class="info-box success">
        <h3 style="margin-bottom: 12px; color: #065f46;">🔄 Puoi Riprovare!</h3>
        <p style="margin: 0;">Apporta le modifiche richieste e riinvia il tuo spazio per una nuova revisione.</p>
      </div>

      <h3>✅ Cosa Fare Ora</h3>
      <ul>
        <li>Leggi attentamente il motivo del rifiuto</li>
        <li>Apporta le modifiche necessarie al tuo spazio</li>
        <li>Riinvia lo spazio per una nuova revisione</li>
        <li>Assicurati di rispettare tutte le linee guida</li>
      </ul>

      <p style="text-align: center;">
        <a href="https://workover.it.com/host/spaces/${data.spaceId}/edit" class="button">Modifica Spazio</a>
      </p>
    ` : `
      <div class="info-box warning">
        <h3 style="margin-bottom: 12px; color: #92400e;">⚠️ Contatta il Supporto</h3>
        <p style="margin: 0;">Per questo tipo di problema, ti consigliamo di contattare il nostro team di supporto per ricevere assistenza.</p>
      </div>

      <p style="text-align: center;">
        <a href="https://workover.it.com/support" class="button">Contatta Supporto</a>
      </p>
    `}

    <h3>📖 Risorse Utili</h3>
    <ul>
      <li><a href="https://workover.it.com/help/host-guidelines">Linee Guida per Host</a></li>
      <li><a href="https://workover.it.com/help/space-quality">Standard di Qualità degli Spazi</a></li>
      <li><a href="https://workover.it.com/help/photo-tips">Consigli per Foto Professionali</a></li>
    </ul>

    <p>Siamo qui per aiutarti ad avere successo!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `❌ "${data.spaceTitle}" non è stato approvato`,
    html: createBaseTemplate(content)
  };
};