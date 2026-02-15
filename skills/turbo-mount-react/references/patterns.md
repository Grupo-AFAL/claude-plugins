# React Component Patterns with turbo-mount

Real-world patterns for React islands in AFAL Rails apps.

## Basic Component Mounting

### Simple Component

```erb
<!-- app/views/dashboards/show.html.erb -->
<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

  <%= turbo_mount("UserStats", props: {
    user_id: @user.id,
    stats: {
      posts: @user.posts.count,
      followers: @user.followers.count
    }
  }) %>
</div>
```

```jsx
// app/javascript/components/UserStats.jsx
export default function UserStats({ userId, stats }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="stat bg-base-100 shadow">
        <div className="stat-title">Posts</div>
        <div className="stat-value">{stats.posts}</div>
      </div>
      <div className="stat bg-base-100 shadow">
        <div className="stat-title">Followers</div>
        <div className="stat-value">{stats.followers}</div>
      </div>
    </div>
  )
}
```

### Component with State

```jsx
import { useState } from 'react'

export default function Counter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount)

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Count: {count}</h2>
        <div className="card-actions">
          <button
            className="btn btn-primary"
            onClick={() => setCount(count + 1)}
          >
            Increment
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Data Serialization Patterns

### Using Serializers

Create a serializer for clean data transformation:

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  def initialize(user)
    @user = user
  end

  def as_json
    {
      id: @user.id,
      name: @user.name,
      email: @user.email,
      avatar_url: @user.avatar_url,
      created_at: @user.created_at.iso8601
    }
  end
end
```

Use in view:

```erb
<%= turbo_mount("UserProfile", props: {
  user: UserSerializer.new(@user).as_json
}) %>
```

### Collection Serialization

```ruby
# app/serializers/post_serializer.rb
class PostSerializer
  def self.collection(posts)
    posts.map { |post| new(post).as_json }
  end

  def initialize(post)
    @post = post
  end

  def as_json
    {
      id: @post.id,
      title: @post.title,
      excerpt: @post.excerpt,
      author: {
        id: @post.author.id,
        name: @post.author.name
      }
    }
  end
end
```

```erb
<%= turbo_mount("PostList", props: {
  posts: PostSerializer.collection(@posts)
}) %>
```

### Handling Dates and Times

Always serialize to ISO8601 strings:

```ruby
turbo_mount("EventCalendar", props: {
  events: @events.map { |e|
    {
      id: e.id,
      name: e.name,
      start_time: e.start_time.iso8601,  # "2026-02-14T10:00:00Z"
      end_time: e.end_time.iso8601
    }
  }
})
```

Parse in React:

```jsx
export default function EventCalendar({ events }) {
  const parsedEvents = events.map(event => ({
    ...event,
    startTime: new Date(event.start_time),
    endTime: new Date(event.end_time)
  }))

  // Use parsedEvents with native Date objects
}
```

## Communication: React to Rails

### Form Submission with Fetch

```jsx
import { useState } from 'react'

export default function CommentForm({ postId }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        },
        body: JSON.stringify({ comment: { content } })
      })

      if (response.ok) {
        // Reload page via Turbo to show new comment
        Turbo.visit(window.location.href)
      } else {
        alert('Failed to post comment')
      }
    } catch (error) {
      console.error(error)
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-control">
      <textarea
        className="textarea textarea-bordered"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
      />
      <button
        type="submit"
        className="btn btn-primary mt-2"
        disabled={loading}
      >
        {loading ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  )
}
```

### Navigation with Turbo.visit

```jsx
function navigateToUser(userId) {
  Turbo.visit(`/users/${userId}`)
}

export default function UserCard({ user }) {
  return (
    <div className="card bg-base-100 shadow-xl cursor-pointer"
         onClick={() => navigateToUser(user.id)}>
      <div className="card-body">
        <h2 className="card-title">{user.name}</h2>
      </div>
    </div>
  )
}
```

### Optimistic Updates

```jsx
import { useState } from 'react'

export default function LikeButton({ postId, initialLiked, initialCount }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  const handleLike = async () => {
    // Optimistic update
    const newLiked = !liked
    setLiked(newLiked)
    setCount(count + (newLiked ? 1 : -1))

    try {
      await fetch(`/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
    } catch (error) {
      // Revert on error
      setLiked(!newLiked)
      setCount(count)
      alert('Failed to update like')
    }
  }

  return (
    <button
      className={`btn ${liked ? 'btn-primary' : 'btn-outline'}`}
      onClick={handleLike}
    >
      ❤️ {count}
    </button>
  )
}
```

## Communication: Rails to React

### Turbo Stream Updates

React components automatically remount when their container is replaced:

```ruby
# app/controllers/dashboards_controller.rb
def update
  @user.update(user_params)

  respond_to do |format|
    format.turbo_stream do
      render turbo_stream: turbo_stream.replace(
        "user-stats",
        partial: "dashboards/stats",
        locals: { user: @user }
      )
    end
  end
end
```

```erb
<!-- app/views/dashboards/_stats.html.erb -->
<div id="user-stats">
  <%= turbo_mount("UserStats", props: {
    user_id: @user.id,
    stats: {
      posts: @user.posts.count,
      followers: @user.followers.count
    }
  }) %>
</div>
```

The UserStats component will unmount and remount with new props automatically.

### Polling for Updates

```jsx
import { useState, useEffect } from 'react'

export default function LiveFeed({ feedUrl }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const fetchItems = async () => {
      const response = await fetch(feedUrl)
      const data = await response.json()
      setItems(data.items)
    }

    // Initial fetch
    fetchItems()

    // Poll every 30 seconds
    const interval = setInterval(fetchItems, 30000)

    return () => clearInterval(interval)
  }, [feedUrl])

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="card bg-base-100 shadow">
          <div className="card-body">
            <p>{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Cross-Island Communication

### Custom Events

React component dispatches event:

```jsx
export default function ItemSelector({ items }) {
  const handleSelect = (item) => {
    window.dispatchEvent(new CustomEvent('react:item-selected', {
      detail: { id: item.id, name: item.name }
    }))
  }

  return (
    <div className="menu bg-base-100">
      {items.map(item => (
        <li key={item.id}>
          <a onClick={() => handleSelect(item)}>{item.name}</a>
        </li>
      ))}
    </div>
  )
}
```

Stimulus controller listens:

```javascript
// app/javascript/controllers/item_display_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["display"]

  connect() {
    this.boundHandler = this.handleItemSelected.bind(this)
    window.addEventListener('react:item-selected', this.boundHandler)
  }

  disconnect() {
    window.removeEventListener('react:item-selected', this.boundHandler)
  }

  handleItemSelected(event) {
    this.displayTarget.textContent = `Selected: ${event.detail.name}`
  }
}
```

### Shared State via URL Params

Keep state in URL for cross-component coordination:

```jsx
export default function FilterPanel() {
  const updateFilter = (filter) => {
    const url = new URL(window.location)
    url.searchParams.set('filter', filter)
    Turbo.visit(url.toString())
  }

  return (
    <div className="btn-group">
      <button className="btn" onClick={() => updateFilter('active')}>
        Active
      </button>
      <button className="btn" onClick={() => updateFilter('archived')}>
        Archived
      </button>
    </div>
  )
}
```

Both React and Stimulus can read from `window.location.search`.

## Styling with DaisyUI

### Button Variants

```jsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-accent">Accent</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn btn-link">Link</button>

{/* Sizes */}
<button className="btn btn-xs">Tiny</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-md">Normal</button>
<button className="btn btn-lg">Large</button>

{/* States */}
<button className="btn btn-primary loading">Loading</button>
<button className="btn btn-disabled">Disabled</button>
```

### Cards

```jsx
<div className="card w-96 bg-base-100 shadow-xl">
  <figure>
    <img src={imageUrl} alt="Product" />
  </figure>
  <div className="card-body">
    <h2 className="card-title">Product Name</h2>
    <p>Product description here</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Buy Now</button>
    </div>
  </div>
</div>
```

### Forms

```jsx
<div className="form-control w-full max-w-xs">
  <label className="label">
    <span className="label-text">Email</span>
  </label>
  <input
    type="email"
    placeholder="you@example.com"
    className="input input-bordered w-full max-w-xs"
  />
  <label className="label">
    <span className="label-text-alt">We'll never share your email</span>
  </label>
</div>
```

### Alerts

```jsx
<div className="alert alert-info">
  <span>New updates available</span>
</div>

<div className="alert alert-success">
  <span>Operation completed successfully</span>
</div>

<div className="alert alert-warning">
  <span>Warning: This action is irreversible</span>
</div>

<div className="alert alert-error">
  <span>Error: Something went wrong</span>
</div>
```

## Component Lifecycle

### Cleanup on Unmount

```jsx
import { useEffect } from 'react'

export default function WebSocketFeed({ channelId }) {
  useEffect(() => {
    const ws = new WebSocket(`wss://example.com/channels/${channelId}`)

    ws.onmessage = (event) => {
      console.log('Message:', event.data)
    }

    // Cleanup when component unmounts or channelId changes
    return () => {
      ws.close()
    }
  }, [channelId])

  return <div>Live feed active</div>
}
```

### Persisting State Across Navigation

Use localStorage or sessionStorage:

```jsx
import { useState, useEffect } from 'react'

export default function CollapsiblePanel({ title, children }) {
  const storageKey = `panel-${title}-collapsed`
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(storageKey) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(storageKey, collapsed.toString())
  }, [collapsed, storageKey])

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          {title} {collapsed ? '▶' : '▼'}
        </h2>
        {!collapsed && children}
      </div>
    </div>
  )
}
```

## Real-World Examples

### React Flow Diagram

```jsx
import { useCallback } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow'
import 'reactflow/dist/style.css'

export default function FlowDiagram({ initialNodes, initialEdges, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds))
  }, [setEdges])

  const handleSave = async () => {
    await fetch('/diagrams/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ nodes, edges })
    })
  }

  return (
    <div style={{ height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <button className="btn btn-primary mt-4" onClick={handleSave}>
        Save Diagram
      </button>
    </div>
  )
}
```

### Data Grid with Sorting/Filtering

```jsx
import { useState, useMemo } from 'react'

export default function DataGrid({ columns, data }) {
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [filter, setFilter] = useState('')

  const filteredData = useMemo(() => {
    return data.filter(row =>
      columns.some(col =>
        String(row[col.key]).toLowerCase().includes(filter.toLowerCase())
      )
    )
  }, [data, columns, filter])

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      const modifier = sortDirection === 'asc' ? 1 : -1
      return aVal > bVal ? modifier : -modifier
    })
  }, [filteredData, sortColumn, sortDirection])

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Filter..."
        className="input input-bordered mb-4"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <table className="table table-zebra">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="cursor-pointer"
                onClick={() => handleSort(col.key)}
              >
                {col.label} {sortColumn === col.key && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Usage:

```erb
<%= turbo_mount("DataGrid", props: {
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Joined' }
  ],
  data: @users.map { |u| {
    name: u.name,
    email: u.email,
    created_at: u.created_at.strftime('%Y-%m-%d')
  }}
}) %>
```

## Testing React Components

### Component Tests with Jest/Vitest

```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Counter from '../Counter'

describe('Counter', () => {
  it('renders with initial count', () => {
    render(<Counter initialCount={5} />)
    expect(screen.getByText(/Count: 5/)).toBeDefined()
  })

  it('increments count on button click', () => {
    render(<Counter initialCount={0} />)
    const button = screen.getByText('Increment')
    fireEvent.click(button)
    expect(screen.getByText(/Count: 1/)).toBeDefined()
  })
})
```

### Integration Tests in Rails

Test that components mount correctly:

```ruby
# test/system/dashboard_test.rb
require "application_system_test_case"

class DashboardTest < ApplicationSystemTestCase
  test "user stats component displays" do
    user = users(:john)
    visit dashboard_path(user)

    # Component should mount and display stats
    assert_selector '[data-turbo-mount="UserStats"]'
    assert_text "Posts"
    assert_text "Followers"
  end
end
```

## Performance Optimization

### Lazy Loading Components

Split large React components into separate bundles:

```javascript
import { lazy, Suspense } from 'react'

const HeavyDiagram = lazy(() => import('./HeavyDiagram'))

export default function DiagramWrapper(props) {
  return (
    <Suspense fallback={<div className="loading loading-spinner"></div>}>
      <HeavyDiagram {...props} />
    </Suspense>
  )
}
```

### Memoization

Prevent unnecessary re-renders:

```jsx
import { memo } from 'react'

const ExpensiveListItem = memo(({ item }) => {
  // Complex rendering logic
  return <div className="card">{item.name}</div>
})

export default function ItemList({ items }) {
  return (
    <div>
      {items.map(item => (
        <ExpensiveListItem key={item.id} item={item} />
      ))}
    </div>
  )
}
```

### Virtualization for Long Lists

Use react-window for large datasets:

```javascript
import { FixedSizeList } from 'react-window'

export default function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="border-b p-2">
      {items[index].name}
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

## Common Pitfalls

### Memory Leaks

Always cleanup event listeners and subscriptions:

```jsx
// BAD
useEffect(() => {
  window.addEventListener('resize', handleResize)
  // Missing cleanup
}, [])

// GOOD
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

### Stale Closures

Use functional updates with useState:

```jsx
// BAD - may use stale count value
const increment = () => {
  setTimeout(() => {
    setCount(count + 1)
  }, 1000)
}

// GOOD - always uses current value
const increment = () => {
  setTimeout(() => {
    setCount(c => c + 1)
  }, 1000)
}
```

### Over-fetching

Avoid fetching data already available from Rails:

```erb
<!-- BAD - React fetches data already in Rails -->
<%= turbo_mount("UserProfile", props: { user_id: @user.id }) %>

<!-- GOOD - Pass serialized data from Rails -->
<%= turbo_mount("UserProfile", props: {
  user: UserSerializer.new(@user).as_json
}) %>
```
