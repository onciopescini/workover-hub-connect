import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const reviewReceivedTemplate = (data: {
  recipientName: string;
  reviewerName: string;
  reviewerTitle?: string;
  rating: number;
  comment?: string;
  reviewType: 'space' | 'booking' | 'host' | 'coworker';
  subjectTitle: string; // Nome dello spazio o del coworker/host
  bookingDate?: string;
  reviewUrl: string;
  canReply: boolean;
}): EmailTemplate => {
  const getStars = (rating: number) => '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  
  const typeLabels = {
    space: 'spazio',
    booking: 'prenotazione',
    host: 'host',
    coworker: 'coworker'
  };

  const content = createHeader(
    '⭐ Nuova Recensione Ricevuta!',
    `${data.reviewerName} ha lasciato una recensione`
  ) + createContent(`
    <p>Ciao ${data.recipientName},</p>
    <p>Hai ricevuto una nuova recensione da ${data.reviewerName}!</p>
    
    <div class="info-box ${data.rating >= 4 ? 'success' : data.rating >= 3 ? '' : 'warning'}">
      <h3 style="margin-bottom: 12px; color: ${data.rating >= 4 ? '#065f46' : data.rating >= 3 ? '#1f2937' : '#92400e'};">
        ⭐ Valutazione Ricevuta
      </h3>
      <div class="details-table">
        <table>
          <tr><td>Recensore:</td><td><strong>${data.reviewerName}</strong></td></tr>
          ${data.reviewerTitle ? `<tr><td>Ruolo:</td><td>${data.reviewerTitle}</td></tr>` : ''}
          <tr><td>Oggetto:</td><td><strong>${data.subjectTitle}</strong></td></tr>
          <tr><td>Tipo:</td><td>${typeLabels[data.reviewType]}</td></tr>
          <tr><td>Valutazione:</td><td><strong>${getStars(data.rating)} (${data.rating}/5)</strong></td></tr>
          ${data.bookingDate ? `<tr><td>Data:</td><td>${data.bookingDate}</td></tr>` : ''}
        </table>
      </div>
    </div>

    ${data.comment ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">💬 Commento</h3>
        <p style="margin: 0; font-style: italic; padding: 12px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #3b82f6;">
          "${data.comment}"
        </p>
      </div>
    ` : ''}

    ${data.rating >= 4 ? `
      <div class="info-box success">
        <h3 style="margin-bottom: 12px; color: #065f46;">🎉 Eccellente Lavoro!</h3>
        <p style="margin: 0;">Complimenti! Questa recensione positiva aiuterà ad aumentare la tua reputazione sulla piattaforma.</p>
      </div>
    ` : data.rating === 3 ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">👍 Buona Recensione</h3>
        <p style="margin: 0;">Una valutazione solida! Considera i feedback per migliorare ancora di più.</p>
      </div>
    ` : `
      <div class="info-box warning">
        <h3 style="margin-bottom: 12px; color: #92400e;">🔧 Opportunità di Miglioramento</h3>
        <p style="margin: 0;">Prendi questo feedback come un'opportunità per migliorare. Considera di rispondere professionalmente per chiarire eventuali malintesi.</p>
      </div>
    `}

    <h3>💡 Suggerimenti per le Recensioni</h3>
    <ul>
      <li>Le recensioni positive aumentano la tua visibilità</li>
      <li>Rispondi sempre in modo professionale</li>
      <li>Usa i feedback costruttivi per migliorare</li>
      <li>Ringrazia per le recensioni positive</li>
      <li>Mantieni un rating alto per più opportunità</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.reviewUrl}" class="button" style="margin-right: 12px;">👀 Visualizza Recensione</a>
      ${data.canReply ? `<a href="${data.reviewUrl}/reply" class="button success">📝 Rispondi</a>` : ''}
    </div>

    <p>Continua così!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `⭐ Nuova recensione da ${data.reviewerName} - ${data.rating}/5 stelle`,
    html: createBaseTemplate(content)
  };
};

export const reviewReminderTemplate = (data: {
  userName: string;
  subjectType: 'space' | 'host' | 'coworker';
  subjectName: string;
  experienceDate: string;
  reviewUrl: string;
  incentive?: string;
}): EmailTemplate => {
  const subjectLabels = {
    space: 'lo spazio',
    host: "l'host",
    coworker: 'il coworker'
  };

  const content = createHeader(
    '📝 Lascia una Recensione',
    `Com'è andata la tua esperienza con ${subjectLabels[data.subjectType]} ${data.subjectName}?`
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Speriamo che tu abbia avuto un'ottima esperienza! Ci piacerebbe conoscere la tua opinione.</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📅 La Tua Esperienza</h3>
      <div class="details-table">
        <table>
          <tr><td>Data:</td><td><strong>${data.experienceDate}</strong></td></tr>
          <tr><td>${data.subjectType === 'space' ? 'Spazio' : data.subjectType === 'host' ? 'Host' : 'Coworker'}:</td><td><strong>${data.subjectName}</strong></td></tr>
        </table>
      </div>
    </div>

    <h3>⭐ Perché Lasciare una Recensione?</h3>
    <ul>
      <li>Aiuti altri coworker a scegliere meglio</li>
      <li>Contribuisci a migliorare la qualità della piattaforma</li>
      <li>Permetti ${data.subjectType === 'space' ? 'agli host' : data.subjectType === 'host' ? "all'host" : 'al coworker'} di migliorare</li>
      <li>Costruisci la tua reputazione nella community</li>
      ${data.incentive ? `<li>${data.incentive}</li>` : ''}
    </ul>

    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">🚀 È Veloce e Semplice</h3>
      <p style="margin: 0;">Bastano 2 minuti: scegli da 1 a 5 stelle e aggiungi un commento opzionale per aiutare la community.</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.reviewUrl}" class="button success">⭐ Lascia Recensione</a>
    </div>

    <div style="text-align: center; margin: 16px 0;">
      <p style="font-size: 14px; color: #6b7280;">
        Grazie per essere parte della community Workover!
      </p>
    </div>

    <p><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `📝 Lascia una recensione per ${data.subjectName}`,
    html: createBaseTemplate(content)
  };
};

export const reviewResponseTemplate = (data: {
  reviewerName: string;
  respondentName: string;
  respondentType: 'host' | 'coworker';
  originalRating: number;
  originalComment?: string;
  response: string;
  subjectTitle: string;
  reviewUrl: string;
}): EmailTemplate => {
  const getStars = (rating: number) => '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

  const content = createHeader(
    '💬 Risposta alla Tua Recensione',
    `${data.respondentName} ha risposto alla tua recensione`
  ) + createContent(`
    <p>Ciao ${data.reviewerName},</p>
    <p>${data.respondentName} ha risposto alla recensione che hai lasciato per "${data.subjectTitle}".</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📝 La Tua Recensione Originale</h3>
      <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin: 8px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Valutazione:</strong> ${getStars(data.originalRating)} (${data.originalRating}/5)</p>
        ${data.originalComment ? `<p style="margin: 0; font-style: italic;">"${data.originalComment}"</p>` : ''}
      </div>
    </div>

    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">💬 Risposta ${data.respondentType === 'host' ? "dell'Host" : 'del Coworker'}</h3>
      <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #10b981; margin: 8px 0;">
        <p style="margin: 0 0 8px 0;"><strong>${data.respondentName}:</strong></p>
        <p style="margin: 0; font-style: italic;">"${data.response}"</p>
      </div>
    </div>

    <h3>🤝 Dialogo Costruttivo</h3>
    <p>È fantastico vedere questo tipo di comunicazione nella nostra community! Il dialogo aperto aiuta tutti a:</p>
    <ul>
      <li>Migliorare la qualità del servizio</li>
      <li>Chiarire eventuali malintesi</li>
      <li>Costruire relazioni professionali durature</li>
      <li>Creare un ambiente di lavoro più collaborativo</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.reviewUrl}" class="button">👀 Visualizza Conversazione</a>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">💡 Suggerimento</h3>
      <p style="margin: 0;">Se hai apprezzato la risposta, considera di aggiornare la tua recensione o di lasciarne una nuova in futuro per riflettere il miglioramento del servizio.</p>
    </div>

    <p>Grazie per il tuo contributo alla community!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `💬 ${data.respondentName} ha risposto alla tua recensione`,
    html: createBaseTemplate(content)
  };
};

export const reviewMilestoneTemplate = (data: {
  userName: string;
  milestone: 'first_review' | '5_reviews' | '10_reviews' | '25_reviews' | '50_reviews' | '100_reviews';
  totalReviews: number;
  averageRating: number;
  userType: 'host' | 'coworker';
  profileUrl: string;
  badgeEarned?: string;
}): EmailTemplate => {
  const milestoneMessages = {
    first_review: 'Prima Recensione',
    '5_reviews': '5 Recensioni',
    '10_reviews': '10 Recensioni', 
    '25_reviews': '25 Recensioni',
    '50_reviews': '50 Recensioni',
    '100_reviews': '100 Recensioni'
  };

  const milestoneDescriptions = {
    first_review: 'Hai ricevuto la tua prima recensione! Un traguardo importante per iniziare a costruire la tua reputazione.',
    '5_reviews': 'Hai raggiunto 5 recensioni! La tua reputazione sta crescendo.',
    '10_reviews': 'Ben 10 recensioni! Sei sulla buona strada per diventare un membro rispettato della community.',
    '25_reviews': '25 recensioni è un traguardo eccellente! La community si fida di te.',
    '50_reviews': 'Congratulazioni per le 50 recensioni! Sei un veterano della piattaforma.',
    '100_reviews': 'Incredibili 100 recensioni! Sei una leggenda di Workover!'
  };

  const getStars = (rating: number) => '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '✨' : '') + '☆'.repeat(5 - Math.ceil(rating));

  const content = createHeader(
    `🏆 Traguardo Raggiunto: ${milestoneMessages[data.milestone]}!`,
    'Complimenti per questo importante risultato'
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Abbiamo una fantastica notizia da condividere con te!</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">🎉 Traguardo Raggiunto</h3>
      <div style="text-align: center; margin: 16px 0;">
        <div style="font-size: 48px; margin-bottom: 8px;">🏆</div>
        <h2 style="margin: 0; color: #065f46;">${milestoneMessages[data.milestone]}</h2>
      </div>
      <p style="margin: 16px 0 0 0; text-align: center;">${milestoneDescriptions[data.milestone]}</p>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📊 Le Tue Statistiche</h3>
      <div class="details-table">
        <table>
          <tr><td>Recensioni Totali:</td><td><strong>${data.totalReviews}</strong></td></tr>
          <tr><td>Rating Medio:</td><td><strong>${getStars(data.averageRating)} (${data.averageRating.toFixed(1)}/5)</strong></td></tr>
          <tr><td>Ruolo:</td><td><strong>${data.userType === 'host' ? 'Host' : 'Coworker'}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.badgeEarned ? `
      <div class="info-box success">
        <h3 style="margin-bottom: 12px; color: #065f46;">🏅 Nuovo Badge Sbloccato!</h3>
        <div style="text-align: center; margin: 12px 0;">
          <div style="display: inline-block; background: #065f46; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
            🏅 ${data.badgeEarned}
          </div>
        </div>
        <p style="margin: 12px 0 0 0; text-align: center;">Questo badge apparirà sul tuo profilo!</p>
      </div>
    ` : ''}

    <h3>🚀 Benefici del Tuo Status</h3>
    <ul>
      <li>Maggiore visibilità nei risultati di ricerca</li>
      <li>Più fiducia da parte di ${data.userType === 'host' ? 'coworker' : 'host e spazi'}</li>
      <li>Accesso prioritario a funzionalità premium</li>
      <li>Riconoscimento nella community</li>
      <li>Opportunità di partnership esclusive</li>
    </ul>

    <h3>💡 Come Continuare a Crescere</h3>
    <ul>
      <li>Mantieni sempre alta la qualità del tuo servizio</li>
      <li>Rispondi rapidamente a messaggi e richieste</li>
      <li>Chiedi feedback per migliorare continuamente</li>
      <li>Partecipa attivamente nella community</li>
      <li>Condividi la tua esperienza con altri utenti</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.profileUrl}" class="button success">🎉 Visualizza Profilo</a>
    </div>

    <div style="text-align: center; background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-style: italic; color: #1e40af;">
        "La qualità del tuo lavoro parla da sola. Continua così!"
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
        - Il Team Workover
      </p>
    </div>

    <p>Sei un esempio per tutta la community!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🏆 Complimenti! Hai raggiunto ${milestoneMessages[data.milestone]}`,
    html: createBaseTemplate(content)
  };
};