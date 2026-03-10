# DocumentPage

Three-panel document editor layout: collapsible TOC (left), document body (center), collapsible metadata/preview panel (right).

## Parameters

- `title:` (String, required) - Page title
- `subtitle:` (String, optional) - Subtitle text
- `breadcrumbs:` (Array, default: []) - Array of hashes with keys: `text`, `href`
- `back:` (String, optional) - Back button URL
- `initial_content:` (Hash/JSON, optional) - BlockEditor document content; when provided, renders a BlockEditor and auto-generates TOC from headings
- `toc_open:` (Boolean, default: true) - Whether the TOC panel starts expanded
- `metadata_open:` (Boolean, default: true) - Whether the metadata/preview panel starts expanded

## Slots

- `title_tags` (renders_many) - Tags displayed inline next to the title
- `actions` (renders_many) - Action buttons in the page header
- `metadata` (renders_one) - Right-panel metadata section content
- `preview` (renders_one) - Right-panel preview section content (shown below metadata)

## Layout

- Breadcrumbs (if provided) -> PageHeader (title + tags + subtitle + back + actions) -> Three-column body
- **Left panel (TOC):** Auto-generated table of contents from BlockEditor headings; collapsible via Stimulus
- **Center panel:** BlockEditor (when `initial_content` provided) or yielded block content
- **Right panel:** Metadata slot + Preview slot stacked; collapsible via Stimulus
- Side panels collapse to icon-only rail when closed

## Usage

### Document page with BlockEditor

```erb
<%= render Bali::DocumentPage::Component.new(
  title: @document.title,
  subtitle: "Last updated #{time_ago_in_words(@document.updated_at)} ago",
  breadcrumbs: [
    { text: "Projects", href: projects_path },
    { text: @project.name, href: project_path(@project) }
  ],
  back: project_path(@project),
  initial_content: @document.content,
  toc_open: true,
  metadata_open: true
) do |page| %>
  <% page.with_title_tag do %>
    <%= render Bali::Tag::Component.new("Draft", color: :warning) %>
  <% end %>

  <% page.with_action do %>
    <%= render Bali::Link::Component.new("Publish", href: publish_document_path(@document), variant: :primary) %>
  <% end %>
  <% page.with_action do %>
    <%= render Bali::Link::Component.new("Edit", href: edit_document_path(@document), variant: :ghost, icon_name: "pencil") %>
  <% end %>

  <% page.with_metadata do %>
    <%= render Bali::PropertiesTable::Component.new do |pt| %>
      <% pt.with_property(label: "Owner") { @document.owner.name } %>
      <% pt.with_property(label: "Created") { l(@document.created_at, format: :short) } %>
      <% pt.with_property(label: "Status") { @document.status.humanize } %>
    <% end %>
  <% end %>

  <% page.with_preview do %>
    <%= render Bali::Card::Component.new(title: "Preview", style: :bordered) do %>
      <div class="card-body">
        <!-- rendered document preview -->
      </div>
    <% end %>
  <% end %>
<% end %>
```

### Document page with collapsed panels

```erb
<%= render Bali::DocumentPage::Component.new(
  title: @charter.title,
  back: project_path(@project),
  initial_content: @charter.content,
  toc_open: false,
  metadata_open: false
) do |page| %>
  <% page.with_action do %>
    <%= render Bali::Link::Component.new("Save", href: "#", variant: :primary) %>
  <% end %>
<% end %>
```

## Notes

- When `initial_content` is provided, a BlockEditor is rendered in the center panel and TOC headings are extracted automatically; omit it to render custom content in the center instead
- `toc_open:` and `metadata_open:` control the initial collapsed/expanded state; users can toggle panels at runtime via the Stimulus controller
- The `metadata` and `preview` slots are independent -- render either, both, or neither
- `breadcrumbs` keys are `text` and `href` (unlike ShowPage/FormPage which use `name` and `href`)
- Uses `PageComponents::Shared` internally for breadcrumbs, back button, and page header
