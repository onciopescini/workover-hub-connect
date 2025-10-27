import { createBaseTemplate, createHeader, createContent, type EmailTemplate } from './base-template.ts';

interface AccountDeletionConfirmationData {
  user_name: string;
  confirmation_link: string;
  expiration_hours: number;
}

export const createAccountDeletionConfirmationEmail = (data: AccountDeletionConfirmationData): EmailTemplate => {
  const content = `
    ${createHeader('Conferma Cancellazione Account', '⚠️ Azione richiesta')}
    ${createContent(`
      <h2>Ciao ${data.user_name},</h2>
      <p>Hai richiesto la cancellazione permanente del tuo account Workover.</p>
      
      <div class="info-box error">
        <p style="margin: 0;"><strong>⚠️ ATTENZIONE: Questa azione è irreversibile!</strong></p>
        <p style="margin-top: 8px;">Una volta confermata, tutti i tuoi dati personali verranno eliminati in conformità al GDPR.</p>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa verrà eliminato:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>Informazioni del profilo personale</li>
        <li>Dati di contatto e preferenze</li>
        <li>Cronologia messaggi e notifiche</li>
        <li>Accesso alla piattaforma</li>
      </ul>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa verrà conservato (per obblighi legali):</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>Prenotazioni passate (anonimizzate)</li>
        <li>Transazioni finanziarie (per legge fiscale)</li>
        <li>Ticket di supporto (anonimizzati)</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.confirmation_link}" class="button danger">
          Confermo - Elimina il mio account
        </a>
      </div>

      <div class="info-box warning">
        <p style="margin: 0;"><strong>🕐 Tempo limitato</strong></p>
        <p style="margin-top: 8px;">Questo link è valido per <strong>${data.expiration_hours} ore</strong>. Dopo questo periodo dovrai fare una nuova richiesta.</p>
      </div>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Non hai richiesto questa cancellazione?</strong><br>
        Se non hai fatto questa richiesta, ignora questa email. Il tuo account è sicuro e nessuna azione verrà intrapresa senza la tua conferma esplicita tramite il link sopra.
      </p>

      <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
        Se hai domande o vuoi discutere la tua decisione, contatta il nostro supporto a <a href="mailto:support@workover.it.com">support@workover.it.com</a>
      </p>
    `)}
  `;

  return {
    subject: '⚠️ Conferma Cancellazione Account Workover',
    html: createBaseTemplate(content, 'Conferma Cancellazione - Workover')
  };
};
