# Rich Text Editor

WYSIWYG HTML editor for rich text content.

## Parameters

- `html_content:` - Initial HTML content to display
- `output_input_name:` - Name attribute for the hidden input that stores the HTML
- `editable:` - Whether the editor is editable (default: false)
- `placeholder:` - Placeholder text when empty (default: "Start typing...")
- `images_url:` - URL endpoint for image uploads
- `page_hyperlink_options:` - Array of page options for hyperlink dropdown

## Usage

```erb
<%# Basic editable editor %>
<%= render Bali::RichTextEditor::Component.new(
  html_content: @post.body,
  output_input_name: 'post[body]',
  editable: true
) %>

<%# With image uploads %>
<%= render Bali::RichTextEditor::Component.new(
  html_content: @article.content,
  output_input_name: 'article[content]',
  editable: true,
  images_url: upload_images_path
) %>

<%# Read-only display %>
<%= render Bali::RichTextEditor::Component.new(
  html_content: @announcement.message,
  editable: false
) %>

<%# With page hyperlinks %>
<%= render Bali::RichTextEditor::Component.new(
  html_content: @page.body,
  output_input_name: 'page[body]',
  editable: true,
  page_hyperlink_options: @pages.map { |p| { value: p.id, label: p.title } }
) %>
```

## Notes

- Only renders if `Bali.rich_text_editor_enabled` is true
- Uses a Stimulus controller for editor functionality
- Stores HTML content in a hidden input field
- Custom placeholder text can be set for better UX
