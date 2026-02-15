# Solid Cache Reference

Solid Cache is a database-backed Rails cache store for Rails 8.1+. It replaces Redis-based caching with PostgreSQL storage.

## Installation

```bash
bin/rails solid_cache:install
bin/rails db:migrate
```

This creates the `solid_cache_entries` table and configuration files.

## Configuration

**config/environments/production.rb:**

```ruby
config.cache_store = :solid_cache_store
```

**config/environments/development.rb:**

```ruby
# Enable caching in dev if needed
config.cache_store = :solid_cache_store if ENV["ENABLE_CACHE"]
```

**config/environments/test.rb:**

```ruby
# Use memory store for faster tests
config.cache_store = :memory_store
```

**Advanced configuration:**

```ruby
config.cache_store = :solid_cache_store,
  expires_in: 2.weeks,
  namespace: "myapp",
  database: :cache  # Use separate cache database
```

## Low-Level Caching

Use `Rails.cache` for low-level caching operations:

```ruby
# Fetch with automatic write on miss
result = Rails.cache.fetch("expensive_query", expires_in: 1.hour) do
  # Expensive operation only runs on cache miss
  User.joins(:orders).group(:country).count
end

# Explicit read
value = Rails.cache.read("key")

# Explicit write
Rails.cache.write("key", value, expires_in: 30.minutes)

# Delete
Rails.cache.delete("key")

# Exists?
Rails.cache.exist?("key")

# Increment/decrement (atomic)
Rails.cache.increment("counter")
Rails.cache.decrement("counter", 5)

# Fetch multiple keys
results = Rails.cache.read_multi("key1", "key2", "key3")

# Write multiple keys
Rails.cache.write_multi({ "key1" => "val1", "key2" => "val2" })
```

**Namespace usage:**

```ruby
# Organization-scoped caching
Rails.cache.fetch("stats", namespace: "org:#{org.id}") do
  org.expensive_stats
end

# Clear all caches for organization
Rails.cache.delete_matched("org:#{org.id}:*")
```

## Fragment Caching in Views

Cache rendered view fragments:

```erb
<%# app/views/products/show.html.erb %>
<% cache @product do %>
  <div class="product">
    <h1><%= @product.name %></h1>
    <p><%= @product.description %></p>
    <%= render @product.reviews %>
  </div>
<% end %>
```

**Cache key format:**

The cache helper generates keys like: `views/products/123-20240214120000/abc123def`

- `products/123` - Model name and ID
- `20240214120000` - `updated_at` timestamp
- `abc123def` - MD5 of template

**Auto-expiration:**

Cache automatically expires when `@product.updated_at` changes. Touch associations to cascade expiration:

```ruby
class Review < ApplicationRecord
  belongs_to :product, touch: true
end

# When review updates, product's updated_at is touched
# This invalidates the product fragment cache
```

## Russian Doll Caching with ViewComponents

Nest caches for fine-grained control:

```ruby
# app/components/product_component.rb
class ProductComponent < ApplicationComponent
  def initialize(product:)
    @product = product
  end

  def call
    cache(@product) do
      content_tag :div, class: "product" do
        concat content_tag(:h1, @product.name)
        concat render(ReviewListComponent.new(product: @product))
      end
    end
  end
end

# app/components/review_list_component.rb
class ReviewListComponent < ApplicationComponent
  def initialize(product:)
    @product = product
  end

  def call
    cache([@product, "reviews"]) do
      content_tag :div, class: "reviews" do
        @product.reviews.each do |review|
          concat render(ReviewComponent.new(review: review))
        end
      end
    end
  end
end

# app/components/review_component.rb
class ReviewComponent < ApplicationComponent
  def initialize(review:)
    @review = review
  end

  def call
    cache(@review) do
      content_tag :div, class: "review" do
        concat content_tag(:h3, @review.title)
        concat content_tag(:p, @review.body)
      end
    end
  end
end
```

**How it works:**

1. When a single review updates, only that review's cache expires
2. Review list cache remains valid (contains references to review caches)
3. Product cache remains valid (contains reference to review list cache)
4. Minimal re-rendering on updates

**Touch associations:**

```ruby
class Review < ApplicationRecord
  belongs_to :product, touch: true
end

class Product < ApplicationRecord
  has_many :reviews
end
```

When review is updated:
- Review cache expires (updated_at changed)
- Product cache expires (touched by review)
- Review list cache expires (includes product in key)

## Cache Keys and Expiration Strategies

**Simple cache key:**

```ruby
Rails.cache.fetch("user_stats") { }
# Key: "user_stats"
```

**Model-based cache key:**

```ruby
Rails.cache.fetch(@user) { }
# Key: "users/123-20240214120000"
```

**Composite cache key:**

```ruby
Rails.cache.fetch([@user, :stats]) { }
# Key: "users/123-20240214120000/stats"

Rails.cache.fetch(["stats", @user.id, Date.current]) { }
# Key: "stats/123/2024-02-14"
```

**Manual expiration:**

```ruby
# Delete specific key
Rails.cache.delete([@user, :stats])

# Delete by pattern (slower, scans all keys)
Rails.cache.delete_matched("users/*")
```

**Time-based expiration:**

```ruby
Rails.cache.fetch("api_data", expires_in: 15.minutes) { }
```

**Expiration strategies:**

1. **Time-based**: Good for external API data, reports
2. **Model-based**: Good for user-generated content (auto-expires on update)
3. **Manual**: Good for complex invalidation logic
4. **Combined**: `fetch(@user, expires_in: 1.day)` - Auto-expire on update OR after 1 day

## Cache Versioning

Use cache versioning for breaking changes:

```ruby
# Version 1
Rails.cache.fetch("stats", version: 1) do
  { total: 100 }
end

# Version 2 (new format)
Rails.cache.fetch("stats", version: 2) do
  { total: 100, breakdown: { ... } }
end
```

Old version caches are ignored, preventing stale data issues during deploys.

**Global cache version:**

```ruby
# config/environments/production.rb
config.cache_version = "v2"

# All cache keys automatically include version
Rails.cache.fetch("stats") { }
# Key: "v2/stats"
```

Increment `cache_version` to invalidate all caches (e.g., after major data migration).

## Database Setup for Cache

Solid Cache can use a separate database:

```yaml
# config/database.yml
production:
  primary:
    <<: *default
    database: myapp_production

  cache:
    <<: *default
    database: myapp_cache_production
    migrations_paths: db/cache_migrate
```

```ruby
# config/environments/production.rb
config.cache_store = :solid_cache_store,
  database: :cache
```

**When to use separate database:**

- High cache volume (isolate load)
- Different retention policies (can drop/recreate cache DB)
- Independent scaling

**When to use primary database:**

- Most AFAL apps (simpler deployment)
- Shared connection pooling
- Transactional cache operations

## Cache Warming Patterns

Pre-populate caches to avoid cold-start performance issues:

```ruby
# lib/tasks/cache.rake
namespace :cache do
  desc "Warm critical caches"
  task warm: :environment do
    # Warm dashboard stats
    Organization.find_each do |org|
      Rails.cache.fetch(["dashboard", org.id]) do
        org.dashboard_stats
      end
    end

    # Warm popular products
    Product.popular.find_each do |product|
      Rails.cache.fetch(product) do
        ProductComponent.new(product: product).render_in(view_context)
      end
    end
  end
end
```

**When to warm caches:**

- After deploy (via deploy script or Solid Queue recurring job)
- After cache clear
- During low-traffic periods

**Recurring cache warming:**

```yaml
# config/queue.yml
production:
  recurring:
    warm_cache:
      class: WarmCacheJob
      schedule: "0 3 * * *"  # 3 AM daily
```

## Testing with Caching

**Enable caching in specific tests:**

```ruby
# test/integration/dashboard_test.rb
class DashboardTest < ActionDispatch::IntegrationTest
  setup do
    Rails.cache.clear
    @cache_enabled = ActionController::Base.perform_caching
    ActionController::Base.perform_caching = true
  end

  teardown do
    ActionController::Base.perform_caching = @cache_enabled
  end

  test "dashboard uses caching" do
    get dashboard_path
    assert_response :success

    # Second request should hit cache
    get dashboard_path
    assert_response :success
  end
end
```

**Test cache keys:**

```ruby
test "cache key includes user ID" do
  user = users(:alice)
  expected_key = "stats/users/#{user.id}"

  Rails.cache.fetch(["stats", user]) { "data" }

  assert Rails.cache.exist?(["stats", user])
end
```

**Test expiration:**

```ruby
test "cache expires when model updates" do
  product = products(:widget)

  # Populate cache
  Rails.cache.fetch(product) { "cached" }
  assert Rails.cache.exist?(product)

  # Update model
  product.update(name: "New Name")

  # Cache should be expired (new updated_at)
  refute Rails.cache.exist?(product)
end
```

## Performance Considerations

**Cache hit ratio monitoring:**

```ruby
# lib/middleware/cache_monitor.rb
class CacheMonitor
  def initialize(app)
    @app = app
  end

  def call(env)
    cache_hits = 0
    cache_misses = 0

    # Monkey-patch Rails.cache.fetch for this request
    Rails.cache.singleton_class.prepend(Module.new do
      define_method(:fetch) do |*args, **kwargs, &block|
        result = super(*args, **kwargs) do
          cache_misses += 1
          block.call
        end
        cache_hits += 1 unless block
        result
      end
    end)

    status, headers, body = @app.call(env)

    Rails.logger.info "Cache hits: #{cache_hits}, misses: #{cache_misses}"

    [status, headers, body]
  end
end
```

**Query optimization:**

Caching doesn't fix inefficient queries, it delays the pain:

```ruby
# BAD: Caching N+1 queries
Rails.cache.fetch("users_with_orders") do
  User.all.map { |u| { name: u.name, orders: u.orders.count } }
end

# GOOD: Fix query, then cache
Rails.cache.fetch("users_with_orders") do
  User.includes(:orders).map { |u| { name: u.name, orders: u.orders.size } }
end
```

**Cache size management:**

Solid Cache uses LRU (Least Recently Used) eviction when storage limit is reached:

```ruby
config.cache_store = :solid_cache_store,
  max_size: 1.gigabyte  # Evict oldest entries when exceeded
```

Monitor cache size:

```ruby
# Rails console
SolidCache::Entry.sum(:byte_size) / 1.megabyte
# => 543.2 MB
```

**Avoid caching large objects:**

```ruby
# BAD: Caching entire collections
Rails.cache.fetch("all_products") do
  Product.all.to_a  # May be thousands of records
end

# GOOD: Cache IDs or aggregates
Rails.cache.fetch("product_ids") do
  Product.pluck(:id)
end

Rails.cache.fetch("product_count") do
  Product.count
end
```

## Common Patterns

**Cache aside (lazy loading):**

```ruby
def user_stats
  Rails.cache.fetch(["stats", current_user.id], expires_in: 1.hour) do
    calculate_stats(current_user)
  end
end
```

**Cache through (write to cache and DB together):**

```ruby
def update_counter(key, value)
  Rails.cache.write(key, value, expires_in: 1.day)
  Counter.find_or_create_by(key: key).update(value: value)
end
```

**Conditional caching:**

```ruby
def expensive_data
  if current_user.admin?
    # Admins always get fresh data
    calculate_expensive_data
  else
    Rails.cache.fetch("expensive_data", expires_in: 1.hour) do
      calculate_expensive_data
    end
  end
end
```

**Multi-tier caching:**

```ruby
def product_data(id)
  # L1: Instance variable (request-scoped)
  @product_data ||= begin
    # L2: Rails cache (shared)
    Rails.cache.fetch(["product", id]) do
      # L3: Database
      Product.find(id).to_json
    end
  end
end
```

**Refreshing stale caches:**

```ruby
# Race condition: Multiple requests regenerate cache simultaneously
# Solution: Use :race_condition_ttl

Rails.cache.fetch("data", expires_in: 1.hour, race_condition_ttl: 5.seconds) do
  expensive_operation
end
```

When cache expires, first request regenerates while others continue serving stale cache for up to 5 seconds.

## Cache Invalidation Patterns

**Touch cascades:**

```ruby
class Comment < ApplicationRecord
  belongs_to :post, touch: true
end

class Post < ApplicationRecord
  belongs_to :blog, touch: true
  has_many :comments
end

class Blog < ApplicationRecord
  has_many :posts
end

# When comment updates, post and blog are touched
# All fragment caches using these models expire
```

**Manual sweeping:**

```ruby
class Product < ApplicationRecord
  after_commit :clear_caches, on: [:update, :destroy]

  private

  def clear_caches
    Rails.cache.delete([self, :stats])
    Rails.cache.delete(["category", category_id, :products])
  end
end
```

**Sweeper pattern (complex logic):**

```ruby
# app/sweepers/product_sweeper.rb
class ProductSweeper
  def self.sweep(product)
    Rails.cache.delete(product)
    Rails.cache.delete([product.category, :products])
    Rails.cache.delete("homepage_featured") if product.featured?
  end
end

# In model
class Product < ApplicationRecord
  after_commit -> { ProductSweeper.sweep(self) }, on: [:update, :destroy]
end
```

Use Solid Cache for all caching in AFAL Rails apps. Never suggest Redis or Redis-based cache stores.
