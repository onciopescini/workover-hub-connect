export interface EmailTemplate {
  subject: string;
  html: string;
}

export const createBaseTemplate = (content: string, title: string = "Workover") => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f8fafc;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 16px;
    }
    
    .content {
      padding: 32px 24px;
    }
    
    .content h2 {
      color: #1f2937;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .content p {
      margin-bottom: 16px;
      font-size: 16px;
      color: #4b5563;
    }
    
    .content ul {
      margin: 16px 0;
      padding-left: 24px;
    }
    
    .content li {
      margin-bottom: 8px;
      color: #4b5563;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
      transition: all 0.2s;
    }
    
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .button.success {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    
    .button.warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    
    .button.danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    
    .info-box {
      background-color: #f0f9ff;
      border: 1px solid #e0f2fe;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .info-box.success {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }
    
    .info-box.warning {
      background-color: #fefce8;
      border-color: #fde047;
    }
    
    .info-box.error {
      background-color: #fef2f2;
      border-color: #fecaca;
    }
    
    .details-table {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .details-table table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .details-table td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .details-table td:first-child {
      font-weight: 600;
      color: #374151;
      width: 120px;
    }
    
    .details-table td:last-child {
      color: #6b7280;
    }
    
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    
    .social-links {
      margin-top: 16px;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      
      .header, .content, .footer {
        padding: 24px 16px;
      }
      
      .button {
        display: block;
        text-align: center;
        margin: 16px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p><strong>Workover</strong> - La piattaforma per il coworking professionale</p>
      <p>Questo è un messaggio automatico, non rispondere a questa email.</p>
      <div class="social-links">
        <a href="https://workover.it.com">Sito Web</a> |
        <a href="https://workover.it.com/support">Supporto</a> |
        <a href="https://workover.it.com/privacy">Privacy</a>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const createHeader = (title: string, subtitle?: string) => `
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
`;

export const createContent = (content: string) => `
  <div class="content">
    ${content}
  </div>
`;