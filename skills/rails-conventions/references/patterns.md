# Approved Rails Patterns for AFAL

Rails patterns that follow DHH-style conventions and work well in AFAL projects.

## Controller Patterns

### CRUD-Only Controllers (7 Actions Max)

Controllers should handle CRUD operations. Each controller represents a resource.

```ruby
class OrdersController < ApplicationController
  before_action :set_order, only: [:show, :edit, :update, :destroy]

  def index
    @orders = Order.all
  end

  def show
  end

  def new
    @order = Order.new
  end

  def create
    @order = Order.new(order_params)

    if @order.save
      redirect_to @order, notice: 'Order created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @order.update(order_params)
      redirect_to @order, notice: 'Order updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @order.destroy
    redirect_to orders_url, notice: 'Order deleted.'
  end

  private

  def set_order
    @order = Order.find(params[:id])
  end

  def order_params
    params.require(:order).permit(:customer_id, :notes)
  end
end
```

### Creating New Controllers for New Verbs

Instead of adding custom actions, create new controllers.

```ruby
# Bad: Custom action
resources :orders do
  post :publish, on: :member
end

# Good: New controller
resources :orders do
  resource :publication, only: [:create, :destroy]
end

# app/controllers/orders/publications_controller.rb
class Orders::PublicationsController < ApplicationController
  before_action :set_order

  def create
    if @order.publish!
      redirect_to @order, notice: 'Order published.'
    else
      redirect_to @order, alert: 'Could not publish order.'
    end
  end

  def destroy
    @order.unpublish!
    redirect_to @order, notice: 'Order unpublished.'
  end

  private

  def set_order
    @order = Order.find(params[:order_id])
  end
end
```

### before_action for Setting Records

Use before_action to DRY up record loading, but keep it simple (3 or fewer).

```ruby
class OrdersController < ApplicationController
  before_action :set_order, only: [:show, :edit, :update, :destroy]
  before_action :authorize_order, only: [:edit, :update, :destroy]

  private

  def set_order
    @order = Order.find(params[:id])
  end

  def authorize_order
    authorize @order # Pundit
  end
end
```

### respond_to for Multi-Format Responses

Handle different formats cleanly.

```ruby
def show
  respond_to do |format|
    format.html
    format.json { render json: @order }
    format.pdf { render pdf: "order-#{@order.id}" }
  end
end
```

## Model Patterns

### Concern Extraction (When 2+ Models Share Behavior)

Extract shared behavior into concerns when 2+ models need it.

```ruby
# app/models/concerns/publishable.rb
module Publishable
  extend ActiveSupport::Concern

  included do
    enum :status, { draft: 0, published: 1 }

    validates :published_at, presence: true, if: :published?

    scope :published, -> { where(status: :published) }
    scope :draft, -> { where(status: :draft) }
  end

  def publish!
    update!(status: :published, published_at: Time.current)
  end

  def unpublish!
    update!(status: :draft, published_at: nil)
  end

  def published?
    status == 'published'
  end
end

# app/models/article.rb
class Article < ApplicationRecord
  include Publishable
end

# app/models/post.rb
class Post < ApplicationRecord
  include Publishable
end
```

### Scope Chaining

Build composable query scopes.

```ruby
class Order < ApplicationRecord
  scope :published, -> { where(status: :published) }
  scope :recent, -> { where('created_at > ?', 1.week.ago) }
  scope :high_value, -> { where('total > ?', 1000) }
  scope :for_customer, ->(customer) { where(customer: customer) }

  # Chainable
  # Order.published.recent.high_value
end
```

### Validation Patterns

Comprehensive validations with clear error messages.

```ruby
class Order < ApplicationRecord
  # Presence
  validates :customer, :total, presence: true

  # Format
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Numericality
  validates :total, numericality: { greater_than: 0 }

  # Custom
  validate :line_items_present

  # Conditional
  validates :payment_method, presence: true, if: :requires_payment?

  private

  def line_items_present
    errors.add(:base, 'Must have at least one line item') if line_items.empty?
  end

  def requires_payment?
    total > 0
  end
end
```

### Association Patterns

Common association configurations.

```ruby
class Order < ApplicationRecord
  # Basic
  belongs_to :customer
  has_many :line_items, dependent: :destroy

  # Through
  has_many :products, through: :line_items

  # Polymorphic
  has_many :comments, as: :commentable, dependent: :destroy

  # With options
  has_many :recent_line_items, -> { where('created_at > ?', 1.day.ago) },
           class_name: 'LineItem'

  # Accepts nested attributes
  accepts_nested_attributes_for :line_items, allow_destroy: true
end
```

### Enum Usage (Rails 8 Style)

Use enums for fixed sets of values.

```ruby
class Order < ApplicationRecord
  # Symbol syntax (Rails 8)
  enum :status, { draft: 0, pending: 1, completed: 2, cancelled: 3 }
  enum :payment_method, { credit_card: 0, paypal: 1, bank_transfer: 2 }

  # Provides: draft?, pending?, completed?, cancelled?
  # Provides: draft!, pending!, completed!, cancelled!
  # Provides: Order.draft, Order.pending, etc.
end

# Migration
add_column :orders, :status, :integer, default: 0, null: false
add_index :orders, :status
```

## Route Patterns

### Resource Routing Only

Use resources for RESTful routing.

```ruby
# Basic resource
resources :orders

# Limited actions
resources :orders, only: [:index, :show]
resources :orders, except: [:destroy]

# Singular resource (no index)
resource :profile, only: [:show, :edit, :update]
```

### Shallow Nesting

Nest resources when parent context is required, use shallow for member routes.

```ruby
# Shallow nesting
resources :orders do
  resources :line_items, shallow: true
end

# Generates:
# /orders/:order_id/line_items (index, new, create)
# /line_items/:id (show, edit, update, destroy)
```

### Namespace vs Scope

Organize routes by function or access level.

```ruby
# Namespace (affects controller path and URL)
namespace :admin do
  resources :orders # AdminController::OrdersController, /admin/orders
end

# Scope (only affects URL)
scope :admin do
  resources :orders # OrdersController, /admin/orders
end

# Module (only affects controller path)
scope module: :admin do
  resources :orders # Admin::OrdersController, /orders
end
```

### Member and Collection Routes (Sparingly)

Use only when absolutely necessary, prefer new controllers.

```ruby
resources :orders do
  # Member (acts on single resource)
  member do
    post :duplicate
  end

  # Collection (acts on collection)
  collection do
    get :search
  end
end

# Better: Create new controllers
resources :orders do
  resource :duplication, only: :create
end

resources :order_searches, only: :index
```

### Route Constraints

Constrain routes to specific formats or conditions.

```ruby
# Format constraints
resources :orders, constraints: { format: :json }

# Parameter constraints
resources :orders, constraints: { id: /\d+/ }

# Custom constraints
class ApiConstraint
  def matches?(request)
    request.headers['X-API-Version'] == 'v2'
  end
end

constraints ApiConstraint.new do
  resources :orders
end
```

## Query Patterns

### Scopes for Reusable Queries

Create scopes for commonly used queries.

```ruby
class Order < ApplicationRecord
  scope :published, -> { where(status: :published) }
  scope :pending, -> { where(status: :pending) }
  scope :recent, -> { where('created_at > ?', 1.week.ago) }
  scope :by_customer, ->(customer) { where(customer: customer) }

  # With default scope (use sparingly)
  default_scope { order(created_at: :desc) }
end
```

### Query Objects for Complex Multi-Model Queries

When query spans multiple models or has complex logic, extract to query object.

```ruby
# app/queries/revenue_report_query.rb
class RevenueReportQuery
  def initialize(relation = Order.all)
    @relation = relation
  end

  def call(start_date:, end_date:, customer: nil)
    scope = @relation
      .joins(:line_items, :customer)
      .where('orders.created_at >= ?', start_date)
      .where('orders.created_at <= ?', end_date)
      .where(status: :completed)

    scope = scope.where(customer: customer) if customer.present?

    scope
      .select('customers.name, SUM(line_items.total) as revenue')
      .group('customers.id, customers.name')
      .order('revenue DESC')
  end
end

# Usage
RevenueReportQuery.new.call(
  start_date: 1.month.ago,
  end_date: Time.current,
  customer: @customer
)
```

### Eager Loading Strategies

Prevent N+1 queries with appropriate eager loading.

```ruby
# includes: Eager loads with separate queries, allows conditions
@orders = Order.includes(:customer, :line_items)
                .where(customers: { vip: true })

# preload: Always uses separate queries, cannot add conditions
@orders = Order.preload(:customer, :line_items)

# eager_load: Uses LEFT OUTER JOIN, allows conditions
@orders = Order.eager_load(:customer)
                .where(customers: { vip: true })

# Nested includes
@orders = Order.includes(line_items: :product)
```

### Counter Caches

Avoid count queries with counter caches.

```ruby
# Migration
add_column :orders, :line_items_count, :integer, default: 0, null: false
Order.find_each { |o| o.update_column(:line_items_count, o.line_items.count) }

# Model
class LineItem < ApplicationRecord
  belongs_to :order, counter_cache: true
end

# Usage (no query)
@order.line_items_count # Uses cached value instead of COUNT query
```

## Testing Patterns

### Test Behavior, Not Implementation

Focus on what the code does, not how it does it.

```ruby
# Bad: Testing implementation
test 'calls publish method' do
  order = orders(:one)
  order.expects(:publish).once
  order.complete!
end

# Good: Testing behavior
test 'marks order as published when completed' do
  order = orders(:one)
  order.complete!
  assert order.published?
  assert_not_nil order.published_at
end
```

### Fixtures Over Factories

Use fixtures for fast, consistent test data.

```ruby
# test/fixtures/orders.yml
one:
  customer: john
  status: draft
  total: 100.00

published:
  customer: jane
  status: published
  total: 250.00
  published_at: <%= 1.day.ago %>

# Usage
test 'lists published orders' do
  order = orders(:published)
  assert order.published?
end
```

### Integration Over Unit Tests

Test real behavior through the stack.

```ruby
# Prefer integration tests
test 'user can create order' do
  post orders_path, params: { order: { customer_id: customers(:one).id } }
  assert_response :redirect
  follow_redirect!
  assert_select 'h1', 'Order Details'
end

# Over unit tests
test 'order is valid' do
  order = Order.new(customer: customers(:one))
  assert order.valid?
end
```

### System Tests for Critical Flows Only

Use system tests sparingly for user-facing critical paths.

```ruby
require 'application_system_test_case'

class OrdersTest < ApplicationSystemTestCase
  test 'completing checkout flow' do
    visit products_path

    click_on 'Add to Cart'
    click_on 'Checkout'

    fill_in 'Email', with: 'customer@example.com'
    fill_in 'Card Number', with: '4242424242424242'

    click_on 'Complete Order'

    assert_text 'Order complete'
  end
end
```

## Form Object Pattern

Use only when spanning multiple models or complex validations not belonging in model.

```ruby
# app/forms/order_checkout_form.rb
class OrderCheckoutForm
  include ActiveModel::Model

  attr_accessor :order, :payment_method, :shipping_address, :billing_address

  validates :payment_method, presence: true
  validates :shipping_address, :billing_address, presence: true

  def save
    return false unless valid?

    Order.transaction do
      order.update!(status: :processing)
      create_payment
      create_shipment
    end
  rescue ActiveRecord::RecordInvalid
    false
  end

  private

  def create_payment
    Payment.create!(
      order: order,
      method: payment_method,
      address: billing_address
    )
  end

  def create_shipment
    Shipment.create!(
      order: order,
      address: shipping_address
    )
  end
end

# In controller
def create
  @form = OrderCheckoutForm.new(
    order: @order,
    payment_method: params[:payment_method],
    shipping_address: params[:shipping_address],
    billing_address: params[:billing_address]
  )

  if @form.save
    redirect_to @order
  else
    render :new
  end
end
```

## Summary

These patterns follow Rails conventions and optimize for:
- Readability and maintainability
- Simplicity over abstraction
- Convention over configuration
- Programmer happiness

When in doubt, ask: "What would Rails do?" and "What would DHH do?"
