# Direct Upload

Upload files directly to cloud storage (Active Storage) without passing through the Rails server.

## Parameters

- `form:` (required) - Rails form builder object
- `method:` (required) - Attachment attribute name (e.g., `:file`, `:images`)
- `multiple:` - Allow multiple file selection (default: false)
- `max_files:` - Maximum number of files when multiple is true (default: 10)
- `max_file_size:` - Maximum file size in megabytes (default: 10)
- `accept:` - Accepted file types as MIME types or extensions (default: '*')
- `drop_zone:` - Show drag and drop area (default: true)
- `auto_upload:` - Upload files immediately on selection (default: true)

## Usage

```erb
<%# Basic single file upload %>
<%= form_with model: @document do |f| %>
  <%= render Bali::DirectUpload::Component.new(form: f, method: :file) %>
<% end %>

<%# Multiple files with limit %>
<%= render Bali::DirectUpload::Component.new(
  form: f,
  method: :images,
  multiple: true,
  max_files: 5
) %>

<%# With file type restrictions %>
<%= render Bali::DirectUpload::Component.new(
  form: f,
  method: :document,
  accept: 'application/pdf,image/*'
) %>

<%# Custom max file size %>
<%= render Bali::DirectUpload::Component.new(
  form: f,
  method: :video,
  max_file_size: 100,
  accept: 'video/*'
) %>
```

## Notes

- Requires Active Storage to be configured in the Rails application
- CORS must be configured on the storage bucket for direct uploads to work
- Client-side validation (max_files, max_file_size, accept) is for UX only - always validate on the server
- Automatically displays existing attachments when editing a record
- Supports both `has_one_attached` and `has_many_attached` Active Storage associations
