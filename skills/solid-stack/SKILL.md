---
name: solid-stack
description: This skill should be used when the user asks to add a background job, set up caching, add WebSocket functionality, use Solid Queue, configure Solid Cache, add real-time features, add a channel, schedule a job, add cable, or implement background processing in AFAL Rails applications.
---

# Solid Stack Patterns for AFAL Rails Apps

CRITICAL: AFAL Rails applications use Solid Queue, Solid Cache, and Solid Cable (Rails 8.1+ database-backed alternatives). NEVER suggest Redis, Sidekiq, or Redis-based solutions.

## Overview

The Solid trio provides database-backed infrastructure for Rails applications:

- **Solid Queue**: Background job processing (replaces Sidekiq/Resque)
- **Solid Cache**: Application caching (replaces Redis cache)
- **Solid Cable**: WebSocket/ActionCable backend (replaces Redis adapter)

All three use PostgreSQL, eliminating external dependencies and providing transactional consistency with the application database.

## Quick Decision Guide

| Need | Use | Example |
|------|-----|---------|
| Async processing (emails, reports, imports) | Solid Queue | `GenerateReportJob.perform_later(report_id)` |
| Reduce database queries | Solid Cache | `Rails.cache.fetch("stats") { expensive_query }` |
| Real-time UI updates | Solid Cable + Turbo Streams | `turbo_stream_from current_organization, "notifications"` |
| Scheduled tasks (daily, hourly) | Solid Queue recurring | Configure in `config/queue.yml` |

## Database-Backed Advantages

**Why database-backed over Redis:**

1. **No external dependencies** - One less service to manage, deploy, and monitor
2. **Transactional consistency** - Jobs enqueued in same transaction as records
3. **Built-in persistence** - No separate backup/persistence configuration
4. **Simplified deployment** - No Redis cluster, sentinel, or failover setup
5. **Cost reduction** - No Redis hosting fees in production

**Trade-offs to understand:**

- Slightly higher database load (usually negligible with proper indexing)
- PostgreSQL required (not an issue for AFAL apps)
- Less tooling maturity than Redis ecosystem (but improving rapidly)

## Common Mistakes

| Mistake | Why Wrong | Correct Approach |
|---------|-----------|------------------|
| Suggesting Redis or Sidekiq | AFAL standard is Solid Stack | Use Solid Queue for background jobs |
| Missing queue database migration | Solid Queue needs schema | Run `bin/rails solid_queue:install` |
| Passing AR objects to jobs | Serialization breaks, stale data | Pass IDs: `job.perform_later(user.id)` |
| Not configuring queues | Jobs pile up in default queue | Define queues in `config/queue.yml` |
| Forgetting cable migration | Solid Cable needs tables | Run `bin/rails solid_cable:install` |
| Using Redis cache config | Breaks caching | `config.cache_store = :solid_cache_store` |
| No queue monitoring | Silent failures | Use Solid Queue UI or Mission Control |

## Implementation Workflow

### Adding Background Jobs

1. Generate job: `bin/rails generate job ProcessReport`
2. Define job class (see `references/solid-queue.md`)
3. Configure queue in `config/queue.yml` if custom queue needed
4. Enqueue: `ProcessReportJob.perform_later(report_id)`
5. Test with `perform_enqueued_jobs` (Minitest)

### Adding Caching

1. Ensure Solid Cache installed: `bin/rails solid_cache:install`
2. Configure cache store in environment config
3. Use `Rails.cache.fetch` for low-level caching
4. Use `cache` helper in views/ViewComponents
5. Test with cache enabled in test environment

### Adding Real-Time Features

1. Install Solid Cable: `bin/rails solid_cable:install`
2. Generate channel: `bin/rails generate channel Notifications`
3. Define channel class with subscriptions
4. Add `turbo_stream_from` in views
5. Broadcast updates: `broadcast_*` methods or Turbo Stream broadcasts
6. Test channel subscriptions

## Configuration Files

**config/queue.yml** (Solid Queue):
```yaml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: "*"
      threads: 3
      processes: 2
      polling_interval: 0.1
```

**config/environments/production.rb** (Solid Cache):
```ruby
config.cache_store = :solid_cache_store
```

**config/cable.yml** (Solid Cable):
```yaml
production:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable
```

## Testing Patterns

**Testing jobs (Minitest):**
```ruby
test "processes report" do
  report = reports(:pending)

  perform_enqueued_jobs do
    ProcessReportJob.perform_later(report.id)
  end

  assert report.reload.processed?
end
```

**Testing with cache:**
```ruby
test "caches expensive computation" do
  Rails.cache.clear

  result1 = expensive_method
  result2 = expensive_method # Should hit cache

  assert_equal result1, result2
end
```

**Testing channels:**
```ruby
test "broadcasts notification" do
  assert_broadcasts "notifications", 1 do
    NotificationChannel.broadcast_to(user, message: "Test")
  end
end
```

## Deployment Considerations

**Zero-downtime deployments:**

1. **Database migrations first** - Run queue/cache/cable migrations before deploying code
2. **Job compatibility** - Ensure old workers can process new job signatures during rolling deploy
3. **Queue draining** - Allow in-flight jobs to complete before shutting down workers
4. **Connection pooling** - Size database pool for workers + web processes

**Monitoring:**

- Install Mission Control - Jobs gem for Solid Queue UI
- Monitor queue depth and job latency
- Set up alerts for failed jobs
- Track cache hit rates in production logs

## Reference Documentation

For detailed implementation patterns, see:

- `references/solid-queue.md` - Job classes, queues, recurring jobs, retries, concurrency
- `references/solid-cache.md` - Cache configuration, fragment caching, Russian doll caching
- `references/solid-cable.md` - Channels, broadcasting, Turbo Streams integration

## Key Principles

1. **Pass IDs not objects** - Serialize only primitives to jobs
2. **Idempotent jobs** - Design jobs to be safely retried
3. **Cache with versioning** - Invalidate caches properly on model updates
4. **Scope broadcasts** - Use organization/tenant scoping in multi-tenant apps
5. **Test async code** - Use `perform_enqueued_jobs` to test job execution
6. **Monitor queue health** - Track job failures and queue depth

When implementing Solid Stack features, always check existing AFAL patterns first. Many apps already have established queue configurations and caching strategies to follow.
