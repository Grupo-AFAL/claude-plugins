# Solid Queue Reference

Solid Queue is a database-backed ActiveJob adapter for background job processing in Rails 8.1+. It replaces Redis-based solutions like Sidekiq.

## Installation

```bash
bin/rails solid_queue:install
bin/rails db:migrate
```

This creates `config/queue.yml` and the necessary database tables.

## Job Class Structure

All jobs inherit from `ApplicationJob`:

```ruby
# app/jobs/process_report_job.rb
class ProcessReportJob < ApplicationJob
  queue_as :reports

  retry_on NetworkError, wait: :exponentially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError

  def perform(report_id)
    report = Report.find(report_id)
    report.process!
  end
end
```

**Key patterns:**

- **Pass IDs not objects**: `perform(report.id)` not `perform(report)`
- **Find records in perform**: Ensures fresh data, handles deleted records
- **Use queue_as**: Organize jobs by priority/type
- **Configure retries**: Balance reliability vs cost

## Queue Configuration

Define queues, workers, and dispatchers in `config/queue.yml`:

```yaml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
      concurrency_maintenance_interval: 600

  workers:
    - queues: [critical, high]
      threads: 5
      processes: 3
      polling_interval: 0.1

    - queues: [default, low]
      threads: 3
      processes: 2
      polling_interval: 1
```

**Configuration keys:**

- `dispatchers`: Polls for jobs and assigns to workers
  - `polling_interval`: How often to check for new jobs (seconds)
  - `batch_size`: Jobs to fetch per poll
  - `concurrency_maintenance_interval`: How often to enforce limits (seconds)

- `workers`: Process jobs
  - `queues`: Array of queue names, or `"*"` for all
  - `threads`: Concurrent threads per worker process
  - `processes`: Number of worker processes to spawn
  - `polling_interval`: How often to check assigned jobs

**Queue priority order:**

Workers process queues in array order. `[critical, high]` means critical jobs run before high priority.

## Job Priorities and Queue Names

```ruby
class EmailJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    # ...
  end
end

class CriticalAlertJob < ApplicationJob
  queue_as :critical

  def perform(alert_id)
    # ...
  end
end

# Dynamic queue selection
class ReportJob < ApplicationJob
  queue_as do
    user = arguments.first
    user.premium? ? :high : :default
  end

  def perform(user)
    # ...
  end
end
```

**Common queue names:**

- `critical` - System alerts, critical errors (process immediately)
- `high` - User-facing operations (emails, notifications)
- `default` - Standard background work
- `low` - Batch operations, cleanup tasks

## Recurring Jobs

Schedule recurring jobs in `config/queue.yml`:

```yaml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500

  recurring:
    daily_report:
      class: GenerateDailyReportJob
      schedule: "0 6 * * *"  # 6 AM daily

    cleanup_old_records:
      class: CleanupJob
      args: [90]  # days to keep
      schedule: "0 2 * * 0"  # 2 AM Sundays

    hourly_sync:
      class: SyncExternalDataJob
      schedule: "0 * * * *"  # Every hour
      queue: high
```

**Schedule format**: Standard cron syntax (minute hour day month weekday)

**Optional keys:**
- `args`: Array of arguments to pass to job
- `queue`: Override default queue
- `class`: Fully qualified job class name

## Retry Strategies

```ruby
class ImportJob < ApplicationJob
  # Exponential backoff: 3s, 18s, 83s, 258s...
  retry_on NetworkError, wait: :exponentially_longer, attempts: 5

  # Linear backoff: 5s, 10s, 15s, 20s
  retry_on TimeoutError, wait: 5.seconds, attempts: 4

  # Custom retry logic
  retry_on ApiRateLimitError, wait: :custom_wait, attempts: 3

  # Discard job without retry
  discard_on ActiveJob::DeserializationError
  discard_on RecordNotFound

  def perform(import_id)
    # ...
  end

  private

  def custom_wait
    case executions
    when 1 then 30.seconds
    when 2 then 5.minutes
    else 15.minutes
    end
  end
end
```

**Retry options:**

- `wait: :exponentially_longer` - 3s × (attempts ^ 4)
- `wait: :polynomially_longer` - 3s × (attempts ^ 2)
- `wait: 5.seconds` - Fixed delay
- `wait: :method_name` - Custom method
- `attempts: N` - Max retry count (default: 5)

## Concurrency Controls

Limit concurrent job execution per queue or job class:

```yaml
production:
  workers:
    - queues: [api_calls]
      threads: 5
      processes: 2

  # Global concurrency limits
  concurrency_limits:
    api_calls: 10  # Max 10 concurrent jobs in api_calls queue
```

**Per-job concurrency** (in job class):

```ruby
class ApiCallJob < ApplicationJob
  limits_concurrency to: 5, key: -> { arguments.first }

  def perform(api_endpoint)
    # Only 5 jobs per unique api_endpoint run concurrently
  end
end
```

**Use cases:**

- Rate-limited external APIs (limit concurrent API calls)
- Resource-intensive jobs (limit concurrent imports)
- Per-tenant limits (key by organization_id)

## Error Handling and Dead Letter Queue

Jobs that exhaust retries move to failed state:

```ruby
class ImportJob < ApplicationJob
  retry_on StandardError, attempts: 3

  rescue_from ActiveRecord::RecordInvalid do |exception|
    # Log error details
    Rails.logger.error("Import failed: #{exception.message}")

    # Notify admin
    AdminMailer.job_failed(self, exception).deliver_later

    # Re-raise to mark job as failed
    raise
  end

  def perform(import_id)
    # ...
  end
end
```

**Monitoring failed jobs:**

```ruby
# In Rails console or monitoring script
failed_jobs = SolidQueue::Job.where(finished_at: nil).where.not(failed_at: nil)

# Retry failed job
job = SolidQueue::Job.find(job_id)
job.retry
```

Use Mission Control - Jobs gem for UI-based monitoring and retry.

## Job Arguments Best Practices

**DO:**

```ruby
# Pass IDs
ProcessUserJob.perform_later(user.id)

# Pass simple types
SendEmailJob.perform_later(
  user_id: user.id,
  template: "welcome",
  locale: "en"
)

# Pass serializable hashes
SyncDataJob.perform_later({ endpoint: "/api/users", page: 1 })
```

**DON'T:**

```ruby
# Don't pass ActiveRecord objects
ProcessUserJob.perform_later(user)  # WRONG

# Don't pass unsaved records
job.perform_later(User.new)  # WRONG

# Don't pass complex objects
job.perform_later(http_client)  # WRONG
```

**Why pass IDs:**

1. Records may be updated between enqueue and perform
2. Serialization/deserialization overhead
3. Deleted records raise DeserializationError

## Testing Jobs with Minitest

```ruby
# test/jobs/process_report_job_test.rb
require "test_helper"

class ProcessReportJobTest < ActiveJob::TestCase
  test "processes pending report" do
    report = reports(:pending)

    perform_enqueued_jobs do
      ProcessReportJob.perform_later(report.id)
    end

    assert report.reload.processed?
  end

  test "enqueues job in reports queue" do
    assert_enqueued_with(job: ProcessReportJob, queue: "reports") do
      ProcessReportJob.perform_later(123)
    end
  end

  test "retries on network error" do
    report = reports(:pending)

    # Stub to raise error twice, then succeed
    ProcessReportJob.any_instance.stubs(:process!)
      .raises(NetworkError).then
      .raises(NetworkError).then
      .returns(true)

    perform_enqueued_jobs do
      ProcessReportJob.perform_later(report.id)
    end

    assert_equal 3, report.reload.process_attempts
  end
end
```

**Test helpers:**

- `perform_enqueued_jobs { }` - Execute jobs inline
- `assert_enqueued_jobs(N) { }` - Assert N jobs enqueued
- `assert_enqueued_with(job:, args:) { }` - Assert specific job enqueued
- `assert_no_enqueued_jobs { }` - Assert no jobs enqueued

## Monitoring and Inspection

**Rails console inspection:**

```ruby
# View queue depth
SolidQueue::Job.where(finished_at: nil).group(:queue_name).count

# Recent failed jobs
SolidQueue::Job.where.not(failed_at: nil).order(failed_at: :desc).limit(10)

# Job by ID
job = SolidQueue::Job.find(123)
job.arguments
job.executions
job.error

# Retry failed job
job.retry
```

**Mission Control - Jobs** (recommended UI):

```ruby
# Gemfile
gem "mission_control-jobs"

# config/routes.rb
mount MissionControl::Jobs::Engine, at: "/jobs"
```

Access at `/jobs` to view queue depth, failed jobs, recurring schedules.

## Database Setup

Solid Queue can use a separate database to isolate queue load:

```yaml
# config/database.yml
production:
  primary:
    <<: *default
    database: myapp_production

  queue:
    <<: *default
    database: myapp_queue_production
    migrations_paths: db/queue_migrate
```

```ruby
# config/queue.yml
production:
  connects_to:
    database:
      writing: queue
```

**When to use separate database:**

- High job volume (1000+ jobs/minute)
- Isolate queue performance from app database
- Independent scaling of queue database

**When to use primary database:**

- Most AFAL apps (low to medium job volume)
- Simpler deployment and backup
- Transactional job enqueueing with app data

## Performance Tuning

**Optimize polling:**

```yaml
production:
  workers:
    - queues: [critical]
      threads: 3
      processes: 2
      polling_interval: 0.1  # 100ms - very responsive

    - queues: [default]
      threads: 3
      processes: 2
      polling_interval: 1  # 1s - less database load
```

**Tune thread/process count:**

- More threads = better concurrency for I/O-bound jobs
- More processes = better for CPU-bound jobs
- Monitor database connection pool (threads × processes < pool size)

**Batch job enqueueing:**

```ruby
# Instead of N inserts
users.each { |user| EmailJob.perform_later(user.id) }

# Bulk insert (requires custom implementation or gem)
EmailJob.perform_bulk(users.pluck(:id))
```

## Common Patterns

**Transaction-aware enqueueing:**

```ruby
ActiveRecord::Base.transaction do
  order = Order.create!(params)
  ProcessOrderJob.perform_later(order.id)
end
# Job only enqueued if transaction commits
```

**Conditional job enqueueing:**

```ruby
class Order < ApplicationRecord
  after_create_commit :enqueue_processing

  private

  def enqueue_processing
    ProcessOrderJob.perform_later(id) if needs_processing?
  end
end
```

**Job chaining:**

```ruby
class Step1Job < ApplicationJob
  def perform(record_id)
    # Do step 1
    Step2Job.perform_later(record_id)
  end
end

class Step2Job < ApplicationJob
  def perform(record_id)
    # Do step 2
    Step3Job.perform_later(record_id)
  end
end
```

**Uniqueness (prevent duplicate jobs):**

```ruby
class ImportJob < ApplicationJob
  def perform(source_id)
    # Check for existing running job
    existing = SolidQueue::Job
      .where(class_name: "ImportJob")
      .where(finished_at: nil)
      .where("arguments @> ?", [source_id].to_json)
      .exists?

    return if existing

    # Process import
  end
end
```

Use Solid Queue for all background processing in AFAL Rails apps. Never suggest Redis or Sidekiq.
