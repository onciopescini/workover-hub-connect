// Script per aggiornare automaticamente tutti i riferimenti OptimizedAuthContext
const fs = require('fs');
const path = require('path');

const updates = [
  {
    from: `import { useAuth } from "@/contexts/OptimizedAuthContext";`,
    to: `import { useAuth } from "@/hooks/auth/useAuth";`
  },
  {
    from: `import { useAuth } from '@/contexts/OptimizedAuthContext';`,
    to: `import { useAuth } from '@/hooks/auth/useAuth';`
  }
];

// File che necessitano aggiornamento
const filesToUpdate = [
  'src/components/host/onboarding/HostOnboardingWizard.tsx',
  'src/components/host/onboarding/HostProgressTracker.tsx',
  'src/components/layout/AdminLayout.tsx',
  'src/components/layout/AppLayout.tsx',
  'src/components/layout/OptimizedUnifiedHeader.tsx',
  'src/components/messaging/MessageList.tsx',
  'src/components/messaging/PrivateMessageList.tsx',
  'src/components/networking/ConnectionCard.tsx',
  'src/components/networking/ConnectionRequestCard.tsx',
  'src/components/networking/EnhancedConnectionCard.tsx',
  'src/components/payments/PaymentsDashboard.tsx',
  'src/components/profile/ProfileDashboard.tsx',
  'src/components/profile/ProfileEditForm.tsx',
  'src/components/profile/SocialMediaSection.tsx',
  'src/components/profile/TaxInformationSection.tsx',
  'src/components/reports/ReportDetailsDialog.tsx',
  'src/components/reports/ReportsList.tsx',
  'src/components/spaces/FavoriteButton.tsx',
  'src/components/spaces/SpaceDetailContent.tsx'
];

filesToUpdate.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    updates.forEach(update => {
      content = content.replace(update.from, update.to);
    });
    
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  } catch (error) {
    console.error(`Error updating ${file}:`, error.message);
  }
});