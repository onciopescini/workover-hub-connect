import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const welcomeTemplate = (data: {
  firstName: string;
  lastName: string;
  userType: 'coworker' | 'host';
  activationUrl?: string;
}): EmailTemplate => {
  const content = createHeader(
    `🎉 Benvenuto in Workover, ${data.firstName}!`,
    'Inizia la tua avventura nel coworking professionale'
  ) + createContent(`
    <p>Ciao ${data.firstName},</p>
    <p>Benvenuto nella community di Workover! Siamo entusiasti di averti con noi nella rivoluzione del lavoro flessibile.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">🚀 Il Tuo Account è Pronto!</h3>
      <p style="margin: 0;">Hai creato con successo il tuo account ${data.userType === 'host' ? 'host' : 'coworker'}. Ora puoi accedere a tutte le funzionalità della piattaforma.</p>
    </div>

    ${data.userType === 'coworker' ? `
      <h3>📋 Come Coworker, Puoi:</h3>
      <ul>
        <li>🏢 Cercare e prenotare spazi di coworking in tutta Italia</li>
        <li>🤝 Connetterti con altri professionisti nella tua area</li>
        <li>⭐ Lasciare recensioni sugli spazi che utilizzi</li>
        <li>📱 Gestire tutte le tue prenotazioni dall'app</li>
        <li>💬 Comunicare direttamente con gli host</li>
      </ul>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://workover.it.com/spaces" class="button" style="margin-right: 12px;">Esplora Spazi</a>
        <a href="https://workover.it.com/profile/complete" class="button success">Completa Profilo</a>
      </div>
    ` : `
      <h3>🏢 Come Host, Puoi:</h3>
      <ul>
        <li>📍 Pubblicare i tuoi spazi di coworking</li>
        <li>💰 Guadagnare affittando postazioni e sale meeting</li>
        <li>👥 Gestire prenotazioni e comunicare con i coworker</li>
        <li>📊 Monitorare i tuoi guadagni e le performance</li>
        <li>⭐ Costruire la tua reputazione con le recensioni</li>
      </ul>

      <div class="info-box warning">
        <h3 style="margin-bottom: 12px; color: #92400e;">💳 Setup Pagamenti</h3>
        <p style="margin: 0;">Per iniziare a ricevere prenotazioni, completa la configurazione del tuo account Stripe per i pagamenti.</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://workover.it.com/host/setup" class="button" style="margin-right: 12px;">Setup Pagamenti</a>
        <a href="https://workover.it.com/host/spaces/new" class="button success">Aggiungi Spazio</a>
      </div>
    `}

    <h3>🎯 Prossimi Passi Consigliati</h3>
    <ul>
      <li>Completa il tuo profilo con foto e informazioni</li>
      <li>Esplora la piattaforma e familiarizza con le funzioni</li>
      <li>${data.userType === 'coworker' ? 'Trova il tuo primo spazio ideale' : 'Pubblica il tuo primo spazio'}</li>
      <li>Unisciti alla nostra community sui social media</li>
    </ul>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📞 Hai Bisogno di Aiuto?</h3>
      <p>Il nostro team di supporto è sempre disponibile per aiutarti:</p>
      <ul style="margin: 8px 0 0 0;">
        <li>📧 Email: <a href="mailto:support@workover.it.com">support@workover.it.com</a></li>
        <li>💬 Chat dal vivo disponibile dall'app</li>
        <li>📖 <a href="https://workover.it.com/help">Centro Assistenza</a> con guide dettagliate</li>
      </ul>
    </div>

    <p>Benvenuto nella famiglia Workover!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: `🎉 Benvenuto in Workover, ${data.firstName}!`,
    html: createBaseTemplate(content)
  };
};

export const passwordResetTemplate = (data: {
  firstName: string;
  resetUrl: string;
  expiresIn: string;
}): EmailTemplate => {
  const content = createHeader(
    '🔐 Reset Password',
    'Hai richiesto di reimpostare la tua password'
  ) + createContent(`
    <p>Ciao ${data.firstName},</p>
    <p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Workover.</p>
    
    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">⏰ Link Temporaneo</h3>
      <p style="margin: 0;">Questo link è valido per <strong>${data.expiresIn}</strong>. Dopo questo tempo dovrai richiedere un nuovo reset.</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.resetUrl}" class="button">Reimposta Password</a>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">🔒 Sicurezza</h3>
      <ul style="margin: 0;">
        <li>Non condividere mai questo link con nessuno</li>
        <li>Se non hai richiesto questo reset, ignora questa email</li>
        <li>Scegli una password sicura con almeno 8 caratteri</li>
        <li>Usa una combinazione di lettere, numeri e simboli</li>
      </ul>
    </div>

    <p>Se non hai richiesto questo reset, la tua password rimane sicura e puoi ignorare questa email.</p>
    
    <p><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: '🔐 Reset Password - Workover',
    html: createBaseTemplate(content)
  };
};

export const emailVerificationTemplate = (data: {
  firstName: string;
  verificationUrl: string;
}): EmailTemplate => {
  const content = createHeader(
    '📧 Verifica la Tua Email',
    'Un ultimo passo per completare la registrazione'
  ) + createContent(`
    <p>Ciao ${data.firstName},</p>
    <p>Grazie per esserti registrato su Workover! Per completare la configurazione del tuo account, devi verificare il tuo indirizzo email.</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">✅ Perché Verificare?</h3>
      <ul style="margin: 0;">
        <li>Proteggere il tuo account da accessi non autorizzati</li>
        <li>Ricevere notifiche importanti sulle tue prenotazioni</li>
        <li>Comunicare con host e coworker in sicurezza</li>
        <li>Accedere a tutte le funzionalità della piattaforma</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.verificationUrl}" class="button">Verifica Email</a>
    </div>

    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">⏰ Link Temporaneo</h3>
      <p style="margin: 0;">Questo link di verifica è valido per <strong>24 ore</strong>. Se scade, potrai richiedere un nuovo link dal tuo account.</p>
    </div>

    <p>Se hai problemi con la verifica, contatta il nostro supporto e ti aiuteremo immediatamente.</p>
    
    <p><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: '📧 Verifica la tua email - Workover',
    html: createBaseTemplate(content)
  };
};

export const accountSuspendedTemplate = (data: {
  firstName: string;
  reason: string;
  canAppeal: boolean;
  supportUrl: string;
  suspensionDate: string;
}): EmailTemplate => {
  const content = createHeader(
    '⚠️ Account Sospeso',
    'Il tuo account Workover è stato temporaneamente sospeso'
  ) + createContent(`
    <p>Ciao ${data.firstName},</p>
    <p>Ti scriviamo per informarti che il tuo account Workover è stato sospeso in data ${data.suspensionDate}.</p>
    
    <div class="info-box error">
      <h3 style="margin-bottom: 12px; color: #991b1b;">📝 Motivo della Sospensione</h3>
      <p style="margin: 0;">${data.reason}</p>
    </div>

    <h3>❓ Cosa Significa</h3>
    <ul>
      <li>Non puoi accedere al tuo account temporaneamente</li>
      <li>Le tue prenotazioni attive potrebbero essere cancellate</li>
      <li>I tuoi spazi (se sei host) sono stati rimossi dalle ricerche</li>
      <li>Non puoi effettuare nuove prenotazioni o pubblicare spazi</li>
    </ul>

    ${data.canAppeal ? `
      <div class="info-box success">
        <h3 style="margin-bottom: 12px; color: #065f46;">🔄 Puoi Fare Ricorso</h3>
        <p style="margin: 0;">Se ritieni che questa sospensione sia un errore, puoi presentare ricorso contattando il nostro team di supporto.</p>
      </div>

      <h3>📝 Come Fare Ricorso</h3>
      <ul>
        <li>Contatta il supporto usando il link qui sotto</li>
        <li>Spiega la tua versione dei fatti in dettaglio</li>
        <li>Fornisci eventuali prove o documentazione</li>
        <li>Attendi la revisione del nostro team (3-5 giorni lavorativi)</li>
      </ul>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.supportUrl}" class="button">Contatta Supporto</a>
      </div>
    ` : `
      <div class="info-box warning">
        <h3 style="margin-bottom: 12px; color: #92400e;">⛔ Sospensione Definitiva</h3>
        <p style="margin: 0;">Questa sospensione è definitiva e non può essere contestata. Ti invitiamo a rispettare i nostri termini di servizio in futuro.</p>
      </div>
    `}

    <h3>📖 Termini di Servizio</h3>
    <p>Ti ricordiamo che utilizzando Workover accetti di rispettare i nostri <a href="https://workover.it.com/terms">Termini di Servizio</a> e le <a href="https://workover.it.com/community-guidelines">Linee Guida della Community</a>.</p>

    <p>Ci dispiace per l'inconveniente.<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: '⚠️ Account Sospeso - Workover',
    html: createBaseTemplate(content)
  };
};

export const profileVerifiedTemplate = (data: {
  firstName: string;
  verificationBadges: string[];
  profileUrl: string;
}): EmailTemplate => {
  const content = createHeader(
    '✅ Profilo Verificato!',
    'Il tuo profilo è ora verificato'
  ) + createContent(`
    <p>Ciao ${data.firstName},</p>
    <p>Congratulazioni! Il tuo profilo Workover è stato verificato con successo. Ora avrai maggiore credibilità presso la community.</p>
    
    <div class="info-box success">
      <h3 style="margin-bottom: 12px; color: #065f46;">🏆 Badge Ottenuti</h3>
      <div style="margin: 12px 0;">
        ${data.verificationBadges.map(badge => `
          <div style="display: inline-block; background: #065f46; color: white; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px;">
            ✓ ${badge}
          </div>
        `).join('')}
      </div>
    </div>

    <h3>🎉 Vantaggi della Verifica</h3>
    <ul>
      <li>✅ Badge di verifica visibile sul tuo profilo</li>
      <li>🚀 Maggiore visibilità nei risultati di ricerca</li>
      <li>🤝 Più fiducia da parte di host e coworker</li>
      <li>⭐ Priorità nelle richieste di prenotazione</li>
      <li>💎 Accesso a spazi premium esclusivi</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.profileUrl}" class="button">Visualizza Profilo</a>
    </div>

    <h3>🔍 Mantieni la Verifica</h3>
    <p>Per mantenere il tuo status verificato:</p>
    <ul>
      <li>Mantieni aggiornate le informazioni del profilo</li>
      <li>Rispetta sempre i termini di servizio</li>
      <li>Comportati in modo professionale con la community</li>
      <li>Mantieni un rating alto nelle recensioni</li>
    </ul>

    <p>Complimenti per questo traguardo!<br><strong>Il Team Workover</strong></p>
  `);

  return {
    subject: '✅ Profilo Verificato - Workover',
    html: createBaseTemplate(content)
  };
};