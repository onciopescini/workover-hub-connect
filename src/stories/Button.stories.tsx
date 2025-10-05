import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';

/**
 * Button component with multiple variants and sizes.
 * 
 * ## Usage
 * ```tsx
 * import { Button } from '@/components/ui/button';
 * 
 * <Button variant="default">Click me</Button>
 * ```
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default button variant
 */
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

/**
 * Destructive action button
 */
export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

/**
 * Outline button variant
 */
export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

/**
 * Secondary button variant
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

/**
 * Ghost button variant
 */
export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

/**
 * Link button variant
 */
export const Link: Story = {
  args: {
    children: 'Link',
    variant: 'link',
  },
};

/**
 * Small button size
 */
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

/**
 * Large button size
 */
export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

/**
 * Button with icon
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="mr-2 h-4 w-4" />
        Login with Email
      </>
    ),
  },
};

/**
 * Icon-only button
 */
export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <Mail className="h-4 w-4" />,
  },
};

/**
 * Loading state button
 */
export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Please wait
      </>
    ),
  },
};

/**
 * Disabled button
 */
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

/**
 * All variants showcase
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

/**
 * All sizes showcase
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  ),
};
