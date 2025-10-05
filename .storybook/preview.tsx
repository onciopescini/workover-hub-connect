import type { Preview } from "@storybook/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#ffffff",
        },
        {
          name: "dark",
          value: "#1a1a1a",
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground p-4">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
};

export default preview;
