# Review Categories and Severity Levels

## Review Categories

### Models
- Uses concerns for shared behavior
- Rich domain logic (not anemic)
- Proper scopes defined
- Callbacks are appropriate (data integrity only)
- No service object patterns
- State changes use separate records

### Controllers
- Thin controllers (< 10 lines per action)
- CRUD only (no custom actions)
- Proper authorization (Pundit)
- Uses Current attributes
- Responds to turbo_stream format

### Views/Components
- Uses Bali page components for full page layouts (IndexPage, ShowPage, FormPage, DashboardPage)
- Uses AppLayout in layout files for admin sidebar structure
- Uses Bali ViewComponents for UI elements (Card, DataTable, etc.)
- DaisyUI semantic classes via Bali (not raw HTML)
- Proper Turbo Frame usage
- No inline JavaScript
- Accessible markup

### JavaScript
- Stimulus controllers focused
- Uses Values API
- Uses Targets API
- No jQuery patterns
- Proper event handling

### Tests
- Uses fixtures (not factories)
- Tests business logic
- Doesn't test framework
- Proper setup/teardown
- Current attributes set

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Violates core principles | Must fix before merge |
| **Major** | Not Rails-worthy | Should fix |
| **Minor** | Could be improved | Nice to have |
| **Info** | Suggestions | Optional |
