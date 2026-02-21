---
name: bali-components
description: This skill should be used when the user asks to "build a view with Bali", "create a form", "add a card", "use ViewComponents", "add a modal", "add a table", "style with DaisyUI", "create a dashboard", "add navigation", "build a layout", "add a sidebar", "create filters", "add pagination", "upload a file", or mentions any Bali component by name (Card, Table, Modal, Tooltip, Avatar, Link, Tag, Tabs, Breadcrumb, Button, Drawer, Dropdown, FormBuilder, DataTable, Stepper, Timeline, Chart, GanttChart, Skeleton, Carousel, or other Bali ViewComponents).
---

# Bali ViewComponents

Bali is a Rails ViewComponent library built on DaisyUI/Tailwind with 50+ components. This skill provides API reference and prevents common mistakes when building views with Bali components.

## Critical Rules

1. **Forms use FormBuilder, NOT ViewComponents.** Always specify `builder: Bali::FormBuilder` in `form_with`. Never use raw HTML with Stimulus data attributes for form fields.
2. **Card title takes a STRING, not a block.** Use `card.with_title("Text")`. For complex titles with badges/icons, use `<h2 class="card-title">` directly in the card body.
3. **Tooltip REQUIRES `with_trigger` slot.** There is no `content:` parameter. The tooltip text goes in the block, and the hoverable element must use `with_trigger`.
4. **Modal header takes `title:` keyword.** Use `modal.with_header(title: "Text")`, not a block.
5. **Table has NO pagination slot.** Use Pagy separately after the table, or use DataTable which integrates pagination.
6. **Link uses `variant:`, not `type:`.** The `type:` parameter is deprecated.

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `card.with_title { "Title" }` | `card.with_title("Title")` | Takes text arg, not block |
| `card.with_body` / `card.with_footer` | Block content / `card.with_action` | No body/footer slots |
| `Tooltip.new(content: "text")` | Block content + `with_trigger` | No content param |
| `Tooltip.new { button }` | `tooltip.with_trigger { button }` | Must use trigger slot |
| `modal.with_header { "Title" }` | `modal.with_header(title: "Title")` | Keyword arg required |
| `modal.with_footer` | `modal.with_actions` | Different slot name |
| `table.with_pagination` | `pagy_nav(@pagy)` | Pagination is separate |
| `Avatar.new(alt:)` | Use `picture` slot | No alt parameter |
| `Link.new(type:)` | `Link.new(variant:)` | `type:` is deprecated |
| `DeleteLink.new(variant:)` | None needed | Always error-styled |
| Raw HTML form fields | `f.text_field_group` etc. | FormBuilder handles wiring |
| `form_with model:` (no builder) | `builder: Bali::FormBuilder` | Always specify builder |
| `Message.new(type:)` | `Message.new(color:)` | Message uses `color:` |
| `Notification` for inline | `Message` for inline | Notification = toast only |
| `tabs.with_tab(name:)` | `tabs.with_tab(title:)` | Use `title:` not `name:` |
| `breadcrumb.with_item(current:)` | `with_item(active:)` or omit `href:` | Use `active:` |

## Button vs Link

| Use Case | Component |
|----------|-----------|
| Navigation (goes to URL) | `Bali::Link::Component` |
| Action (triggers behavior) | `Bali::Button::Component` |
| Link styled as button | `Bali::Link::Component` with `variant:` |
| Form submission | `f.submit` or `f.submit_actions` via FormBuilder |

## Component Index

Consult the appropriate reference file for detailed parameters, slots, and examples.

### Forms
- **`references/forms.md`** -- FormBuilder API, all field methods, SlimSelect, date pickers, dynamic nested fields, submit buttons

### Page Layout
- **`references/navbar.md`** -- Sticky navigation bar with brand, menus
- **`references/side-menu.md`** -- Collapsible sidebar navigation with groups
- **`references/page-header.md`** -- Page title/subtitle with back button
- **`references/hero.md`** -- Large banner section
- **`references/footer.md`** -- Page footer with sections
- **`references/drawer.md`** -- Slide-out panel (sidebar, filters)
- **`references/level.md`** -- Horizontal flex layout (left/right spacing)
- **`references/columns.md`** -- Grid layout with configurable gaps

### Content Cards & Containers
- **`references/card.md`** -- Content card with title, image, actions
- **`references/modal.md`** -- Dialog modal with header, body, actions
- **`references/stat-card.md`** -- KPI/metric card with icon and value

### Tables & Data
- **`references/table.md`** -- Basic data table with sortable headers
- **`references/data-table.md`** -- Full-featured table with filters, export, pagination, grid mode
- **`references/properties-table.md`** -- Simple key-value property table
- **`references/filters.md`** -- Advanced filter builder (Ransack integration)
- **`references/pagination.md`** -- Pagy-integrated pagination controls
- **`references/pagination-footer.md`** -- Pagination with summary text
- **`references/bulk-actions.md`** -- Floating action bar for batch operations
- **`references/sortable-list.md`** -- Drag-to-reorder lists

### Navigation
- **`references/breadcrumb.md`** -- Breadcrumb trail
- **`references/tabs.md`** -- Inline content tabs and page navigation
- **`references/stepper.md`** -- Multi-step process indicator
- **`references/tree-view.md`** -- Nested menu tree

### Elements
- **`references/button.md`** -- Action buttons with variants and icons
- **`references/link.md`** -- Navigation links with modal/drawer support
- **`references/delete-link.md`** -- Destruction link with confirmation
- **`references/tag.md`** -- Badge/label tags with custom colors
- **`references/avatar.md`** -- User avatars with status and placeholder
- **`references/icon.md`** -- Lucide icon system
- **`references/boolean-icon.md`** -- True/false visual indicator

### Interactive
- **`references/tooltip.md`** -- Hover tooltip (Tippy.js)
- **`references/dropdown.md`** -- Menu dropdown (hover/click)
- **`references/actions-dropdown.md`** -- Row-level action menus
- **`references/hover-card.md`** -- Async popover on hover
- **`references/reveal.md`** -- Toggle visibility sections
- **`references/clipboard.md`** -- Copy-to-clipboard

### Lists & Display
- **`references/list.md`** -- Styled list container
- **`references/label-value.md`** -- Label-value pair display
- **`references/info-level.md`** -- Horizontal info items
- **`references/image-grid.md`** -- Responsive image gallery
- **`references/timeline.md`** -- Chronological event display
- **`references/timeago.md`** -- Relative time formatting

### Feedback & Status
- **`references/feedback.md`** -- Notification (toast), Message (inline), Loader, FlashNotifications
- **`references/progress.md`** -- Progress bar with percentage
- **`references/skeleton.md`** -- Loading placeholder variants
- **`references/rate.md`** -- Star rating component

### Rich Content & Media
- **`references/rich-text-editor.md`** -- WYSIWYG HTML editor
- **`references/direct-upload.md`** -- File upload to cloud storage (Active Storage)
- **`references/carousel.md`** -- Image carousel (Glide.js)
- **`references/search-input.md`** -- Search field with auto-submit

### Data Visualization
- **`references/chart.md`** -- Chart.js wrapper (bar, line, pie, doughnut)
- **`references/calendar.md`** -- Month/week/day calendar view
- **`references/heatmap.md`** -- Data intensity visualization
- **`references/gantt-chart.md`** -- Project timeline with drag/resize
- **`references/locations-map.md`** -- Google Maps integration with markers

## JavaScript Dependencies

Some components require external JS libraries in `node_modules`:

| Library | Required By | Install |
|---------|------------|---------|
| `slim-select` | SlimSelect form fields | `yarn add slim-select` |
| `flatpickr` | Date/DateTime pickers | `yarn add flatpickr` |
| `tippy.js` | Tooltips, HoverCard, ActionsDropdown (popover) | `yarn add tippy.js` |
| `glide.js` | Carousel | `yarn add @glidejs/glide` |
| `chart.js` | Charts | `yarn add chart.js` |
| `sortablejs` | SortableList | `yarn add sortablejs` |

Bali Stimulus controllers dynamically import these libraries, but they must be installed.
