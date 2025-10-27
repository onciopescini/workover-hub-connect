import { createBaseTemplate, createHeader, createContent, type EmailTemplate } from './base-template.ts';

interface SupportTicketCreatedData {
  ticket_id: string;
  user_name: string;
  category: string;
  priority: string;
  subject: string;
  message: string;
  created_at: string;
}

export const createSupportTicketEmail = (data: SupportTicketCreatedData): EmailTemplate => {
  const categoryLabels: Record<string, string> = {
    'technical': 'Problema tecnico',
    'booking': 'Problema con prenotazione',
    'payment': 'Problema di pagamento',
    'account': 'Problema con account',
    'space': 'Problema con spazio',
    'feedback': 'Feedback/Suggerimenti',
    'other': 'Altro'
  };

  const priorityLabels: Record<string, string> = {
    'low': 'Bassa',
    'normal': 'Normale',
    'high': 'Alta',
    'critical': 'Critica'
  };

  const priorityColors: Record<string, string> = {
    'low': '#10b981',
    'normal': '#3b82f6',
    'high': '#f59e0b',
    'critical': '#ef4444'
  };

  const content = `
    ${createHeader('Ticket di Supporto Creato', 'Abbiamo ricevuto la tua richiesta')}
    ${createContent(`
      <h2>Ciao ${data.user_name}!</h2>
      <p>Abbiamo ricevuto il tuo ticket di supporto e il nostro team lo prenderà in carico il prima possibile.</p>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>ID Ticket:</strong> #${data.ticket_id}</p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Categoria</strong></td>
            <td>${categoryLabels[data.category] || data.category}</td>
          </tr>
          <tr>
            <td><strong>Priorità</strong></td>
            <td style="color: ${priorityColors[data.priority]};"><strong>${priorityLabels[data.priority] || data.priority}</strong></td>
          </tr>
          <tr>
            <td><strong>Oggetto</strong></td>
            <td>${data.subject}</td>
          </tr>
          <tr>
            <td><strong>Data</strong></td>
            <td>${new Date(data.created_at).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Il tuo messaggio:</h3>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <div class="info-box success" style="margin-top: 24px;">
        <p style="margin: 0;"><strong>💡 Cosa succede ora?</strong></p>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Il nostro team riceverà una notifica immediata</li>
          <li>Riceverai aggiornamenti via email</li>
          <li>Puoi seguire lo stato del ticket nel tuo profilo</li>
        </ul>
      </div>

      <a href="https://workover.it.com/support" class="button">Visualizza i tuoi ticket</a>

      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        <strong>Tempo di risposta stimato:</strong><br>
        • Priorità Bassa/Normale: entro 48 ore<br>
        • Priorità Alta: entro 24 ore<br>
        • Priorità Critica: entro 4 ore
      </p>
    `)}
  `;

  return {
    subject: `Ticket #${data.ticket_id} - ${data.subject}`,
    html: createBaseTemplate(content, 'Ticket Creato - Workover')
  };
};

// Admin notification email
export const createSupportTicketAdminEmail = (data: SupportTicketCreatedData): EmailTemplate => {
  const categoryLabels: Record<string, string> = {
    'technical': '🔧 Problema tecnico',
    'booking': '📅 Problema con prenotazione',
    'payment': '💳 Problema di pagamento',
    'account': '👤 Problema con account',
    'space': '🏢 Problema con spazio',
    'feedback': '💬 Feedback/Suggerimenti',
    'other': '📋 Altro'
  };

  const priorityLabels: Record<string, string> = {
    'low': '🟢 Bassa',
    'normal': '🔵 Normale',
    'high': '🟠 Alta',
    'critical': '🔴 Critica'
  };

  const content = `
    ${createHeader('Nuovo Ticket di Supporto', 'Richiesta da gestire')}
    ${createContent(`
      <div class="info-box warning">
        <p style="margin: 0;"><strong>⚠️ Nuovo ticket da gestire</strong></p>
        <p style="margin-top: 8px;">ID Ticket: <strong>#${data.ticket_id}</strong></p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Utente</strong></td>
            <td>${data.user_name}</td>
          </tr>
          <tr>
            <td><strong>Categoria</strong></td>
            <td>${categoryLabels[data.category] || data.category}</td>
          </tr>
          <tr>
            <td><strong>Priorità</strong></td>
            <td><strong>${priorityLabels[data.priority] || data.priority}</strong></td>
          </tr>
          <tr>
            <td><strong>Oggetto</strong></td>
            <td>${data.subject}</td>
          </tr>
          <tr>
            <td><strong>Data</strong></td>
            <td>${new Date(data.created_at).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Messaggio:</h3>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <a href="https://workover.it.com/admin/tickets/${data.ticket_id}" class="button warning">Gestisci Ticket</a>
    `)}
  `;

  return {
    subject: `[SUPPORT] ${priorityLabels[data.priority]} - Ticket #${data.ticket_id}`,
    html: createBaseTemplate(content, 'Nuovo Ticket - Workover Admin')
  };
};
