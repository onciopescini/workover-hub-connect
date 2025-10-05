import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Terminal } from 'lucide-react';

/**
 * Alert component for important messages and notifications.
 * 
 * ## Usage
 * ```tsx
 * import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
 * 
 * <Alert>
 *   <AlertTitle>Heads up!</AlertTitle>
 *   <AlertDescription>You can add components to your app.</AlertDescription>
 * </Alert>
 * ```
 */
const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
      description: 'The visual style variant of the alert',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default alert
 */
export const Default: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components and dependencies to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Destructive alert variant
 */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Alert without icon
 */
export const WithoutIcon: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <AlertTitle>Note</AlertTitle>
      <AlertDescription>
        This is a simple alert without an icon.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Alert with title only
 */
export const TitleOnly: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Important notification</AlertTitle>
    </Alert>
  ),
};

/**
 * Alert with description only
 */
export const DescriptionOnly: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        This alert has only a description without a title.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Multiple alerts showcase
 */
export const MultipleAlerts: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>
          Your changes have been saved successfully.
        </AlertDescription>
      </Alert>
      
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Please review your input before proceeding.
        </AlertDescription>
      </Alert>
    </div>
  ),
};
