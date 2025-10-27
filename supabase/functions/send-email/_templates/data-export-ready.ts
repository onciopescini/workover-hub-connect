import { createBaseTemplate, createHeader, createContent, type EmailTemplate } from './base-template.ts';

interface DataExportReadyData {
  user_name: string;
  download_link: string;
  file_name: string;
  file_size_mb: number;
  expiration_days: number;
  expiration_date: string;
}

export const createDataExportReadyEmail = (data: DataExportReadyData): EmailTemplate => {
  const content = `
    ${createHeader('Export Dati Pronto', '✅ Il tuo export è disponibile')}
    ${createContent(`
      <h2>Ciao ${data.user_name}!</h2>
      <p>Il tuo export dati è stato generato con successo ed è pronto per il download.</p>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>✅ Export completato!</strong></p>
        <p style="margin-top: 8px;">I tuoi dati sono stati raccolti e preparati in formato JSON compresso.</p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Nome File</strong></td>
            <td>${data.file_name}</td>
          </tr>
          <tr>
            <td><strong>Dimensione</strong></td>
            <td>${data.file_size_mb} MB</td>
          </tr>
          <tr>
            <td><strong>Formato</strong></td>
            <td>JSON (compresso)</td>
          </tr>
          <tr>
            <td><strong>Scadenza Link</strong></td>
            <td>${new Date(data.expiration_date).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa contiene l'export:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>📋 Dati del profilo personale</li>
        <li>📅 Cronologia prenotazioni</li>
        <li>🎫 Ticket di supporto</li>
        <li>⚙️ Preferenze e impostazioni</li>
        <li>💬 Cronologia messaggi</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.download_link}" class="button success">
          📥 Scarica i tuoi dati
        </a>
      </div>

      <div class="info-box warning">
        <p style="margin: 0;"><strong>⏰ Disponibilità limitata</strong></p>
        <p style="margin-top: 8px;">Questo link di download è valido per <strong>${data.expiration_days} giorni</strong>. Scarica il file prima della scadenza.</p>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Come utilizzare l'export:</h3>
      <ol style="margin-left: 20px; color: #4b5563;">
        <li>Clicca sul pulsante "Scarica i tuoi dati"</li>
        <li>Salva il file ZIP sul tuo computer</li>
        <li>Estrai il contenuto (file JSON)</li>
        <li>Apri il file con un editor di testo o JSON viewer</li>
      </ol>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Domande sull'export?</strong><br>
        Se hai bisogno di aiuto per interpretare i dati o riscontri problemi, contatta il nostro supporto a <a href="mailto:privacy@workover.it.com">privacy@workover.it.com</a>
      </p>

      <div class="info-box" style="margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          <strong>Privacy e Sicurezza:</strong> Il link di download è protetto e accessibile solo a te. Non condividere questo link con altri. Il file verrà eliminato definitivamente dopo ${data.expiration_days} giorni.
        </p>
      </div>
    `)}
  `;

  return {
    subject: '✅ Export Dati Pronto - Scarica ora i tuoi dati',
    html: createBaseTemplate(content, 'Export Dati Pronto - Workover')
  };
};
