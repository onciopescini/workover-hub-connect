import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for Storybook');
  }
  return <div className="p-4 bg-green-50 border border-green-200 rounded">Component rendered successfully!</div>;
};

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Error Handling/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ErrorBoundary catches JavaScript errors anywhere in the child component tree, logs errors, and displays a fallback UI.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

export const NoError: Story = {
  args: {
    children: <ErrorThrowingComponent shouldThrow={false} />,
  },
};

export const WithError: Story = {
  args: {
    children: <ErrorThrowingComponent shouldThrow={true} />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the error fallback UI when a child component throws an error.',
      },
    },
  },
};

export const CustomFallback: Story = {
  args: {
    fallback: <div className="p-8 bg-red-50 border-2 border-red-300 rounded-lg">Custom error fallback UI</div>,
    children: <ErrorThrowingComponent shouldThrow={true} />,
  },
  parameters: {
    docs: {
      description: {
        story: 'ErrorBoundary with a custom fallback UI component.',
      },
    },
  },
};

export const WithRetry: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = React.useState(true);
    
    return (
      <div>
        <button 
          onClick={() => setShouldThrow(!shouldThrow)}
          className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Toggle Error
        </button>
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates error recovery by toggling the error state.',
      },
    },
  },
};
