import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Checkbox component for selection inputs.
 * 
 * ## Usage
 * ```tsx
 * import { Checkbox } from '@/components/ui/checkbox';
 * 
 * <Checkbox id="terms" />
 * <label htmlFor="terms">Accept terms and conditions</label>
 * ```
 */
const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default checkbox
 */
export const Default: Story = {
  args: {},
};

/**
 * Checked checkbox
 */
export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

/**
 * Disabled checkbox
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Disabled and checked
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

/**
 * Checkbox with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  ),
};

/**
 * Multiple checkboxes
 */
export const MultipleCheckboxes: Story = {
  render: () => (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="option1" defaultChecked />
        <label htmlFor="option1" className="text-sm font-medium">
          Option 1 (checked)
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option2" />
        <label htmlFor="option2" className="text-sm font-medium">
          Option 2
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option3" disabled />
        <label htmlFor="option3" className="text-sm font-medium">
          Option 3 (disabled)
        </label>
      </div>
    </div>
  ),
};

/**
 * Form example with checkboxes
 */
export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Select your notification preferences
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="email" defaultChecked />
          <label htmlFor="email" className="text-sm font-medium">
            Email notifications
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox id="sms" />
          <label htmlFor="sms" className="text-sm font-medium">
            SMS notifications
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox id="push" defaultChecked />
          <label htmlFor="push" className="text-sm font-medium">
            Push notifications
          </label>
        </div>
      </div>
    </div>
  ),
};
