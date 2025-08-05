# Anode IFrame Outputs

Isolated iframe content server for Anode user-generated outputs with React support.

## Features

- **Vanilla JavaScript/HTML Support**: Traditional iframe content rendering
- **React Support**: Interactive React components with state management
- **Dynamic Content Updates**: Real-time content updates via postMessage
- **Responsive Design**: Automatic height adjustment
- **Theme Support**: Light/dark mode switching in React components

## Development

### Prerequisites

- Node.js >= 23.0.0
- pnpm >= 10.9.0

### Installation

```bash
pnpm install
```

### Development Server

```bash
# Start development server
pnpm dev

# The server will be available at http://localhost:8000
```

### Building

```bash
# Build for production
pnpm build
```

## Usage

### Vanilla JavaScript/HTML Mode

Access the vanilla mode at: `http://localhost:8000/`

Send content updates via postMessage:

```javascript
// Send HTML content
iframe.contentWindow.postMessage(
  {
    type: "update-content",
    content: "<h1>Hello World</h1>",
  },
  "*"
);
```

### React Mode

Access the React mode at: `http://localhost:8000/react.html`

Send React content updates via postMessage:

```javascript
// Send JSON content for React component
iframe.contentWindow.postMessage(
  {
    type: "update-react-content",
    content: JSON.stringify({
      title: "My Data",
      items: ["Item 1", "Item 2", "Item 3"],
    }),
  },
  "*"
);
```

## React Components

### ExampleReactComponent

A demonstration React component that includes:

- **Interactive Counter**: Click to increment
- **Theme Toggle**: Switch between light and dark modes
- **Dynamic Content**: Displays JSON or text content from parent
- **Responsive Design**: Adapts to content changes
- **Smooth Transitions**: CSS transitions for better UX

### Creating Custom React Components

1. Create your component in `src/components/`
2. Import it in `IframeReactApp.tsx`
3. Add logic to render your component based on content type

Example:

```tsx
// src/components/MyCustomComponent.tsx
import React from "react";

interface MyCustomComponentProps {
  content: string;
}

export const MyCustomComponent: React.FC<MyCustomComponentProps> = ({
  content,
}) => {
  return (
    <div>
      <h2>My Custom Component</h2>
      <p>{content}</p>
    </div>
  );
};
```

## Message Types

### From Parent to IFrame

- `update-content`: Update vanilla HTML content
- `update-react-content`: Update React component content

### From IFrame to Parent

- `iframe-loaded`: IFrame has finished loading
- `iframe-height`: Height update for responsive sizing

## Deployment

### Cloudflare Workers

```bash
# Deploy to production
pnpm deploy:production

# Deploy to preview
pnpm deploy:preview

# Deploy to staging
pnpm deploy:staging
```

### Local Development with Wrangler

```bash
# Start Wrangler dev server
pnpm wrangler:dev
```

## Architecture

- **main.ts**: Vanilla JavaScript entry point
- **react-main.tsx**: React entry point
- **IframeReactApp.tsx**: Main React application component
- **ExampleReactComponent.tsx**: Example interactive component
- **style.css**: Shared styles

The system supports both traditional HTML content and interactive React components, allowing for rich, dynamic iframe content in the Anode notebook environment.
