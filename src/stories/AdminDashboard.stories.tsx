import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock Admin Dashboard Component
const AdminDashboard = () => (
  <div className="p-6">
    <Card>
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Admin dashboard with system metrics and user management</p>
      </CardContent>
    </Card>
  </div>
);

const meta: Meta<typeof AdminDashboard> = {
  title: 'Admin/AdminDashboard',
  component: AdminDashboard,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Story />
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main admin dashboard showing system metrics, user management, and moderation tools.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AdminDashboard>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default admin dashboard view with all sections.',
      },
    },
  },
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Dashboard in loading state while fetching data.',
      },
    },
  },
};
