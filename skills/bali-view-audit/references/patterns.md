# Bali View Audit - Pattern Detection Reference

Comprehensive mapping of raw HTML patterns to Bali ViewComponent replacements, organized by priority. Use this reference when scanning views for audit opportunities.

## HIGH Priority - Structural Replacements

These patterns have the biggest impact on view consistency and maintainability.

### Page Structure

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<div class="flex justify-between">` with heading + buttons | `Bali::PageHeader::Component` | Grep for `<h1` or `<h2` adjacent to action buttons/links |
| `<nav class="navbar">` or custom header bars | `Bali::Navbar::Component` | Grep for `navbar` class or sticky nav elements |
| `<div class="hero">` or large banner sections | `Bali::Hero::Component` | Grep for `hero` class |
| `<footer>` with link columns | `Bali::Footer::Component` | Grep for `<footer` tags |
| `<aside>` or sidebar navigation | `Bali::SideMenu::Component` | Grep for `<aside`, `sidebar`, `side-menu` classes |
| `<div class="drawer">` or slide-out panels | `Bali::Drawer::Component` | Grep for `drawer` class |
| Custom breadcrumb `<nav>` or `<ol>` trails | `Bali::Breadcrumb::Component` | Grep for `breadcrumb` class or `aria-label="breadcrumb"` |

### Tables & Data

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<table class="table">` with manual headers | `Bali::Table::Component` | Grep for `<table` |
| Table + filters + pagination combined | `Bali::DataTable::Component` | Tables with adjacent filter forms and pagy calls |
| `<dl>` definition lists for key-value data | `Bali::PropertiesTable::Component` | Grep for `<dl` |
| Manual pagination links | `Bali::Pagination::Component` | Grep for page navigation patterns not using Pagy helpers |
| Table + `pagy_nav` + summary text | `Bali::PaginationFooter::Component` | Adjacent pagination + record count text |

### Forms

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `form_with` without `builder: Bali::FormBuilder` | Add `builder: Bali::FormBuilder` | Grep for `form_with` missing `Bali::FormBuilder` |
| Raw `<input>` or `<select>` with Stimulus data attrs | FormBuilder field methods | Grep for `data-controller` inside form tags |
| Manual slim-select wiring | `f.slim_select_group` | Grep for `slim-select` controller in forms |
| Manual flatpickr wiring | `f.date_field_group` | Grep for `flatpickr` or `datepicker` controller in forms |
| Manual file upload UI | `f.file_field_group` or `f.direct_upload_field_group` | Grep for `<input type="file"` |
| Manual nested field add/remove buttons | `f.dynamic_fields_group` | Grep for nested fields with manual JS add/remove |

### Cards & Modals

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<div class="card">` with manual structure | `Bali::Card::Component` | Grep for `card` class with nested `card-body`, `card-title` |
| `<div class="modal">` with manual JS | `Bali::Modal::Component` | Grep for `modal` class |
| KPI/metric display with icon + number | `Bali::StatCard::Component` | Grep for stat/metric cards with large numbers |

## MEDIUM Priority - Repeated UI Patterns

### Navigation & Tabs

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<div class="tabs">` or manual tab switching | `Bali::Tabs::Component` | Grep for `tabs` class or tab-switching JS |
| `<ol>` or `<ul>` with step indicators | `Bali::Stepper::Component` | Grep for step/wizard patterns |
| Nested collapsible menu trees | `Bali::TreeView::Component` | Grep for recursive menu structures |

### Lists & Display

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<ul class="menu">` or styled lists | `Bali::List::Component` | Grep for `menu` class on `<ul>` |
| `<div class="flex justify-between">` for label: value | `Bali::LabelValue::Component` | Grep for paired label/value text in flex containers |
| Manual horizontal info layouts | `Bali::Level::Component` | Grep for flex containers with left/right children |
| `<div class="grid">` with manual columns | `Bali::Columns::Component` | Grep for `grid` class with `grid-cols-` |
| `<div class="timeline">` or chronological lists | `Bali::Timeline::Component` | Grep for `timeline` class or chronological event lists |

### Interactive Elements

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<div class="dropdown">` with manual trigger | `Bali::Dropdown::Component` | Grep for `dropdown` class |
| Three-dot/ellipsis action menus | `Bali::ActionsDropdown::Component` | Grep for ellipsis icons with adjacent menus |
| Manual tooltip with `title=` attribute | `Bali::Tooltip::Component` | Grep for `title=` on interactive elements |
| Hover cards with manual Tippy.js | `Bali::HoverCard::Component` | Grep for `tippy` data attributes |
| Show/hide toggle sections | `Bali::Reveal::Component` | Grep for toggle visibility patterns |
| Copy-to-clipboard buttons | `Bali::Clipboard::Component` | Grep for clipboard/copy patterns |

### Elements

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<a class="btn">` or styled links | `Bali::Link::Component` | Grep for `<a` with `btn` class |
| `<button>` with manual styling | `Bali::Button::Component` | Grep for `<button` with Tailwind classes |
| `<span class="badge">` | `Bali::Tag::Component` | Grep for `badge` class |
| `<div class="avatar">` with manual img | `Bali::Avatar::Component` | Grep for `avatar` class |
| `<i>` or `<svg>` icon markup | `Bali::Icon::Component` | Grep for inline SVG or icon font tags |
| Manual true/false check/X rendering | `Bali::BooleanIcon::Component` | Grep for conditional check/X icon patterns |
| `<time>` or manual "ago" formatting | `Bali::Timeago::Component` | Grep for `time_ago_in_words` or `<time` tags |

### Feedback

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| `<div class="alert">` for flash messages | `Bali::FlashNotifications::Component` | Grep for `alert` class in layouts |
| Manual toast notifications | `Bali::Notification::Component` | Grep for fixed-position alert elements |
| Inline alert/message boxes | `Bali::Message::Component` | Grep for `alert` class in non-layout views |
| Custom loading spinners | `Bali::Loader::Component` | Grep for `loading` class or spinner patterns |
| Manual progress bars | `Bali::Progress::Component` | Grep for `progress` class or width-based bars |
| Placeholder/skeleton loading states | `Bali::Skeleton::Component` | Grep for `skeleton` or `animate-pulse` patterns |
| Manual star rating UI | `Bali::Rate::Component` | Grep for star/rating patterns |

## LOW Priority - Specialized Components

| Raw HTML Pattern | Bali Component | Detection |
|-----------------|----------------|-----------|
| Image galleries with manual grid | `Bali::ImageGrid::Component` | Grep for image grid layouts |
| Manual carousel/slider | `Bali::Carousel::Component` | Grep for carousel/slider patterns |
| Manual Chart.js initialization | `Bali::Chart::Component` | Grep for `Chart.js` or canvas chart elements |
| Manual calendar rendering | `Bali::Calendar::Component` | Grep for calendar grid patterns |
| Manual Gantt chart | `Bali::GanttChart::Component` | Grep for Gantt/timeline task visualizations |
| Manual Google Maps integration | `Bali::LocationsMap::Component` | Grep for Google Maps initialization |
| Manual heatmap rendering | `Bali::Heatmap::Component` | Grep for heatmap/matrix data visualizations |
| Drag-to-reorder with manual SortableJS | `Bali::SortableList::Component` | Grep for `Sortable` JS or drag-handle patterns |
| Manual search input with auto-submit | `Bali::SearchInput::Component` | Grep for search inputs with debounce/submit JS |
| Bulk selection checkboxes + floating bar | `Bali::BulkActions::Component` | Grep for select-all/bulk-action patterns |
| Manual rich text editor setup | `Bali::RichTextEditor::Component` | Grep for Trix/ActionText without Bali wrapper |
| Manual Active Storage direct upload UI | `Bali::DirectUpload::Component` | Grep for direct upload JS without Bali wrapper |
| Advanced filter builder UI | `Bali::Filters::Component` | Grep for complex filter forms with add/remove groups |

## Common Anti-Patterns (ALWAYS Check)

These are wrong usages of existing Bali components that must be corrected.

| Anti-Pattern | Correct Usage | Grep Command |
|--------------|---------------|-------------|
| `Link.new(type: :ghost)` | `Link.new(variant: :ghost)` | `type:` in Link renders |
| `card.with_body { }` | Content goes directly in card block | `with_body` in card renders |
| `card.with_footer { }` | `card.with_action { }` for each action | `with_footer` in card renders |
| `card.with_title { "Text" }` | `card.with_title("Text")` | Block-style title calls |
| `modal.with_footer { }` | `modal.with_actions { }` | `with_footer` in modal renders |
| `modal.with_header { "Title" }` | `modal.with_header(title: "Title")` | Block-style header calls |
| `Tooltip.new(content: "text")` | Block content + `with_trigger` slot | `content:` in Tooltip renders |
| `Avatar.new(alt: "text")` | Use `picture` slot | `alt:` in Avatar renders |
| `Message.new(type: :warning)` | `Message.new(color: :warning)` | `type:` in Message renders |
| `tabs.with_tab(name: "X")` | `tabs.with_tab(title: "X")` | `name:` in tab calls |
| `breadcrumb.with_item(current: true)` | `with_item(active: true)` or omit `href:` | `current:` in breadcrumb calls |
| `Tag.new(light: true)` | `Tag.new(style: :outline)` | `light:` in Tag renders (deprecated) |
| `form_with` without `builder:` | `form_with builder: Bali::FormBuilder` | `form_with` missing builder |
| Raw HTML `data-controller="slim-select"` | `f.slim_select_group` | Manual Stimulus wiring in forms |
| `Bali::Form::TextField::Component` | `f.text_field_group` | Form ViewComponents instead of FormBuilder |
| `DeleteLink.new(variant: :error)` | No variant needed, always error-styled | `variant:` in DeleteLink renders |

## Audit Grep Commands

Quick commands to scan a Rails project for common patterns. **Note:** Within Claude Code, use the Grep tool instead of running these as bash commands. These are provided as reference for the patterns to search for:

```bash
# Forms without Bali FormBuilder
grep -rn "form_with" app/views/ --include="*.erb" | grep -v "Bali::FormBuilder"

# Deprecated Link type: parameter
grep -rn "Link::Component.new" app/views/ --include="*.erb" | grep "type:"

# Raw HTML tables
grep -rn "<table" app/views/ --include="*.erb" | grep -v "Bali::"

# Raw definition lists (should be PropertiesTable)
grep -rn "<dl" app/views/ --include="*.erb"

# Manual card structure
grep -rn 'class="card' app/views/ --include="*.erb" | grep -v "Bali::"

# Manual modal structure
grep -rn 'class="modal' app/views/ --include="*.erb" | grep -v "Bali::"

# Manual breadcrumbs
grep -rn "breadcrumb" app/views/ --include="*.erb" | grep -v "Bali::"

# Raw avatar markup
grep -rn 'class="avatar' app/views/ --include="*.erb" | grep -v "Bali::"

# Manual tooltip (title attribute)
grep -rn 'title="' app/views/ --include="*.erb" | grep -v "Bali::"

# Manual badge/tag markup
grep -rn 'class="badge' app/views/ --include="*.erb" | grep -v "Bali::"

# Inline SVG icons (should use Icon component)
grep -rn "<svg" app/views/ --include="*.erb"

# Manual flash message rendering
grep -rn "flash\[" app/views/layouts/ --include="*.erb" | grep -v "Bali::"

# Forms with manual Stimulus controllers (should use FormBuilder)
grep -rn 'data-controller="slim-select\|datepicker\|file-input"' app/views/ --include="*.erb"
```
