# Block Editor

Block-based content editor built on BlockNote.js, supporting slash commands, @mentions, AI assistance, and autosave.

## Parameters

- `content:` - Initial content (JSON format from BlockNote)
- `name:` - Name attribute for the hidden input field (for form integration)
- `autosave_url:` - URL to PATCH/PUT content to automatically
- `autosave_interval:` - Milliseconds between autosave attempts (default: 30000)
- `readonly:` - Render as read-only display, no editing (default: false)
- `placeholder:` - Placeholder text when editor is empty
- `mentions_url:` - URL endpoint to fetch @mention user suggestions
- `toolbar:` - Show the formatting toolbar (default: true)
- `ai:` - Enable AI assistance features (default: false)

## Usage

```erb
<%# Standalone editor with autosave %>
<%= render Bali::BlockEditor::Component.new(
  content: @post.body,
  autosave_url: post_path(@post),
  placeholder: "Start writing..."
) %>

<%# Inside a form (stores content in hidden field) %>
<%= form_with model: @post, builder: Bali::FormBuilder do |f| %>
  <%= render Bali::BlockEditor::Component.new(
    content: @post.body,
    name: "post[body]",
    placeholder: "Write your post..."
  ) %>
  <%= f.submit_actions %>
<% end %>

<%# With @mentions and AI assistance %>
<%= render Bali::BlockEditor::Component.new(
  content: @document.body,
  autosave_url: document_path(@document),
  mentions_url: users_search_path,
  ai: true
) %>

<%# Read-only display %>
<%= render Bali::BlockEditor::Component.new(
  content: @post.body,
  readonly: true
) %>

<%# Minimal editor (no toolbar) %>
<%= render Bali::BlockEditor::Component.new(
  content: @note.body,
  name: "note[body]",
  toolbar: false,
  placeholder: "Add a note..."
) %>
```

## Notes

- Content is stored as BlockNote JSON, not HTML — do not mix with `RichTextEditor` which stores HTML
- Slash commands (`/`) open a block insertion menu (headings, lists, images, code blocks, etc.)
- `mentions_url` endpoint should accept a `q` query param and return JSON with user suggestions
- `autosave_url` receives a PATCH/PUT request with the serialized content; pair with a controller action that updates the record
- When using `name:` for form integration, the hidden input is submitted with the form — no `autosave_url` needed
- AI features require additional backend configuration; check `Bali.block_editor_ai_enabled` before enabling
- Use `readonly: true` for display-only contexts (e.g., show pages) to avoid loading editor JS
