# E2E Browser Testing with agent-browser

Reference guide for end-to-end browser testing of AFAL Rails features using `agent-browser`.

## Core Workflow

```
1. Start dev server
2. Navigate as a real user (from root, not direct URL)
3. Exercise all primary flows for the story
4. Take screenshots at key steps
5. Feed screenshots to frontend-ui-ux for visual review
6. Apply improvements
7. Stop server
```

## Server Setup and Teardown

### Starting the server

```bash
# Start in background, daemonized, on a dedicated port to avoid conflict
bin/rails server -p 3001 -e development -d --pid tmp/pids/server-e2e.pid

# Wait for readiness (up to 30s)
timeout 30 bash -c 'until curl -sf http://localhost:3001/up > /dev/null 2>&1; do sleep 1; done' \
  && echo "Server ready" \
  || echo "Server did not start in time"
```

### Stopping the server

```bash
kill $(cat tmp/pids/server-e2e.pid 2>/dev/null) 2>/dev/null || true
rm -f tmp/pids/server-e2e.pid
```

## Authentication in AFAL Apps

AFAL apps use OmniAuth with an external IdP. Browser-based E2E tests require one of these approaches:

### Option 1: OmniAuth Dev Bypass (preferred)

Check for a dev auth bypass in the project:

```bash
# Check for bypass initializer
grep -r "BYPASS_AUTH\|omniauth.*test_mode\|developer" config/initializers/ 2>/dev/null
# Check .env.development
grep -i "bypass\|auth_skip\|dev_auth" .env.development 2>/dev/null
```

If a bypass exists (e.g., `BYPASS_AUTH=true`), start the server with it:

```bash
BYPASS_AUTH=true bin/rails server -p 3001 -e development -d --pid tmp/pids/server-e2e.pid
```

### Option 2: OmniAuth Test Mode

Some projects configure OmniAuth in mock mode for non-production environments:

```ruby
# config/initializers/omniauth.rb
OmniAuth.config.test_mode = true if Rails.env.development?
```

When test mode is active, navigate to `/auth/afal_sso` and the app will auto-login with mock credentials.

### Option 3: Use Existing Dev Session (workaround)

If neither bypass exists, document the gap and skip E2E testing for auth-gated flows. Add a note to the PR:

> E2E browser testing skipped: no dev auth bypass configured. Consider adding `BYPASS_AUTH` dev mode.

### Checking auth state after opening

```bash
agent-browser open http://localhost:3001
agent-browser snapshot -i -c  # Check if login form or app shell appears
agent-browser get url          # Verify not redirected to IdP
```

## Screenshot Workflow

### Naming convention

```bash
tmp/screenshots/e2e-[step-number]-[description].png
```

Example sequence:
```
tmp/screenshots/e2e-01-nav-link.png
tmp/screenshots/e2e-02-index-empty.png
tmp/screenshots/e2e-03-new-form.png
tmp/screenshots/e2e-04-after-create.png
tmp/screenshots/e2e-05-show-page.png
tmp/screenshots/e2e-06-edit-form.png
tmp/screenshots/e2e-07-after-update.png
tmp/screenshots/e2e-08-after-delete.png
```

### Taking screenshots

```bash
# After each major step
agent-browser screenshot tmp/screenshots/e2e-01-nav-link.png
agent-browser screenshot --full tmp/screenshots/e2e-02-index-empty.png  # Full page
```

Always take full-page screenshots for index/show/form pages to capture the complete layout.

## Core Navigation Pattern

**Always navigate from the application root**, not by typing the feature URL directly. This tests that UI integration (Phase 1.5) works correctly.

```bash
# Start at root
agent-browser open http://localhost:3001/

# Snapshot to find nav links
agent-browser snapshot -i -c

# Click through navigation (sidebar, top nav, or parent page link)
agent-browser find text "Feature Name" click
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-01-nav-click.png
```

## CRUD Flow Patterns

### Index page (empty state)

```bash
agent-browser screenshot --full tmp/screenshots/e2e-02-index-empty.png

# Verify: empty state message is visible, "New X" button present
agent-browser snapshot -i -c
# Look for: empty state text, new/create button ref
```

### Create flow

```bash
# Click "New" button
agent-browser find role button click --name "New"  # or find text "Add"
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-03-new-form.png

# Fill form fields (snapshot first to get refs)
agent-browser snapshot -i
# Then use refs:
agent-browser fill @e1 "Test value"
agent-browser select @e2 "Option 1"

# Submit
agent-browser find role button click --name "Save"  # or "Create" / "Submit"
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-04-after-create.png

# Verify: success flash, record visible
agent-browser snapshot -c
# Look for: success alert/toast, record in list or show page
```

### Show page

```bash
# Click on the newly created record
agent-browser find text "Test value" click
agent-browser wait --load networkidle
agent-browser screenshot --full tmp/screenshots/e2e-05-show-page.png
```

### Edit flow

```bash
# Find and click edit action
agent-browser find text "Edit" click  # or find role button --name "Edit"
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-06-edit-form.png

# Modify a field
agent-browser snapshot -i
agent-browser fill @e1 "Updated value"

# Submit
agent-browser find role button click --name "Save"
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-07-after-update.png
```

### Delete flow

```bash
# Find delete button/link
agent-browser find text "Delete" click  # Triggers confirmation dialog or Turbo confirm
agent-browser wait 500  # Wait for dialog
agent-browser dialog accept  # Accept confirmation if present
agent-browser wait --load networkidle
agent-browser screenshot tmp/screenshots/e2e-08-after-delete.png

# Verify: record gone, back on index or success message
```

## Turbo-Specific Patterns

AFAL apps use Turbo. After Turbo navigation, re-snapshot to get fresh refs:

```bash
agent-browser click @e5  # Turbo Frame link click
agent-browser wait --load networkidle  # Wait for Turbo to settle
agent-browser snapshot -i  # Re-snapshot — old refs are invalid after navigation
```

For Turbo Stream updates (in-place DOM updates):

```bash
agent-browser click @e3  # Action that triggers stream
agent-browser wait 500   # Brief wait for stream to apply
agent-browser snapshot -c  # Re-snapshot to see updated DOM
```

For Turbo Frames (partial page updates):

```bash
# Scope snapshot to frame for cleaner output
agent-browser snapshot -i -s "turbo-frame#resource-list"
```

## What to Verify at Each Step

| Step | Check |
|------|-------|
| Nav to feature | Link present, no 404 |
| Index (empty) | Empty state message shown, "New" button present |
| Index (with data) | Record(s) listed correctly, pagination if >N items |
| New form | All fields render, labels match story requirements |
| After create | Success flash visible, data persists in list |
| Show page | All fields display, edit/delete actions present |
| Edit form | Form pre-populated with existing values |
| After update | Changes reflected, success flash |
| After delete | Record gone, no error |
| Authorization | If story includes Pundit policies: test with permitted and unauthorized users |

## Common Issues

### Refs invalidated after Turbo navigation

**Problem:** `agent-browser click @e5` fails with "ref not found"
**Solution:** Always `agent-browser snapshot -i` after any full-page navigation

### Server not ready

**Problem:** `curl` check fails, curl returns connection refused
**Solution:** Increase wait time or check for boot errors in `log/development.log`

```bash
tail -20 log/development.log
```

### Auth redirect loop

**Problem:** Browser keeps redirecting to IdP login
**Solution:** Check the bypass options above. If none exist, skip browser E2E for auth-gated flows and note in PR.

### Turbo Frame not loading

**Problem:** Frame content doesn't appear
**Solution:** Check Rails log for frame-specific errors; the frame src URL may be returning an error

```bash
agent-browser errors  # View browser console errors
```

## Integration with frontend-ui-ux Review

After taking screenshots, pass them together with the view files to `frontend-ui-ux`:

```
Invoke frontend-ui-ux for visual review of:
- Screenshots: tmp/screenshots/e2e-*.png
- View files: app/views/[resource]/**/*.erb, app/components/[name]*.rb

Review focus:
- Layout and spacing consistency with the rest of the app
- Bali component usage (prefer over raw HTML)
- Responsive behavior visible in screenshots
- Empty state visual quality
- Form layout and field grouping
- Typography and color consistency
```

The designer agent can view image files directly when given their paths. Provide the absolute paths to screenshots.

## Screenshot Cleanup

After the review and improvements are applied, clean up:

```bash
rm -rf tmp/screenshots/e2e-*.png
```

Do not commit screenshots to the repository.
