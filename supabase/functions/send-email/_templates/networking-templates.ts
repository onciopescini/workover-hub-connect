import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const connectionRequestTemplate = (data: {
  receiverName: string;
  senderName: string;
  senderTitle?: string;
  senderCompany?: string;
  senderBio?: string;
  connectionReason?: string;
  sharedSpaces?: string[];
  profileUrl: string;
  senderProfilePhoto?: string;
}): EmailTemplate => {
  const content = createHeader(
    '🤝 Nuova Richiesta di Connessione',
    `${data.senderName} vuole connettersi con te`
  ) + createContent(`
    <p>Ciao ${data.receiverName},</p>
    <p>Hai ricevuto una nuova richiesta di connessione su Workover!</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">👤 Profilo del Richiedente</h3>
      <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
        ${data.senderProfilePhoto ? `
          <img src="${data.senderProfilePhoto}" alt="${data.senderName}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
        ` : ''}
        <div>
          <h4 style="margin: 0 0 4px 0; color: #1f2937;">${data.senderName}</h4>
          ${data.senderTitle ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${data.senderTitle}</p>` : ''}
          ${data.senderCompany ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${data.senderCompany}</p>` : ''}
        </div>
      </div>
      ${data.senderBio ? `<p style="margin: 12px 0 0 0; font-style: italic; color: #4b5563;">"${data.senderBio}"</p>` : ''}
    </div>

    ${data.connectionReason ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">💬 Motivo della Connessione</h3>
        <p style="margin: 0; font-style: italic;">"${data.connectionReason}"</p>
      </div>
    ` : ''}

    ${data.sharedSpaces && data.sharedSpaces.length > 0 ? `
      <div class="info-box success">
        <h3 style="margin-bottom: 12px; color: #065f46;">🏢 Spazi in Comune</h3>
        <p style="margin: 0;">Avete entrambi utilizzato questi spazi:</p>
        <ul style="margin: 8px 0 0 0;">
          ${data.sharedSpaces.map(space => `<li>${space}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <h3>🌟 Vantaggi delle Connessioni</h3>
    <ul>
      <li>Espandi la tua rete professionale</li>
      <li>Scopri nuove opportunità di collaborazione</li>
      <li>Condividi esperienze e consigli</li>
      <li>Accedi a eventi esclusivi per la community</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.profileUrl}/accept" class="button success" style="margin-right: 12px;">✅ Accetta</a>
      <a href="${data.profileUrl}" class="button">👀 Visualizza Profilo</a>
    </div>

    <div style="text-align: center; margin: 16px 0;">
      <a href="${data.profileUrl}/decline" style="color: #6b7280; text-decoration: none; font-size: 14px;">Rifiuta la richiesta</a>
    </div>

    <p>Buona connessione!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🤝 ${data.senderName} vuole connettersi con te`,
    html: createBaseTemplate(content)
  };
};

export const connectionAcceptedTemplate = (data: {
  senderName: string;
  receiverName: string;
  receiverTitle?: string;
  receiverCompany?: string;
  chatUrl: string;
  profileUrl: string;
  suggestedSpaces?: string[];
}): EmailTemplate => {
  const content = createHeader(
    '🎉 Connessione Accettata!',
    `${data.receiverName} ha accettato la tua richiesta`
  ) + createContent(`
    <p>Ciao ${data.senderName},</p>
    <p>Ottime notizie! ${data.receiverName} ha accettato la tua richiesta di connessione.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">✅ Nuova Connessione</h3>
      <p style="margin: 0;">
        Ora sei connesso con <strong>${data.receiverName}</strong>
        ${data.receiverTitle ? `, ${data.receiverTitle}` : ''}
        ${data.receiverCompany ? ` presso ${data.receiverCompany}` : ''}.
      </p>
    </div>

    <h3>🚀 Cosa Puoi Fare Ora</h3>
    <ul>
      <li>Inviare messaggi privati</li>
      <li>Visualizzare il profilo completo</li>
      <li>Proporre collaborazioni</li>
      <li>Condividere opportunità di lavoro</li>
      <li>Organizzare incontri negli spazi di coworking</li>
    </ul>

    ${data.suggestedSpaces && data.suggestedSpaces.length > 0 ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">🏢 Spazi Consigliati per Incontrarvi</h3>
        <ul style="margin: 0;">
          ${data.suggestedSpaces.map(space => `<li>${space}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.chatUrl}" class="button" style="margin-right: 12px;">💬 Invia Messaggio</a>
      <a href="${data.profileUrl}" class="button success">👤 Visualizza Profilo</a>
    </div>

    <p>Buona collaborazione!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🎉 ${data.receiverName} ha accettato la tua connessione!`,
    html: createBaseTemplate(content)
  };
};

export const networkingDigestTemplate = (data: {
  userName: string;
  newConnections: number;
  pendingRequests: number;
  suggestedConnections: Array<{
    name: string;
    title?: string;
    company?: string;
    reason: string;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
  }>;
  weekPeriod: string;
}): EmailTemplate => {
  const content = createHeader(
    '📊 Il Tuo Recap Networking',
    `Settimana del ${data.weekPeriod}`
  ) + createContent(`
    <p>Ciao ${data.userName},</p>
    <p>Ecco un riepilogo della tua attività di networking questa settimana.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">📈 I Tuoi Numeri</h3>
      <div class="details-table">
        <table>
          <tr><td>Nuove Connessioni:</td><td><strong>${data.newConnections}</strong></td></tr>
          <tr><td>Richieste in Sospeso:</td><td><strong>${data.pendingRequests}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.suggestedConnections.length > 0 ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">💡 Connessioni Suggerite</h3>
        <p>Questi professionisti potrebbero interessarti:</p>
        ${data.suggestedConnections.map(suggestion => `
          <div style="border-left: 3px solid #3b82f6; padding: 8px 12px; margin: 8px 0; background: #f8fafc;">
            <h4 style="margin: 0 0 4px 0; color: #1f2937;">${suggestion.name}</h4>
            ${suggestion.title ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${suggestion.title}</p>` : ''}
            ${suggestion.company ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${suggestion.company}</p>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 14px; font-style: italic; color: #4b5563;">${suggestion.reason}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${data.recentActivity.length > 0 ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">🎯 Attività Recente</h3>
        ${data.recentActivity.map(activity => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span>${activity.description}</span>
            <span style="color: #6b7280; font-size: 14px;">${activity.date}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <h3>🚀 Suggerimenti per Crescere</h3>
    <ul>
      <li>Completa il tuo profilo professionale al 100%</li>
      <li>Condividi i tuoi progetti e competenze</li>
      <li>Partecipa agli eventi della community</li>
      <li>Lascia recensioni agli spazi che utilizzi</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.it.com/networking" class="button">🤝 Esplora Connessioni</a>
    </div>

    <p>Continua a costruire la tua rete!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `📊 Il tuo recap networking - Settimana del ${data.weekPeriod}`,
    html: createBaseTemplate(content)
  };
};

export const collaborationInviteTemplate = (data: {
  receiverName: string;
  senderName: string;
  projectTitle: string;
  projectDescription: string;
  skillsNeeded: string[];
  duration?: string;
  compensation?: string;
  meetingLocation?: string;
  deadline?: string;
  responseUrl: string;
}): EmailTemplate => {
  const content = createHeader(
    '🚀 Invito a Collaborare',
    `${data.senderName} ti ha invitato a un progetto`
  ) + createContent(`
    <p>Ciao ${data.receiverName},</p>
    <p>${data.senderName} ti ha invitato a collaborare a un progetto interessante!</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">📋 Dettagli Progetto</h3>
      <h4 style="margin: 0 0 8px 0; color: #1f2937;">${data.projectTitle}</h4>
      <p style="margin: 0;">${data.projectDescription}</p>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">🎯 Competenze Richieste</h3>
      <div style="margin: 8px 0;">
        ${data.skillsNeeded.map(skill => `
          <span style="display: inline-block; background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px;">
            ${skill}
          </span>
        `).join('')}
      </div>
    </div>

    <div class="details-table">
      <table>
        ${data.duration ? `<tr><td>Durata:</td><td><strong>${data.duration}</strong></td></tr>` : ''}
        ${data.compensation ? `<tr><td>Compenso:</td><td><strong>${data.compensation}</strong></td></tr>` : ''}
        ${data.meetingLocation ? `<tr><td>Luogo Incontri:</td><td><strong>${data.meetingLocation}</strong></td></tr>` : ''}
        ${data.deadline ? `<tr><td>Scadenza:</td><td><strong>${data.deadline}</strong></td></tr>` : ''}
      </table>
    </div>

    <h3>✨ Vantaggi della Collaborazione</h3>
    <ul>
      <li>Amplia il tuo portfolio professionale</li>
      <li>Impara nuove competenze e tecnologie</li>
      <li>Costruisci relazioni durature</li>
      <li>Accedi a nuove opportunità di business</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.responseUrl}/accept" class="button success" style="margin-right: 12px;">✅ Accetto</a>
      <a href="${data.responseUrl}/details" class="button" style="margin-right: 12px;">📋 Dettagli</a>
      <a href="${data.responseUrl}/decline" class="button warning">❌ Declino</a>
    </div>

    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">⏰ Tempo per Rispondere</h3>
      <p style="margin: 0;">Ti consigliamo di rispondere entro 7 giorni per non perdere questa opportunità.</p>
    </div>

    <p>Buona collaborazione!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🚀 Invito Collaborazione: ${data.projectTitle} da ${data.senderName}`,
    html: createBaseTemplate(content)
  };
};