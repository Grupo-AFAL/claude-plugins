# Bali::Columns::Component

Layout component supporting two modes: flex (with slots) and grid (auto-flow).

## Modes

**Flex mode** (default): Use `with_column` slots. Each column can have its own size.

**Grid mode**: Set `cols:` param. Children go directly in the block — no `with_column` wrappers needed.

## Parameters (Columns::Component)

- `gap:` (Symbol) - Gap between columns. Default: `:md`
- `cols:` (Integer, nil) - Grid mode: auto-flow column count (1-12). Enables grid mode.
- `cols_md:` (Integer, nil) - Grid columns at md breakpoint (768px+)
- `cols_lg:` (Integer, nil) - Grid columns at lg breakpoint (1024px+)
- `cols_xl:` (Integer, nil) - Grid columns at xl breakpoint (1280px+)
- `wrap:` (Boolean) - Allow columns to wrap to multiple lines. Default: `false`
- `center:` (Boolean) - Center columns horizontally. Default: `false`
- `middle:` (Boolean) - Center columns vertically. Default: `false`
- `mobile:` (Boolean) - Keep columns horizontal on mobile instead of stacking. Default: `false`

## Parameters (Column::Component, flex mode only)

- `size:` (Symbol or Integer, nil) - Column width
- `md:` (Symbol or Integer, nil) - Width at md breakpoint (768px+)
- `lg:` (Symbol or Integer, nil) - Width at lg breakpoint (1024px+)
- `xl:` (Symbol or Integer, nil) - Width at xl breakpoint (1280px+)
- `auto:` (Boolean) - Make column only as wide as its content. Default: `false`

### Symbolic Sizes

`:full`, `:half`, `:one_third` / `:third`, `:two_thirds`, `:one_quarter` / `:quarter`, `:three_quarters`, `:one_fifth`, `:two_fifths`, `:three_fifths`, `:four_fifths`

Numeric sizes 1-12 map to Tailwind grid fractions.

## Gap Sizes

| Key | CSS Class | Approx. Value |
|-----|-----------|---------------|
| `:none` | `gap-0` | 0 |
| `:px` | `gap-px` | 1px |
| `:xs` | `gap-1` | 0.25rem |
| `:sm` | `gap-2` | 0.5rem |
| `:md` | `gap-3` | 0.75rem (default) |
| `:lg` | `gap-4` | 1rem |
| `:xl` | `gap-6` | 1.5rem |
| `:'2xl'` | `gap-8` | 2rem |

## Usage

### Basic Two-Column (Flex Mode)

```erb
<%= render Bali::Columns::Component.new do |columns| %>
  <% columns.with_column do %>
    <div>Left column</div>
  <% end %>

  <% columns.with_column do %>
    <div>Right column</div>
  <% end %>
<% end %>
```

### Responsive Columns (Flex Mode)

Stack on mobile, side-by-side at md, sized at lg:

```erb
<%= render Bali::Columns::Component.new(gap: :lg) do |columns| %>
  <% columns.with_column(size: :full, md: :two_thirds) do %>
    <div>Main content</div>
  <% end %>

  <% columns.with_column(size: :full, md: :one_third) do %>
    <div>Sidebar</div>
  <% end %>
<% end %>
```

### Grid Mode (Auto-Flow, No Slots)

Children fill grid cells automatically — no `with_column` needed:

```erb
<%= render Bali::Columns::Component.new(cols: 3, gap: :md) do %>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
<% end %>
```

### Responsive Grid

1 column on mobile, 2 at md, 4 at lg:

```erb
<%= render Bali::Columns::Component.new(cols: 1, cols_md: 2, cols_lg: 4, gap: :sm) do %>
  <% @products.each do |product| %>
    <div><%= product.name %></div>
  <% end %>
<% end %>
```

### Main + Sidebar Layout

```erb
<%= render Bali::Columns::Component.new(gap: :xl) do |columns| %>
  <% columns.with_column(size: :full, lg: :two_thirds) do %>
    <%= render @article %>
  <% end %>

  <% columns.with_column(size: :full, lg: :one_third) do %>
    <%= render @sidebar %>
  <% end %>
<% end %>
```

## Notes

- By default, columns stack vertically on mobile. Use `mobile: true` to keep them horizontal.
- Grid mode (`cols:`) and flex mode (`with_column`) are mutually exclusive — pick one per component.
- `cols_md`/`cols_lg`/`cols_xl` only apply in grid mode.
- Responsive size params (`md:`, `lg:`, `xl:`) on `with_column` only apply in flex mode.
