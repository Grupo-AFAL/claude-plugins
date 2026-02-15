---
name: rails-conventions
description: This skill should be used when the user asks to review code for Rails conventions, check if code follows the Rails way, perform a code review with DHH-style principles, evaluate if code is Rails-worthy, refactor to Rails conventions, clean up controllers or models, or ensure adherence to the Rails Doctrine.
---

# Rails Conventions - DHH-Style Code Review

Enforce Rails Doctrine conventions in AFAL code reviews. Follow the principles of convention over configuration, programmer happiness, and sharp knives.

## Philosophy

Rails is an opinionated framework. Fighting the framework creates friction. Embrace conventions:

- Convention over configuration
- Fat models, skinny controllers
- Resources are the building blocks
- Domain logic lives in models and concerns
- Controllers are traffic cops, not business logic containers
- Optimize for programmer happiness, not architecture astronauts

## Core Conventions

| Principle | Convention |
|-----------|-----------|
| **Controllers** | Skinny, CRUD-only (7 actions max), minimal instance variables (3-5 max) |
| **Models** | Fat models with concerns for shared behavior, not service objects |
| **Routes** | Resource-based only, nested when parent context required |
| **Business Logic** | Concerns for behavior, callbacks only for data integrity |
| **State Management** | Separate records or enums, not boolean flags |
| **Form Objects** | Only when spanning multiple models or complex validations |
| **Query Logic** | Scopes for simple, query objects for complex multi-model queries |
| **Views** | ViewComponents with explicit props, not partials with many locals |
| **Testing** | Minitest with fixtures, integration over unit, test behavior not implementation |

## Code Review Checklist

### Controllers

**Good:**
- CRUD actions only (index, show, new, create, edit, update, destroy)
- Each action does one thing
- 3-5 instance variables maximum
- Strong parameters always
- Redirect or render, never both

**Flag for Review:**
- Custom actions beyond CRUD (consider new controller instead)
- Business logic in controller (extract to model/concern)
- More than 5 instance variables (split view or extract ViewComponent)
- before_action chains longer than 3 (simplify)
- Conditional logic deciding what to save (belongs in model)

**Example - Bad:**
```ruby
class OrdersController < ApplicationController
  def publish
    @order = Order.find(params[:id])
    @order.update(status: 'published', published_at: Time.current)
    OrderMailer.published(@order).deliver_later
    redirect_to @order
  end
end
```

**Example - Good:**
```ruby
# Create new controller for new verb
class Orders::PublicationsController < ApplicationController
  def create
    @order = Order.find(params[:order_id])
    @order.publish! # Business logic in model
    redirect_to @order
  end
end
```

### Models

**Good:**
- Domain logic lives here
- Concerns extract shared behavior
- Validations present and comprehensive
- Scopes for common queries
- Enums for fixed sets of values

**Flag for Review:**
- Anemic models (just validations, no behavior)
- God objects (extract concerns when >300 lines)
- Business logic in callbacks (callbacks for data integrity only)
- Raw SQL when Active Record works
- Missing validations

**Example - Bad:**
```ruby
class Order < ApplicationRecord
  # Anemic model - business logic elsewhere
  validates :total, presence: true
end

# Somewhere else
class OrderPublisher
  def publish(order)
    order.update(status: 'published', published_at: Time.current)
    OrderMailer.published(order).deliver_later
  end
end
```

**Example - Good:**
```ruby
class Order < ApplicationRecord
  validates :total, presence: true

  enum :status, { draft: 0, published: 1, archived: 2 }

  def publish!
    transaction do
      published!
      update!(published_at: Time.current)
      OrderMailer.published(self).deliver_later
    end
  end
end
```

### State Management

**Bad - Boolean Flags:**
```ruby
# Anti-pattern: boolean soup
add_column :orders, :published, :boolean, default: false
add_column :orders, :archived, :boolean, default: false
add_column :orders, :cancelled, :boolean, default: false
```

**Good - Enums:**
```ruby
# Clear, mutually exclusive states
add_column :orders, :status, :integer, default: 0, null: false
add_index :orders, :status

# In model
enum :status, { draft: 0, published: 1, archived: 2, cancelled: 3 }
```

**Good - Separate Records:**
```ruby
# When state has its own attributes/behavior
class Publication < ApplicationRecord
  belongs_to :order
end

class Cancellation < ApplicationRecord
  belongs_to :order
  validates :reason, presence: true
end
```

### Routes

**Good:**
- Resources only
- Nested when parent context required
- Shallow nesting for member routes
- New controllers for new verbs

**Flag for Review:**
- Custom routes when resources work
- Deep nesting (>1 level)
- Member/collection routes that should be new controllers

**Example - Bad:**
```ruby
resources :orders do
  post :publish, on: :member
  post :archive, on: :member
end
```

**Example - Good:**
```ruby
resources :orders do
  resource :publication, only: [:create, :destroy]
  resource :archival, only: [:create]
end
```

### Queries

**Good:**
- Scopes for simple, reusable queries
- Query objects for complex, multi-model queries
- Eager loading to prevent N+1
- Counter caches for counts

**Flag for Review:**
- N+1 queries (check with bullet gem)
- Complex queries in controllers/views
- Missing eager loading
- SQL that could be Active Record

**Example - Bad:**
```ruby
# In controller
@orders = Order.where(status: 'published')
             .where('created_at > ?', 1.week.ago)
             .joins(:customer)
             .where(customers: { vip: true })
             .order(created_at: :desc)
```

**Example - Good:**
```ruby
# In model
scope :published, -> { where(status: 'published') }
scope :recent, -> { where('created_at > ?', 1.week.ago) }
scope :for_vip_customers, -> { joins(:customer).where(customers: { vip: true }) }

# In controller
@orders = Order.published.recent.for_vip_customers.order(created_at: :desc)
```

### Concerns

**Use When:**
- 2+ models share behavior
- Model exceeds ~300 lines
- Behavior has cohesive purpose

**Don't Use When:**
- Only one model needs it
- Just to reduce line count
- Creating God concerns

**Example:**
```ruby
# app/models/concerns/publishable.rb
module Publishable
  extend ActiveSupport::Concern

  included do
    enum :status, { draft: 0, published: 1 }
    validates :published_at, presence: true, if: :published?
  end

  def publish!
    update!(status: :published, published_at: Time.current)
  end
end

# app/models/article.rb
class Article < ApplicationRecord
  include Publishable
end
```

## Common Mistakes

| Mistake | Solution |
|---------|----------|
| Service objects everywhere | Use concerns for shared behavior, keep logic in models |
| Fat controllers | Extract to model methods or concerns |
| Anemic models | Move business logic from controllers/services to models |
| Boolean flags for state | Use enums or separate records |
| Custom routes | Create new resource controllers instead |
| Callbacks for business logic | Use callbacks only for data integrity, explicit methods for business logic |
| Deep nesting | Use shallow nesting, early returns |
| Missing eager loading | Use includes/preload to prevent N+1 |
| Over-abstraction | Start simple, refactor when pattern emerges |

## Review Process

1. **Read the code** - Understand what it does before judging
2. **Check against conventions** - Use checklist above
3. **Flag anti-patterns** - Reference anti-patterns.md
4. **Suggest patterns** - Reference patterns.md
5. **Provide examples** - Show before/after when unclear
6. **Explain why** - Convention + benefit, not just "Rails way"

## Anti-Patterns Reference

See `references/anti-patterns.md` for comprehensive list of anti-patterns to catch.

## Patterns Reference

See `references/patterns.md` for approved Rails patterns and examples.

## Remember

- Rails conventions exist for good reasons - follow them until you have a very good reason not to
- Optimize for readability and maintainability over clever abstractions
- When in doubt, check how Rails itself does it or what DHH would do
- The best code is code that looks like it belongs in Rails
