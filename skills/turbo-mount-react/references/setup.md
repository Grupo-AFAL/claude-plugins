# turbo-mount Setup Guide

Complete installation and configuration for React islands in AFAL Rails apps.

## Prerequisites

- Rails 8.1 with esbuild or vite configured
- Node.js and npm/yarn installed
- Tailwind CSS + DaisyUI configured

## Step 1: Install Gem

Add to `Gemfile`:

```ruby
gem 'turbo-mount'
```

Run:

```bash
bundle install
```

## Step 2: Install JavaScript Packages

```bash
npm install turbo-mount react react-dom
# or
yarn add turbo-mount react react-dom
```

For TypeScript support:

```bash
npm install --save-dev @types/react @types/react-dom
```

## Step 3: Configure Build Tool

### Option A: esbuild (Rails default)

Update `package.json` scripts:

```json
{
  "scripts": {
    "build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds --public-path=/assets --loader:.js=jsx --loader:.jsx=jsx"
  }
}
```

### Option B: Vite

Install vite plugin for Rails:

```bash
npm install vite-plugin-ruby
```

Create `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import RubyPlugin from 'vite-plugin-ruby'

export default defineConfig({
  plugins: [
    react(),
    RubyPlugin()
  ],
  resolve: {
    alias: {
      '@': '/app/javascript'
    }
  }
})
```

Update `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  }
}
```

## Step 4: Setup Entry Point

Create or update `app/javascript/application.js`:

```javascript
// Import Turbo and Stimulus (existing)
import "@hotwired/turbo-rails"
import "./controllers"

// Import React and turbo-mount
import React from 'react'
import { createRoot } from 'react-dom/client'
import { TurboMount } from 'turbo-mount'

// Make React available globally (required by turbo-mount)
window.React = React
window.createRoot = createRoot

// Register React components
import UserDashboard from './components/UserDashboard'
import DiagramEditor from './components/DiagramEditor'

TurboMount.register('UserDashboard', UserDashboard)
TurboMount.register('DiagramEditor', DiagramEditor)

// Initialize turbo-mount
document.addEventListener('turbo:load', () => {
  TurboMount.mount()
})

document.addEventListener('turbo:before-render', () => {
  TurboMount.unmount()
})
```

## Step 5: TypeScript Configuration (Optional)

Create or update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./app/javascript/*"]
    }
  },
  "include": [
    "app/javascript/**/*"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

Rename components to `.tsx`:

```bash
mv app/javascript/components/UserDashboard.jsx app/javascript/components/UserDashboard.tsx
```

Update build script for TypeScript:

```json
{
  "scripts": {
    "build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds --public-path=/assets --loader:.ts=tsx --loader:.tsx=tsx --loader:.js=jsx --loader:.jsx=jsx"
  }
}
```

## Step 6: Component Directory Structure

Create organized component structure:

```bash
mkdir -p app/javascript/components
mkdir -p app/javascript/components/shared
mkdir -p app/javascript/types
```

Example structure:

```
app/javascript/
├── application.js          # Entry point, component registration
├── components/
│   ├── UserDashboard.jsx   # Feature-specific components
│   ├── DiagramEditor.jsx
│   └── shared/             # Reusable React components
│       ├── Button.jsx
│       └── Card.jsx
└── types/                  # TypeScript types (if using TS)
    └── index.ts
```

## Step 7: Rails Helper Setup

The turbo-mount gem provides the `turbo_mount` helper automatically. Verify it works:

```erb
<!-- In any view -->
<%= turbo_mount("UserDashboard", props: { message: "Hello from Rails" }) %>
```

## Step 8: Tailwind Configuration

Ensure Tailwind scans React components. Update `config/tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './app/views/**/*.{erb,haml,html,slim}',
    './app/helpers/**/*.rb',
    './app/assets/stylesheets/**/*.css',
    './app/javascript/**/*.{js,jsx,ts,tsx}', // Include React components
    './app/components/**/*.{rb,erb,haml,html,slim}'
  ],
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: ["light", "dark"]
  }
}
```

## Step 9: Development Server

Start Rails with asset compilation:

```bash
./bin/dev
```

Or if using Foreman/Procfile.dev:

```yaml
web: bin/rails server -p 3000
js: npm run build -- --watch
css: bin/rails tailwindcss:watch
```

## Step 10: Hot Module Replacement (HMR)

### With Vite

HMR works out of the box with vite-plugin-ruby.

### With esbuild

Install reload trigger:

```bash
npm install --save-dev esbuild-plugin-reload
```

Update build script:

```javascript
// build.js
const esbuild = require('esbuild')
const reloadPlugin = require('esbuild-plugin-reload')

esbuild.build({
  entryPoints: ['app/javascript/application.js'],
  bundle: true,
  outdir: 'app/assets/builds',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx'
  },
  plugins: [reloadPlugin()],
  watch: process.argv.includes('--watch')
})
```

## Step 11: Verify Installation

Create a test component:

```jsx
// app/javascript/components/TestComponent.jsx
export default function TestComponent({ message }) {
  return (
    <div className="alert alert-info">
      <span>{message}</span>
    </div>
  )
}
```

Register it:

```javascript
// app/javascript/application.js
import TestComponent from './components/TestComponent'
TurboMount.register('TestComponent', TestComponent)
```

Use it in a view:

```erb
<%= turbo_mount("TestComponent", props: { message: "Setup successful!" }) %>
```

Visit the page. If you see the alert, setup is complete.

## Troubleshooting

### Component doesn't mount

- Check browser console for errors
- Verify component is registered in application.js
- Ensure build process ran (check app/assets/builds/)
- Check that turbo:load event fires

### Tailwind classes not working in React

- Verify content paths in tailwind.config.js include .jsx files
- Rebuild CSS: `bin/rails tailwindcss:build`
- Clear browser cache

### Build errors with JSX

- Check loader configuration in build script
- Verify file extensions (.jsx for JSX files)
- For TypeScript: ensure tsconfig.json jsx option is set

### Props not passing correctly

- Check browser DevTools > Elements > data attributes on mount div
- Verify JSON serialization (no circular references)
- Inspect browser console for prop validation errors

### CSRF token missing

- Ensure `<%= csrf_meta_tags %>` in application layout
- Check fetch requests include X-CSRF-Token header

## Production Deployment

### Precompile Assets

```bash
RAILS_ENV=production bin/rails assets:precompile
```

### Verify React in Production

Check that:
- React components are bundled in compiled JS
- No console errors in production
- Components mount and unmount cleanly
- Turbo navigation preserves functionality

### Performance Considerations

- React bundle adds ~50-100KB gzipped
- Only load React on pages that need it (consider lazy loading)
- Monitor Time to Interactive (TTI) metrics
- Use React DevTools Profiler to identify slow components

## Next Steps

With setup complete:
- Read `patterns.md` for component patterns
- Start with simple components
- Gradually introduce React for complex interactions
- Keep Hotwire as the foundation
