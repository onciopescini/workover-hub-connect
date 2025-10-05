import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

/**
 * Badge component for labels and status indicators.
 * 
 * ## Usage
 * ```tsx
 * import { Badge } from '@/components/ui/badge';
 * 
 * <Badge variant="default">Badge</Badge>
 * ```
 */
const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: 'The visual style variant of the badge',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge variant
 */
export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

/**
 * Secondary badge variant
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

/**
 * Destructive badge variant
 */
export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

/**
 * Outline badge variant
 */
export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

/**
 * All variants showcase
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

/**
 * Badge as status indicators
 */
export const StatusIndicators: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Active:</span>
        <Badge variant="default">Active</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Pending:</span>
        <Badge variant="secondary">Pending</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Cancelled:</span>
        <Badge variant="destructive">Cancelled</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Draft:</span>
        <Badge variant="outline">Draft</Badge>
      </div>
    </div>
  ),
};

/**
 * Badge with custom content
 */
export const WithNumbers: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>99+</Badge>
      <Badge variant="secondary">New</Badge>
      <Badge variant="outline">Beta</Badge>
    </div>
  ),
};
