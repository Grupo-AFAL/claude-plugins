# Document Editor

Full-featured document editor with autosave, version history, and @mentions, built on BlockNote.

## Parameters

- `content:` - Initial document content (BlockNote JSON format)
- `autosave_url:` - URL to PATCH/PUT content to on autosave
- `autosave_interval:` - Autosave delay in milliseconds (default: `30_000`)
- `versions_url:` - URL to load version history from; omit to hide version panel
- `readonly:` - Render editor in read-only mode (default: `false`)
- `placeholder:` - Placeholder text shown when document is empty
- `mentions_url:` - URL to fetch @mention suggestions from
- `toolbar:` - Show formatting toolbar (default: `true`)
- `**options` - Additional HTML attributes on the outer element

## Slots

- `header` (`with_header`) - Content rendered above the editor
- `footer` (`with_footer`) - Content rendered below the editor

## Usage

```erb
<%# Basic editor with autosave %>
<%= render Bali::DocumentEditor::Component.new(
  content: @document.content,
  autosave_url: document_path(@document)
) %>

<%# Full-featured editor %>
<%= render Bali::DocumentEditor::Component.new(
  content: @document.content,
  autosave_url: document_path(@document),
  autosave_interval: 15_000,
  versions_url: document_versions_path(@document),
  mentions_url: users_search_path,
  placeholder: "Start writing..."
) do |editor| %>
  <% editor.with_header do %>
    <h2>Document Title</h2>
  <% end %>
  <% editor.with_footer do %>
    <span class="text-sm text-base-content/50">Last saved: 2 minutes ago</span>
  <% end %>
<% end %>

<%# Read-only view %>
<%= render Bali::DocumentEditor::Component.new(
  content: @document.content,
  readonly: true,
  toolbar: false
) %>

<%# Minimal editor without toolbar %>
<%= render Bali::DocumentEditor::Component.new(
  content: @note.content,
  autosave_url: note_path(@note),
  toolbar: false,
  placeholder: "Write a note..."
) %>
```

## Notes

- Built on BlockNote (JavaScript); requires the Bali JS bundle
- Content is stored and expected in BlockNote JSON format, not HTML
- Autosave fires a PATCH request after each `autosave_interval` ms of inactivity
- Version history panel is only shown when `versions_url:` is provided
- @mentions panel loads suggestions from `mentions_url:` as the user types
- AI assistance features activate automatically when the app has AI configured
- Use `readonly: true` + `toolbar: false` for a clean document viewer
