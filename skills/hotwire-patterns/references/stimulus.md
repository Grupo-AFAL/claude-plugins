# Stimulus Reference

Detailed patterns for writing Stimulus controllers in AFAL Rails applications.

## Controller Naming and File Structure

Stimulus uses naming conventions to connect JavaScript to HTML:

```
app/javascript/controllers/
  toggle_controller.js       → data-controller="toggle"
  auto_submit_controller.js  → data-controller="auto-submit"
  modal_closer_controller.js → data-controller="modal-closer"
```

File naming: `snake_case_controller.js`
HTML attribute: `kebab-case`

Multiple controllers on one element:

```erb
<div data-controller="toggle auto-submit">
  <!-- Both controllers active -->
</div>
```

## Basic Controller Structure

```javascript
// app/javascript/controllers/example_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // Lifecycle callbacks
  connect() {
    console.log("Controller connected")
  }

  disconnect() {
    console.log("Controller disconnected")
  }

  // Action methods
  doSomething() {
    console.log("Action triggered")
  }
}
```

## Values (Typed Properties)

Values are typed properties with change callbacks:

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    url: String,
    count: Number,
    active: Boolean,
    items: Array,
    config: Object
  }

  connect() {
    console.log(this.urlValue)      // "https://example.com"
    console.log(this.countValue)    // 42
    console.log(this.activeValue)   // true
    console.log(this.itemsValue)    // ["a", "b", "c"]
    console.log(this.configValue)   // { key: "value" }
  }

  // Called when value changes
  urlValueChanged(value, previousValue) {
    console.log(`URL changed from ${previousValue} to ${value}`)
  }
}
```

HTML:

```erb
<div data-controller="example"
     data-example-url-value="https://example.com"
     data-example-count-value="42"
     data-example-active-value="true"
     data-example-items-value='["a", "b", "c"]'
     data-example-config-value='{"key": "value"}'>
</div>
```

Values with defaults:

```javascript
static values = {
  count: { type: Number, default: 0 },
  active: { type: Boolean, default: false }
}
```

Check if value exists:

```javascript
if (this.hasUrlValue) {
  console.log(this.urlValue)
}
```

## Classes (CSS Class References)

Classes API allows CSS class names to be configurable via data attributes:

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = ["hidden", "active"]

  toggle() {
    this.element.classList.toggle(this.hiddenClass)
  }

  activate() {
    this.element.classList.add(this.activeClass)
    this.element.classList.remove(this.hiddenClass)
  }
}
```

HTML:

```erb
<div data-controller="toggle"
     data-toggle-hidden-class="hidden"
     data-toggle-active-class="bg-primary">
  <button data-action="toggle#toggle">Toggle</button>
</div>
```

This allows the same controller to work with different CSS frameworks (Tailwind, Bootstrap, etc.) by configuring class names in HTML rather than hardcoding them in JavaScript.

Check if class exists:

```javascript
if (this.hasHiddenClass) {
  this.element.classList.toggle(this.hiddenClass)
}
```

Multiple classes:

```erb
<div data-controller="toggle"
     data-toggle-hidden-class="hidden opacity-0"
     data-toggle-active-class="block opacity-100 transition-opacity">
```

The class value can be a space-separated list.

## Targets (Element References)

Targets are references to elements within the controller's scope:

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "output", "item"]

  connect() {
    console.log(this.inputTarget)        // First matching element
    console.log(this.outputTarget)       // First matching element
    console.log(this.itemTargets)        // All matching elements (array)
    console.log(this.hasInputTarget)     // true/false
    console.log(this.inputTargets.length) // Count of input targets
  }

  submit() {
    const value = this.inputTarget.value
    this.outputTarget.textContent = value
  }
}
```

HTML:

```erb
<div data-controller="example">
  <input data-example-target="input" type="text">
  <button data-action="example#submit">Submit</button>
  <div data-example-target="output"></div>

  <ul>
    <li data-example-target="item">Item 1</li>
    <li data-example-target="item">Item 2</li>
    <li data-example-target="item">Item 3</li>
  </ul>
</div>
```

Target callbacks:

```javascript
inputTargetConnected(element) {
  console.log("Input target added", element)
}

inputTargetDisconnected(element) {
  console.log("Input target removed", element)
}
```

## Actions (Event Handlers)

Actions connect DOM events to controller methods:

```erb
<!-- Click event (default for buttons) -->
<button data-action="click->example#save">Save</button>
<button data-action="example#save">Save</button> <!-- same -->

<!-- Submit event (default for forms) -->
<form data-action="submit->example#save">

<!-- Input event -->
<input data-action="input->example#search">

<!-- Multiple actions -->
<input data-action="input->example#search blur->example#validate">

<!-- Multiple controllers -->
<input data-action="input->search#filter input->analytics#track">
```

Action options:

```erb
<!-- Prevent default behavior -->
<a href="#" data-action="click->example#navigate:prevent">Link</a>

<!-- Stop event propagation -->
<button data-action="click->example#handle:stop">Button</button>

<!-- Run once -->
<button data-action="click->example#init:once">Initialize</button>

<!-- Passive event listener -->
<div data-action="scroll->example#track:passive">Content</div>

<!-- Debounce (custom) -->
<input data-action="input->example#search" data-example-debounce-value="300">
```

Global events:

```erb
<!-- Listen to window events -->
<div data-action="resize@window->example#resize">

<!-- Listen to document events -->
<div data-action="click@document->example#handleOutsideClick">
```

Event object access:

```javascript
handleClick(event) {
  console.log(event.target)        // Element that triggered event
  console.log(event.currentTarget) // Element with data-action
  console.log(event.params)        // Action params
  event.preventDefault()
  event.stopPropagation()
}
```

Action parameters:

```erb
<button data-action="example#delete"
        data-example-id-param="123"
        data-example-name-param="Message">
  Delete
</button>
```

```javascript
delete(event) {
  const id = event.params.id       // "123"
  const name = event.params.name   // "Message"
}
```

## Outlets (Controller Connections)

Outlets connect controllers together:

```javascript
// app/javascript/controllers/search_controller.js
export default class extends Controller {
  static outlets = ["results"]

  search() {
    const query = this.inputTarget.value

    if (this.hasResultsOutlet) {
      this.resultsOutlet.update(query)
    }
  }
}

// app/javascript/controllers/results_controller.js
export default class extends Controller {
  update(query) {
    // Fetch and display results
  }
}
```

HTML:

```erb
<div data-controller="search"
     data-search-results-outlet="#search-results">
  <input data-search-target="input" data-action="input->search#search">
</div>

<div id="search-results" data-controller="results">
  <!-- Results rendered here -->
</div>
```

Multiple outlets:

```javascript
static outlets = ["results", "analytics"]

search() {
  this.resultsOutlets.forEach(outlet => outlet.update())
  this.analyticsOutlet.track("search")
}
```

Outlet callbacks:

```javascript
resultsOutletConnected(outlet, element) {
  console.log("Results outlet connected", outlet)
}

resultsOutletDisconnected(outlet, element) {
  console.log("Results outlet disconnected", outlet)
}
```

## Lifecycle Callbacks

```javascript
export default class extends Controller {
  // Called when controller is connected to DOM
  connect() {
    console.log("Connected")
  }

  // Called when controller is disconnected from DOM
  disconnect() {
    console.log("Disconnected")
  }

  // Called when target is connected
  itemTargetConnected(element) {
    console.log("Target connected", element)
  }

  // Called when target is disconnected
  itemTargetDisconnected(element) {
    console.log("Target disconnected", element)
  }

  // Called when value changes
  countValueChanged(value, previousValue) {
    console.log(`Count changed from ${previousValue} to ${value}`)
  }
}
```

## Common Patterns

### Toggle Visibility

```javascript
// app/javascript/controllers/toggle_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]
  static values = { open: Boolean }

  toggle() {
    this.openValue = !this.openValue
  }

  openValueChanged() {
    this.contentTarget.hidden = !this.openValue
  }
}
```

```erb
<div data-controller="toggle" data-toggle-open-value="false">
  <button data-action="toggle#toggle">Toggle</button>
  <div data-toggle-target="content" hidden>Content</div>
</div>
```

### Auto-Submit Form

```javascript
// app/javascript/controllers/auto_submit_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  submit() {
    this.element.requestSubmit()
  }
}
```

```erb
<%= form_with url: search_path, data: { controller: "auto-submit" } do |f| %>
  <%= f.search_field :q, data: { action: "input->auto-submit#submit" } %>
<% end %>
```

### Debounced Search

```javascript
// app/javascript/controllers/debounced_search_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input"]
  static values = { delay: { type: Number, default: 300 } }

  search() {
    clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      this.element.requestSubmit()
    }, this.delayValue)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
```

```erb
<%= form_with url: search_path, data: { controller: "debounced-search" } do |f| %>
  <%= f.search_field :q,
      data: {
        action: "input->debounced-search#search",
        "debounced-search-target": "input"
      } %>
<% end %>
```

### Form Validation

```javascript
// app/javascript/controllers/form_validator_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "error", "submit"]

  validate() {
    const isValid = this.inputTargets.every(input => input.checkValidity())
    this.submitTarget.disabled = !isValid
  }

  showError(event) {
    const input = event.target
    const error = this.errorTargets.find(e => e.dataset.for === input.name)

    if (error) {
      error.textContent = input.validationMessage
      error.hidden = input.validity.valid
    }
  }
}
```

```erb
<%= form_with model: @message,
              data: { controller: "form-validator", action: "input->form-validator#validate" } do |f| %>
  <%= f.text_field :body,
      required: true,
      data: {
        "form-validator-target": "input",
        action: "blur->form-validator#showError"
      } %>
  <span data-form-validator-target="error" data-for="message[body]" hidden></span>

  <%= f.submit data: { "form-validator-target": "submit" } %>
<% end %>
```

### Character Counter

```javascript
// app/javascript/controllers/character_counter_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "count"]
  static values = { max: Number }

  update() {
    const length = this.inputTarget.value.length
    this.countTarget.textContent = `${length} / ${this.maxValue}`

    if (length > this.maxValue) {
      this.countTarget.classList.add("text-error")
    } else {
      this.countTarget.classList.remove("text-error")
    }
  }
}
```

```erb
<div data-controller="character-counter" data-character-counter-max-value="280">
  <textarea data-character-counter-target="input"
            data-action="input->character-counter#update"></textarea>
  <span data-character-counter-target="count">0 / 280</span>
</div>
```

### Clipboard Copy

```javascript
// app/javascript/controllers/clipboard_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["source", "button"]
  static values = { successText: { type: String, default: "Copied!" } }

  async copy() {
    const text = this.sourceTarget.value || this.sourceTarget.textContent

    try {
      await navigator.clipboard.writeText(text)
      this.showSuccess()
    } catch (error) {
      console.error("Copy failed", error)
    }
  }

  showSuccess() {
    const originalText = this.buttonTarget.textContent
    this.buttonTarget.textContent = this.successTextValue

    setTimeout(() => {
      this.buttonTarget.textContent = originalText
    }, 2000)
  }
}
```

```erb
<div data-controller="clipboard">
  <input data-clipboard-target="source" value="Text to copy" readonly>
  <button data-clipboard-target="button" data-action="clipboard#copy">
    Copy
  </button>
</div>
```

### Dropdown Menu

```javascript
// app/javascript/controllers/dropdown_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]
  static values = { open: Boolean }

  toggle() {
    this.openValue = !this.openValue
  }

  hide(event) {
    if (!this.element.contains(event.target)) {
      this.openValue = false
    }
  }

  openValueChanged() {
    this.menuTarget.hidden = !this.openValue
  }

  connect() {
    this.hideHandler = this.hide.bind(this)
    document.addEventListener("click", this.hideHandler)
  }

  disconnect() {
    document.removeEventListener("click", this.hideHandler)
  }
}
```

```erb
<div data-controller="dropdown">
  <button data-action="dropdown#toggle">Menu</button>
  <ul data-dropdown-target="menu" hidden>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

## Working with Bali Stimulus Controllers

Bali components include Stimulus controllers. Avoid duplicating:

- `Bali::ModalComponent` - has modal controller
- `Bali::DropdownComponent` - has dropdown controller
- `Bali::TabsComponent` - has tabs controller
- `Bali::TooltipComponent` - has tooltip controller

Extend Bali controllers when needed:

```javascript
// app/javascript/controllers/custom_modal_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Add custom behavior to Bali modal
  }

  beforeOpen(event) {
    console.log("Modal opening")
  }
}
```

```erb
<%= render Bali::ModalComponent.new(
  data: {
    controller: "custom-modal",
    action: "modal:before-open->custom-modal#beforeOpen"
  }
) do %>
  Content
<% end %>
```

## Namespaced Controllers

Organize controllers in subdirectories:

```
app/javascript/controllers/
  admin/
    dashboard_controller.js  → data-controller="admin--dashboard"
  forms/
    validator_controller.js  → data-controller="forms--validator"
```

File uses namespace in class name:

```javascript
// app/javascript/controllers/admin/dashboard_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Admin dashboard controller")
  }
}
```

HTML:

```erb
<div data-controller="admin--dashboard">
  <!-- Controller active -->
</div>
```

## Testing Stimulus Controllers

Minitest system test:

```ruby
test "toggle shows and hides content" do
  visit page_path

  assert_selector "[data-toggle-target='content'][hidden]"

  click_on "Toggle"

  assert_selector "[data-toggle-target='content']:not([hidden])"
end
```

JavaScript test (if using Jest):

```javascript
import { Application } from "@hotwired/stimulus"
import ToggleController from "./toggle_controller"

describe("ToggleController", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="toggle" data-toggle-open-value="false">
        <button data-action="toggle#toggle">Toggle</button>
        <div data-toggle-target="content" hidden>Content</div>
      </div>
    `

    const application = Application.start()
    application.register("toggle", ToggleController)
  })

  it("toggles content visibility", () => {
    const button = document.querySelector("button")
    const content = document.querySelector("[data-toggle-target='content']")

    expect(content.hidden).toBe(true)

    button.click()

    expect(content.hidden).toBe(false)
  })
})
```

## Performance Tips

### Use Passive Listeners

For scroll/touch events:

```erb
<div data-action="scroll->example#track:passive">
```

### Clean Up in disconnect()

Always remove event listeners and timers:

```javascript
connect() {
  this.handleResize = this.resize.bind(this)
  window.addEventListener("resize", this.handleResize)
}

disconnect() {
  window.removeEventListener("resize", this.handleResize)
}
```

### Debounce Expensive Operations

```javascript
static values = { debounce: { type: Number, default: 300 } }

search() {
  clearTimeout(this.debounceTimeout)
  this.debounceTimeout = setTimeout(() => {
    this.performSearch()
  }, this.debounceValue)
}

disconnect() {
  clearTimeout(this.debounceTimeout)
}
```

### Avoid Over-Querying DOM

Cache target references:

```javascript
// BAD - queries DOM every time
doSomething() {
  this.inputTarget.value = "..."
  this.inputTarget.focus()
  this.inputTarget.select()
}

// GOOD - cache reference
doSomething() {
  const input = this.inputTarget
  input.value = "..."
  input.focus()
  input.select()
}
```
