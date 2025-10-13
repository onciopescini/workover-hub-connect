import type { Meta, StoryObj } from '@storybook/react';
import { SecurityAlertsPanel } from '@/components/admin/security/SecurityAlertsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta: Meta<typeof SecurityAlertsPanel> = {
  title: 'Admin/Security/SecurityAlertsPanel',
  component: SecurityAlertsPanel,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="p-6 bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Displays real-time security alerts and metrics for administrators to monitor potential security threats.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SecurityAlertsPanel>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default security alerts panel showing current security metrics.',
      },
    },
  },
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching security metrics.',
      },
    },
  },
};

export const WithAlerts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Panel displaying active security alerts requiring attention.',
      },
    },
  },
};
