import { createBaseTemplate, createHeader, createContent, type EmailTemplate } from './base-template.ts';

interface AccountDeletionCompleteData {
  user_name: string;
  deletion_date: string;
}

export const createAccountDeletionCompleteEmail = (data: AccountDeletionCompleteData): EmailTemplate => {
  const content = `
    ${createHeader('Account Cancellato', 'Conferma definitiva')}
    ${createContent(`
      <h2>Ciao ${data.user_name},</h2>
      <p>Questo messaggio conferma che il tuo account Workover è stato cancellato con successo.</p>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>✅ Cancellazione completata</strong></p>
        <p style="margin-top: 8px;">Data cancellazione: ${new Date(data.deletion_date).toLocaleString('it-IT')}</p>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Azioni eseguite:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>✅ Dati personali eliminati dal profilo</li>
        <li>✅ Informazioni di contatto rimosse</li>
        <li>✅ Cronologia messaggi cancellata</li>
        <li>✅ Preferenze e impostazioni eliminate</li>
        <li>✅ Account di accesso disattivato</li>
      </ul>

      <div class="info-box">
        <p style="margin: 0;"><strong>📋 Dati conservati per obblighi legali:</strong></p>
        <p style="margin-top: 8px;">In conformità con le normative fiscali e contabili italiane, alcune informazioni sono state anonimizzate ma conservate:</p>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Prenotazioni e transazioni (anonimizzate)</li>
          <li>Ticket di supporto (anonimizzati)</li>
          <li>Dati di fatturazione (per 10 anni per legge)</li>
        </ul>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Cosa puoi fare ora:</h3>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>💚 Ripensaci?</strong></p>
        <p style="margin-top: 8px;">Se in futuro desideri tornare a utilizzare Workover, puoi creare un nuovo account in qualsiasi momento. I tuoi dati precedenti non saranno recuperabili.</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://workover.it.com/register" class="button">
          Crea un nuovo account
        </a>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Feedback importante:</h3>
      <p>Ci dispiace vederti andare! Se vuoi, aiutaci a migliorare condividendo il motivo della tua cancellazione:</p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:feedback@workover.it.com?subject=Feedback Cancellazione Account" class="button" style="background: linear-gradient(135deg, #6b7280, #4b5563);">
          💬 Invia Feedback
        </a>
      </div>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Hai domande sui dati conservati?</strong><br>
        Per qualsiasi domanda riguardante i tuoi dati o il processo di cancellazione, contatta il nostro Data Protection Officer (DPO) a <a href="mailto:privacy@workover.it.com">privacy@workover.it.com</a>
      </p>

      <div class="info-box" style="margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          <strong>Questa è l'ultima email</strong> che riceverai da Workover, salvo comunicazioni relative a obblighi legali. Grazie per aver fatto parte della nostra community.
        </p>
      </div>
    `)}
  `;

  return {
    subject: 'Account Workover Cancellato - Conferma Definitiva',
    html: createBaseTemplate(content, 'Account Cancellato - Workover')
  };
};
