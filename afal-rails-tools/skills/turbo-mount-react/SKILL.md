---
name: turbo-mount-react
description: This skill should be used when the user asks to add a React component, use React in a Rails app, implement turbo mount, set up islands architecture, add a complex interactive widget, embed React in Rails views, add a React Flow diagram, create a React island, or integrate React with Hotwire.
---

# React Islands via turbo-mount

## Critical Decision: React or Hotwire?

**DEFAULT: Use Hotwire (Turbo + Stimulus + Bali)**

React is ONLY justified for genuinely complex interactive widgets that would be painful in Stimulus.

| UI Need | Use |
|---------|-----|
| Toggle visibility | Stimulus controller |
| Dynamic form fields | Bali FormBuilder + Stimulus |
| Sortable lists | Bali SortableList component |
| Dropdowns, modals | Bali components + Stimulus |
| CRUD operations | Turbo Frames + Streams |
| Complex diagrams (React Flow) | **React via turbo-mount** |
| Rich data visualizations | **React via turbo-mount** |
| Canvas-based interactions | **React via turbo-mount** |
| Complex state machines | **React via turbo-mount** |

**When in doubt: Start with Hotwire. Upgrade to React only if clearly necessary.**

## What is turbo-mount?

The `turbo-mount` gem enables islands architecture in Rails:
- Hotwire is the foundation for all pages
- React components embedded in specific places (islands)
- Auto-mounts React when Turbo updates the DOM
- Components unmount cleanly on navigation
- Works seamlessly with Turbo Streams

**Philosophy:** Keep 95% of the UI in Hotwire. Use React for the 5% that truly needs it.

## Basic Usage

### 1. Mount a React Component

In a Rails view or ViewComponent:

```erb
<%= turbo_mount("UserDashboard", props: {
  user_id: @user.id,
  initial_data: @user.dashboard_data
}) %>
```

This renders a `<div>` with data attributes. turbo-mount automatically mounts the React component.

### 2. Define the Component

In `app/javascript/components/UserDashboard.jsx`:

```jsx
import React from 'react'

export default function UserDashboard({ userId, initialData }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Dashboard for User {userId}</h2>
        {/* Complex interactive UI here */}
      </div>
    </div>
  )
}
```

### 3. Register the Component

In `app/javascript/application.js`:

```javascript
import { TurboMount } from 'turbo-mount'
import UserDashboard from './components/UserDashboard'

TurboMount.register('UserDashboard', UserDashboard)
```

## Props Serialization

**NEVER pass ActiveRecord objects directly.** Serialize to plain objects:

```ruby
# BAD
turbo_mount("UserCard", props: { user: @user })

# GOOD
turbo_mount("UserCard", props: {
  user: {
    id: @user.id,
    name: @user.name,
    avatar_url: @user.avatar_url
  }
})

# BETTER (use serializer)
turbo_mount("UserCard", props: {
  user: UserSerializer.new(@user).as_json
})
```

## Communication Patterns

### React to Rails (Form Submission)

Use Turbo.visit or fetch to submit data:

```jsx
function handleSave(data) {
  fetch('/api/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
    },
    body: JSON.stringify(data)
  }).then(() => {
    Turbo.visit(window.location.href) // Reload via Turbo
  })
}
```

### Rails to React (Turbo Streams)

React components remount automatically when Turbo replaces their container:

```ruby
# In controller
turbo_stream.replace "dashboard", partial: "users/dashboard", locals: { user: @user }
```

The React component inside the partial will auto-mount with new props.

### React to Stimulus (Custom Events)

Dispatch custom events for cross-island communication:

```jsx
function notifyParent(data) {
  window.dispatchEvent(new CustomEvent('react:item-updated', { detail: data }))
}
```

```javascript
// In Stimulus controller
connect() {
  window.addEventListener('react:item-updated', this.handleUpdate)
}
```

## Styling with Tailwind/DaisyUI

React components have full access to Tailwind and DaisyUI classes:

```jsx
<button className="btn btn-primary">
  Save Changes
</button>

<div className="alert alert-success">
  <span>Operation completed!</span>
</div>
```

The CSS is shared between Rails views and React components.

## Common Mistakes

| Mistake | Consequence | Solution |
|---------|-------------|----------|
| Using React for simple interactions | Complexity explosion | Use Stimulus controllers |
| Passing ActiveRecord objects as props | Serialization errors | Serialize to plain objects first |
| Forgetting CSRF token in fetch | 422 Unprocessable Entity | Include X-CSRF-Token header |
| Not registering component | Component doesn't mount | Add to TurboMount.register() |
| Making entire pages React | Breaks Turbo navigation | Keep React as islands only |
| Inline event handlers in ERB props | XSS vulnerabilities | Pass data only, handle events in React |

## File Organization

```
app/
  javascript/
    components/          # React components
      UserDashboard.jsx
      DiagramEditor.jsx
    application.js       # Component registration
  views/
    users/
      dashboard.html.erb # turbo_mount calls
```

## Detailed References

For setup instructions, see `references/setup.md`
For component patterns and examples, see `references/patterns.md`

## Quick Start Checklist

- [ ] Install turbo-mount gem and npm package
- [ ] Configure build tool (esbuild/vite) for JSX
- [ ] Create component in app/javascript/components/
- [ ] Register component in application.js
- [ ] Use turbo_mount() in Rails view
- [ ] Serialize props to plain objects
- [ ] Test component mounts and unmounts on navigation

## When to Reconsider

If finding these issues:
- More than 30% of views have React islands → Too much React, refactor to Hotwire
- Complex state management needed → Consider whether the UI is too complex
- React islands communicating heavily → Should probably be one Hotwire feature

**Goal:** React should feel like a rare, powerful tool, not the default.
