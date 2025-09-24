import { createBaseTemplate, createHeader, createContent, EmailTemplate } from './base-template.ts';

export const newUserRegistrationTemplate = (data: {
  userName: string;
  userEmail: string;
  userType: 'coworker' | 'host';
  registrationDate: string;
  userLocation?: string;
  referralSource?: string;
  userId: string;
}): EmailTemplate => {
  const content = createHeader(
    '👤 Nuova Registrazione',
    'Un nuovo utente si è unito alla piattaforma'
  ) + createContent(`
    <p>Un nuovo utente si è registrato su Workover:</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">📋 Dettagli Utente</h3>
      <div class="details-table">
        <table>
          <tr><td>Nome:</td><td><strong>${data.userName}</strong></td></tr>
          <tr><td>Email:</td><td><strong>${data.userEmail}</strong></td></tr>
          <tr><td>Tipo:</td><td><strong>${data.userType === 'host' ? 'Host' : 'Coworker'}</strong></td></tr>
          <tr><td>Data:</td><td><strong>${data.registrationDate}</strong></td></tr>
          ${data.userLocation ? `<tr><td>Località:</td><td><strong>${data.userLocation}</strong></td></tr>` : ''}
          ${data.referralSource ? `<tr><td>Sorgente:</td><td><strong>${data.referralSource}</strong></td></tr>` : ''}
          <tr><td>ID:</td><td><strong>#${data.userId}</strong></td></tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.app/admin/users/${data.userId}" class="button">Visualizza Profilo</a>
    </div>

    <p><strong>Admin Panel Workover</strong></p>
  `);

  return {
    subject: `👤 Nuova Registrazione: ${data.userName} (${data.userType})`,
    html: createBaseTemplate(content, 'Admin Workover')
  };
};

export const reportSubmittedTemplate = (data: {
  reporterName: string;
  reportedUserName: string;
  reportType: string;
  reason: string;
  description?: string;
  reportId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}): EmailTemplate => {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b', 
    high: '#ef4444',
    urgent: '#991b1b'
  };

  const content = createHeader(
    '🚨 Nuova Segnalazione',
    'È stata inviata una segnalazione che richiede attenzione'
  ) + createContent(`
    <p>È stata ricevuta una nuova segnalazione che richiede revisione:</p>
    
    <div class="info-box" style="border-color: ${priorityColors[data.priority]};">
      <h3 style="margin-bottom: 12px; color: ${priorityColors[data.priority]};">📋 Dettagli Segnalazione</h3>
      <div class="details-table">
        <table>
          <tr><td>Tipo:</td><td><strong>${data.reportType}</strong></td></tr>
          <tr><td>Priorità:</td><td><strong style="color: ${priorityColors[data.priority]};">${data.priority.toUpperCase()}</strong></td></tr>
          <tr><td>Segnalato da:</td><td><strong>${data.reporterName}</strong></td></tr>
          <tr><td>Utente segnalato:</td><td><strong>${data.reportedUserName}</strong></td></tr>
          <tr><td>Motivo:</td><td><strong>${data.reason}</strong></td></tr>
          <tr><td>ID:</td><td><strong>#${data.reportId}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.description ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">📝 Descrizione</h3>
        <p style="margin: 0; font-style: italic;">"${data.description}"</p>
      </div>
    ` : ''}

    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">⏰ Azione Richiesta</h3>
      <p style="margin: 0;">
        ${data.priority === 'urgent' ? 'URGENTE: Richiede attenzione immediata!' : 
          data.priority === 'high' ? 'ALTA: Da gestire entro 24 ore' :
          data.priority === 'medium' ? 'MEDIA: Da gestire entro 48 ore' :
          'BASSA: Da gestire entro 7 giorni'
        }
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.app/admin/reports/${data.reportId}" class="button ${data.priority === 'urgent' ? 'danger' : data.priority === 'high' ? 'warning' : ''}">
        Gestisci Segnalazione
      </a>
    </div>

    <p><strong>Admin Panel Workover</strong></p>
  `);

  return {
    subject: `🚨 ${data.priority.toUpperCase()} - Segnalazione: ${data.reportType}`,
    html: createBaseTemplate(content, 'Admin Workover')
  };
};

export const systemErrorTemplate = (data: {
  errorType: string;
  errorMessage: string;
  userAgent?: string;
  userId?: string;
  affectedFeature: string;
  timestamp: string;
  errorId: string;
  stackTrace?: string;
}): EmailTemplate => {
  const content = createHeader(
    '🔴 Errore di Sistema',
    'Si è verificato un errore che richiede attenzione'
  ) + createContent(`
    <p>Si è verificato un errore di sistema che potrebbe richiedere intervento:</p>
    
    <div class="info-box error">
      <h3 style="margin-bottom: 12px; color: #991b1b;">🔴 Dettagli Errore</h3>
      <div class="details-table">
        <table>
          <tr><td>Tipo:</td><td><strong>${data.errorType}</strong></td></tr>
          <tr><td>Funzionalità:</td><td><strong>${data.affectedFeature}</strong></td></tr>
          <tr><td>Timestamp:</td><td><strong>${data.timestamp}</strong></td></tr>
          <tr><td>ID Errore:</td><td><strong>#${data.errorId}</strong></td></tr>
          ${data.userId ? `<tr><td>Utente:</td><td><strong>${data.userId}</strong></td></tr>` : ''}
          ${data.userAgent ? `<tr><td>User Agent:</td><td><strong>${data.userAgent}</strong></td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 12px; color: #1f2937;">💬 Messaggio di Errore</h3>
      <p style="margin: 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">
        ${data.errorMessage}
      </p>
    </div>

    ${data.stackTrace ? `
      <div class="info-box">
        <h3 style="margin-bottom: 12px; color: #1f2937;">🔍 Stack Trace</h3>
        <pre style="margin: 0; font-size: 11px; background: #f3f4f6; padding: 8px; border-radius: 4px; overflow-x: auto;">
${data.stackTrace}
        </pre>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.app/admin/errors/${data.errorId}" class="button danger">Visualizza Errore</a>
    </div>

    <p><strong>Sistema di Monitoraggio Workover</strong></p>
  `);

  return {
    subject: `🔴 Errore Sistema: ${data.errorType} - ${data.affectedFeature}`,
    html: createBaseTemplate(content, 'Admin Workover')
  };
};

export const highTrafficAlertTemplate = (data: {
  currentUsers: number;
  threshold: number;
  peakTime: string;
  serverLoad: number;
  responseTime: number;
}): EmailTemplate => {
  const content = createHeader(
    '📈 Alert Traffico Elevato',
    'La piattaforma sta registrando un traffico superiore alla norma'
  ) + createContent(`
    <p>La piattaforma Workover sta registrando un traffico elevato che potrebbe richiedere attenzione:</p>
    
    <div class="info-box warning">
      <h3 style="margin-bottom: 12px; color: #92400e;">📊 Metriche Attuali</h3>
      <div class="details-table">
        <table>
          <tr><td>Utenti Attivi:</td><td><strong>${data.currentUsers}</strong></td></tr>
          <tr><td>Soglia Normale:</td><td><strong>${data.threshold}</strong></td></tr>
          <tr><td>Picco Registrato:</td><td><strong>${data.peakTime}</strong></td></tr>
          <tr><td>Carico Server:</td><td><strong>${data.serverLoad}%</strong></td></tr>
          <tr><td>Tempo Risposta:</td><td><strong>${data.responseTime}ms</strong></td></tr>
        </table>
      </div>
    </div>

    <h3>🔍 Azioni Consigliate</h3>
    <ul>
      <li>Monitorare le performance del server</li>
      <li>Verificare la disponibilità dei servizi critici</li>
      <li>Controllare eventuali errori nei log</li>
      <li>Considerare l'attivazione del load balancing</li>
      <li>Informare il team di sviluppo se necessario</li>
    </ul>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.app/admin/monitoring" class="button warning">Dashboard Monitoraggio</a>
    </div>

    <p><strong>Sistema di Monitoraggio Workover</strong></p>
  `);

  return {
    subject: `📈 Alert: Traffico Elevato - ${data.currentUsers} utenti attivi`,
    html: createBaseTemplate(content, 'Admin Workover')
  };
};

export const backupCompletedTemplate = (data: {
  backupType: string;
  backupSize: string;
  duration: string;
  timestamp: string;
  backupLocation: string;
  status: 'success' | 'warning' | 'error';
}): EmailTemplate => {
  const statusConfig = {
    success: { color: '#10b981', icon: '✅', title: 'Backup Completato' },
    warning: { color: '#f59e0b', icon: '⚠️', title: 'Backup Completato con Avvertimenti' },
    error: { color: '#ef4444', icon: '❌', title: 'Backup Fallito' }
  };

  const config = statusConfig[data.status];

  const content = createHeader(
    `${config.icon} ${config.title}`,
    `Backup ${data.backupType} del ${data.timestamp}`
  ) + createContent(`
    <p>Il processo di backup è stato completato:</p>
    
    <div class="info-box ${data.status === 'success' ? 'success' : data.status === 'warning' ? 'warning' : 'error'}">
      <h3 style="margin-bottom: 12px; color: ${config.color};">📋 Dettagli Backup</h3>
      <div class="details-table">
        <table>
          <tr><td>Tipo:</td><td><strong>${data.backupType}</strong></td></tr>
          <tr><td>Stato:</td><td><strong style="color: ${config.color};">${data.status.toUpperCase()}</strong></td></tr>
          <tr><td>Dimensione:</td><td><strong>${data.backupSize}</strong></td></tr>
          <tr><td>Durata:</td><td><strong>${data.duration}</strong></td></tr>
          <tr><td>Timestamp:</td><td><strong>${data.timestamp}</strong></td></tr>
          <tr><td>Posizione:</td><td><strong>${data.backupLocation}</strong></td></tr>
        </table>
      </div>
    </div>

    ${data.status === 'success' ? `
      <h3>✅ Backup Riuscito</h3>
      <p>Il backup è stato completato con successo e tutti i dati sono stati salvati correttamente.</p>
    ` : data.status === 'warning' ? `
      <h3>⚠️ Avvertimenti</h3>
      <p>Il backup è stato completato ma potrebbero esserci alcuni avvertimenti da verificare nei log di sistema.</p>
    ` : `
      <h3>❌ Backup Fallito</h3>
      <p>Il backup non è stato completato correttamente. È necessario intervenire immediatamente per garantire la sicurezza dei dati.</p>
    `}

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://workover.app/admin/backups" class="button ${data.status === 'error' ? 'danger' : data.status === 'warning' ? 'warning' : 'success'}">
        Visualizza Backup
      </a>
    </div>

    <p><strong>Sistema di Backup Workover</strong></p>
  `);

  return {
    subject: `${config.icon} Backup ${data.status.toUpperCase()}: ${data.backupType} - ${data.timestamp}`,
    html: createBaseTemplate(content, 'Admin Workover')
  };
};