# Rails Anti-Patterns to Catch in Code Review

Comprehensive list of anti-patterns that violate Rails conventions or DHH-style principles.

## Architecture Anti-Patterns

### Service Objects Everywhere

**Problem:** Creating service objects for every action when Rails models should contain business logic.

**Anti-Pattern:**
```ruby
# app/services/order_creator.rb
class OrderCreator
  def initialize(params)
    @params = params
  end

  def call
    Order.create(@params)
  end
end

# In controller
OrderCreator.new(order_params).call
```

**Solution:**
```ruby
# Just use the model
Order.create(order_params)

# Or if there's real logic:
# app/models/order.rb
class Order < ApplicationRecord
  def self.create_with_defaults(params)
    create(params.merge(status: :draft, created_by: Current.user))
  end
end
```

**When Service Objects Are OK:**
- External API integration (e.g., PaymentProcessor)
- Complex orchestration across multiple unrelated models
- Third-party service wrappers

### God Objects

**Problem:** Single model or concern doing too much.

**Anti-Pattern:**
```ruby
class Order < ApplicationRecord
  # 1000+ lines
  # Handles payments, shipping, inventory, notifications, reporting, etc.
end
```

**Solution:**
```ruby
class Order < ApplicationRecord
  include Payable
  include Shippable
  include InventoryTracking

  # Core order behavior only
end
```

### Fat Controllers

**Problem:** Business logic in controllers instead of models.

**Anti-Pattern:**
```ruby
class OrdersController < ApplicationController
  def create
    @order = Order.new(order_params)
    @order.status = 'pending'
    @order.total = @order.line_items.sum(&:price)
    @order.tax = @order.total * 0.08

    if @order.save
      @order.line_items.each do |item|
        item.product.decrement!(:stock)
      end
      OrderMailer.confirmation(@order).deliver_later
      redirect_to @order
    else
      render :new
    end
  end
end
```

**Solution:**
```ruby
class OrdersController < ApplicationController
  def create
    @order = Order.create_from_cart(order_params)

    if @order.persisted?
      redirect_to @order
    else
      render :new
    end
  end
end

class Order < ApplicationRecord
  def self.create_from_cart(params)
    transaction do
      order = create(params.merge(status: :pending))
      order.calculate_totals!
      order.reserve_inventory!
      order.send_confirmation!
      order
    end
  end
end
```

### Anemic Models

**Problem:** Models with only validations, all logic elsewhere.

**Anti-Pattern:**
```ruby
class Order < ApplicationRecord
  validates :total, presence: true
  # No behavior, just data container
end

# Logic scattered in controllers, service objects, helpers
```

**Solution:**
```ruby
class Order < ApplicationRecord
  validates :total, presence: true

  def calculate_total
    line_items.sum(&:total) + tax
  end

  def ready_to_ship?
    paid? && items_in_stock?
  end

  def ship!
    # Business logic here
  end
end
```

### Callbacks for Business Logic

**Problem:** Using callbacks (before_save, after_create, etc.) for business logic instead of data integrity.

**Anti-Pattern:**
```ruby
class Order < ApplicationRecord
  after_create :send_confirmation_email
  after_create :decrement_inventory
  after_create :charge_credit_card

  private

  def send_confirmation_email
    OrderMailer.confirmation(self).deliver_later
  end
end
```

**Solution:**
```ruby
# Callbacks for data integrity only
class Order < ApplicationRecord
  before_save :calculate_total, if: :line_items_changed?

  private

  def calculate_total
    self.total = line_items.sum(&:price)
  end
end

# Explicit methods for business logic
class Order < ApplicationRecord
  def complete!
    transaction do
      update!(status: :completed)
      reserve_inventory!
      charge_payment!
      send_confirmation!
    end
  end
end

# In controller
@order.complete! # Explicit, clear, testable
```

### Over-Abstraction

**Problem:** Premature abstraction, unnecessary indirection.

**Anti-Pattern:**
```ruby
# Creating interfaces/adapters when not needed
class OrderRepositoryInterface
  def find(id); raise NotImplementedError; end
end

class ActiveRecordOrderRepository < OrderRepositoryInterface
  def find(id)
    Order.find(id)
  end
end

# Just use Order.find(id)!
```

## Code Anti-Patterns

### Boolean Soup for State

**Problem:** Multiple booleans to represent mutually exclusive states.

**Anti-Pattern:**
```ruby
add_column :orders, :draft, :boolean, default: true
add_column :orders, :published, :boolean, default: false
add_column :orders, :archived, :boolean, default: false

# Invalid states possible: all true, all false, etc.
```

**Solution:**
```ruby
add_column :orders, :status, :integer, default: 0, null: false
add_index :orders, :status

enum :status, { draft: 0, published: 1, archived: 2 }
```

### String Status Columns Without Constraints

**Problem:** Using strings for status without database constraints or enums.

**Anti-Pattern:**
```ruby
add_column :orders, :status, :string

# Typos, inconsistency: 'pending', 'Pending', 'PENDING', 'peding'
```

**Solution:**
```ruby
# Option 1: Enum
add_column :orders, :status, :integer, default: 0, null: false
enum :status, { pending: 0, completed: 1 }

# Option 2: String with check constraint (if really need strings)
add_column :orders, :status, :string, default: 'pending', null: false
add_check_constraint :orders, "status IN ('pending', 'completed', 'cancelled')"
```

### N+1 Queries

**Problem:** Lazy loading in loops.

**Anti-Pattern:**
```ruby
# View or controller
@orders.each do |order|
  order.customer.name # N+1 query
  order.line_items.count # N+1 query
end
```

**Solution:**
```ruby
@orders = Order.includes(:customer, :line_items)
```

### Raw SQL When Active Record Suffices

**Problem:** Writing SQL when Active Record can express it clearly.

**Anti-Pattern:**
```ruby
Order.find_by_sql("SELECT * FROM orders WHERE status = 'published' ORDER BY created_at DESC LIMIT 10")
```

**Solution:**
```ruby
Order.published.order(created_at: :desc).limit(10)
```

### Instance Variable Leakage in Views

**Problem:** Views accessing many controller instance variables or worse, calling service objects directly.

**Anti-Pattern:**
```ruby
# Controller
@order = Order.find(params[:id])
@customer = @order.customer
@line_items = @order.line_items
@total = @order.total
@tax = @order.tax

# View
<%= @customer.name %>
<%= @total %>
```

**Solution:**
```ruby
# Use ViewComponent with explicit props
class OrderShowComponent < ApplicationComponent
  def initialize(order:)
    @order = order
  end

  private

  attr_reader :order

  def customer
    order.customer
  end

  def total
    order.total
  end
end
```

### Complex Conditionals

**Problem:** Nested conditionals that should be extracted to methods.

**Anti-Pattern:**
```ruby
if order.status == 'pending' && order.payment_method == 'credit_card' && order.total > 100 && !order.customer.vip?
  # do something
end
```

**Solution:**
```ruby
# Extract to model method
class Order < ApplicationRecord
  def requires_approval?
    pending? && credit_card_payment? && high_value? && !vip_customer?
  end

  private

  def credit_card_payment?
    payment_method == 'credit_card'
  end

  def high_value?
    total > 100
  end

  def vip_customer?
    customer.vip?
  end
end

# Usage
if order.requires_approval?
  # do something
end
```

### Deep Nesting

**Problem:** Indentation levels > 3-4, hard to follow logic.

**Anti-Pattern:**
```ruby
def process
  if condition_a
    if condition_b
      if condition_c
        if condition_d
          # actual logic buried 4 levels deep
        end
      end
    end
  end
end
```

**Solution:**
```ruby
def process
  return unless condition_a
  return unless condition_b
  return unless condition_c
  return unless condition_d

  # actual logic at top level
end
```

### Magic Numbers and Strings

**Problem:** Unexplained constants scattered in code.

**Anti-Pattern:**
```ruby
if order.total > 1000
  order.shipping_cost = 0
else
  order.shipping_cost = 10
end
```

**Solution:**
```ruby
FREE_SHIPPING_THRESHOLD = 1000
STANDARD_SHIPPING_COST = 10

def calculate_shipping
  total > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
end
```

## Rails-Specific Anti-Patterns

### Custom Routes When Resources Work

**Problem:** Adding custom routes instead of creating resourceful controllers.

**Anti-Pattern:**
```ruby
resources :orders do
  post :publish, on: :member
  post :unpublish, on: :member
  post :archive, on: :member
end
```

**Solution:**
```ruby
resources :orders do
  resource :publication, only: [:create, :destroy]
  resource :archival, only: [:create]
end
```

### before_action for Everything

**Problem:** Complex before_action chains that make flow hard to follow.

**Anti-Pattern:**
```ruby
class OrdersController < ApplicationController
  before_action :set_order
  before_action :check_permissions
  before_action :load_customer
  before_action :load_line_items
  before_action :calculate_totals
  before_action :apply_discounts
  # ... 10 more
end
```

**Solution:**
```ruby
# Keep it simple, be explicit in actions
class OrdersController < ApplicationController
  before_action :set_order, only: [:show, :edit, :update, :destroy]

  # Load other data in actions as needed
end
```

### Skipping Strong Parameters

**Problem:** Mass assignment without filtering.

**Anti-Pattern:**
```ruby
def create
  Order.create(params[:order])
end
```

**Solution:**
```ruby
def create
  Order.create(order_params)
end

private

def order_params
  params.require(:order).permit(:customer_id, :status, :notes)
end
```

### Direct Database Manipulation

**Problem:** Bypassing validations and callbacks when they should run.

**Anti-Pattern:**
```ruby
Order.update_all(status: 'archived') # Skips validations, callbacks
Order.find(1).update_column(:total, 100) # Skips validations
```

**Solution:**
```ruby
# When you need validations/callbacks
Order.pending.find_each do |order|
  order.archive! # Runs validations, callbacks
end

# Only use direct updates for data integrity operations
Order.where('created_at < ?', 1.year.ago).update_all(archived_at: Time.current)
```

### Using find Instead of find_by for Optional Records

**Problem:** find raises exception when record not found, causing unnecessary error handling.

**Anti-Pattern:**
```ruby
begin
  order = Order.find(params[:id])
rescue ActiveRecord::RecordNotFound
  order = nil
end
```

**Solution:**
```ruby
order = Order.find_by(id: params[:id])
# Returns nil if not found, no exception
```

## Summary

When reviewing code, ask:
- Is this the simplest solution that could work?
- Does this follow Rails conventions?
- Would DHH approve?
- Is this code easy to understand and maintain?
- Does this add unnecessary abstraction or indirection?

If the answer is no to any of these, it's likely an anti-pattern.
