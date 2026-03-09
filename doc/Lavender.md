# I. Intro

Lavender is a component-based HTML renderer library with lightweight scripting support using JS, as well as HTML template expressions.

## I.I. Application structure

The `Lavender` class is used to store and retrieve/render components. Components are added to the registry using the `Lavender.register()` method, which takes the desired name of the component and a `Component` instance.

The `Component` class holds the component's hydration function and HTML syntax tree. The `Component.resolve()` method allows rendering the component.

The Component class constructor takes three arguments:
* The HTML templates to use. It expects an object with two string properties: `base` (required), and `fallback` (optional).
* The hydrator functions to use. It expects an object with two function properties: `base` (required), and `fallback` (optional).
* The Lavender app instance to bind to for accessing the component registry of that instance (optional).

## I.II. Component structure

Components are scanned for in the `/src/components` directory. Each component is made up of two parts: a .html file containing the template, and an optional .js file containing the hydration logic. Both parts must be in the same directory and must have the same file name (except the extension).

## I.III. Rendering with Lavender

Rendering is done by calling `Lavender.render(componentName, contextData)`. This method returns an object containing: 
* `html` - the HTML that was rendered as a string.
* `errored` - whether the component triggered a fallback template.
* `error` - the error returned by the initial template before the fallback triggered, if any.

While the component data is volatile between scopes, rendering context data stays the same across all levels of the template. This makes it useful for exchanging information like authentication state with components.

# II. Hydration - JavaScript

Components can add a JavaScript function to enhance the component's rendering with arbitrary data. The JS file must export a function called `hydrate`. This function takes two arguments: the rendering context object - `context`, and the data that was passed into this component - `thisArg`, respectively.

Example of a hydration logic file:

```js
module.exports.hydrate = (context) => {
    return { fruits: ["apples", "oranges", "bananas", "pears"] }
}
```

Example of using the hydrated data:

```html
<p>My fruit bowl has {echo self.fruits.length} items.</p>
```

# III. Templates - HTML

Lavender includes a simple templating language. Expressions are wrapped in curly braces as such: `{expr}`.

Often, expressions will need to access the data provided by the components and the rendering context - Lavender calls these "symbols".

Syntax features:
* Symbols can traverse into objects: `<p>{echo strings.greeting}</p>` --> `<p>Hello, World!</p>`
* Prepend an `@` symbol to access the rendering context: `<p>{echo @currentUser.username}</p>`
* Some expressions expect symbols to be non-null, others don't care. To manually mark a symbol as non-nullable, append a `!` to the end: `<p>this will error if null: {echo important!}</p>`

## III.I. Echo expression

```html
<p>{echo greetings.helloWorld}</p>
```

The echo expression takes input from a symbol and inserts it into the document body directly. It **does not sanitize** the incoming string whatsoever, making it a good fit for situations like writing the output of a Markdown-to-HTML parser, but a bad fit for general user input.

## III.II. Put expression

```html
<p>{put user.biography}</p>
```

The put expression takes input from a symbol and inserts it into the document body, escaping potentially dangerous HTML characters on the way. This uses the sanitizer with default settings. For advanced sanitization, sanitize the input manually and use `echo`. (see the Sanitization section for more info)

## III.III. If expression

```html
{if something}
<p>Great success!</p>
{end}

{if @authorized}
<p>{echo secret}</p>
{else}
<p>Access denied!</p>
{end}
```

The if expression takes input from a symbol and checks it for truthiness (according to JavaScript guidelines). If it's truthy, the template contained within will be executed. An `{else}` expression may also be provided to execute a different block should the symbol be falsy.

## III.IV. For expression

```html
<ul>
    {for fruitBowl fruit}
        <li>{echo fruit}</li>
    {end}
</ul>
```

The for expression takes the input of an iterable symbol and an iterator name, respectively. The template contained within is executed once for each item, with the current item available for querying under the chosen iterator name.

## III.V. Render expression

```html
{render MyComponent}

{render UserBadge user}
```

The render expression takes a component name and an optional symbol to pass on to the component being rendered, respectively. The rendered component is pasted into the template.

It also optionally takes a symbol to be passed on to the component - this will be exposed under the `self` property in HTML templates.

# IV. Fallbacks & Error handling

Lavender allows you to provide a fallback template for your component. When a component or any of its downstream components fails to render (whether due to a template error or hydrator error), an error will be logged to the console and the fallback template will take over.

If one is present, the fallback hydrator function (`onError`) will run with the arguments (error object, rendering context). This function can return an object representing the data to be passed on to the fallback template, as usual. The fallback template will always receive the error object itself in its properties (`self.error`).

Consider this example setup:

```
-- UserBadge.html --

<p>{echo user.username}</p>

-- UserBadge.error.html --

<p style="color: red;">Unable to retrieve user: {echo self.error}</p>

-- UserBadge.js --

module.exports.hydrate = (...) => {...}
module.exports.onError = (e, ctx) => { /* error logic runs here */ }
```

# V. Layouts

Lavender provides an abstraction for handling wrapping layouts around components and the associated tasks that come with it. The `Lavender.layout(componentName)` function returns a layout context to render with, which you can then call `LayoutContext.render(componentName, context, tolerateErrors)` on to render a component and place it within the layout. The layout and the component share the same context.

Layouts are, for most purposes, regular components - they can have fallback templates and be hydrated. The difference is that components have access to a special expression - `{slot}`. When this expression is encountered:
* If `tolerateErrors` is `false` and the component encountered an error (including those that would otherwise be caught by the fallback template), the error is passed on to the layout.
* If everything went correctly, the inner component's HTML output is placed where the slot is.

`LayoutContext.render()` returns the same data as the standard `Lavender.render()` function, but with two additional properties:
* `component` - The result of rendering the inner component.
* `anyErrored` - Whether the layout *and/or* the inner component encountered a rendering error.

Example of using layouts:

Base layout template:
```html
<!DOCTYPE html>
<head>
...
</head>
<body>
    <div class="content">
        {slot}
    </div>
</body>
```

Application logic:
```js
let rendered = Lavender
        .layout("BaseLayout")
        .render("WikiPage", { currentUser: { ... }, wikiPage: { ... } }, false)
```

# VI. Sanitization

The `Sanitizer` class provides utilities for sanitizing user input.

## Escaping text

The `escape()` method escapes potentially dangerous characters, turning arbitrary user input into insertable HTML character-encoded strings. `escapes` is an array of `[replaceWhat, replaceWith]` pairs. If `escapes` is not provided, it'll use the default set of replacers. It is a static method, so it must be called on Sanitizer directly.

```js
Sanitizer.escape("<script>alert('XSS!');</script>") // --> &lt;script&gt;alert('XSS!');&lt;/script&gt;

Sanitizer.escape("this ampersand will be replaced: &", [ ["&", "&amp;"] ])
```

## Creating a Sanitizer instance

Call `new Sanitizer(options)` to create a sanitizer instance. The `options` object takes the following values:
- `allowedTags` - Allowed HTML element names. For example `["p", "b", "i", "h5"]`.
- `allowedAttributes` - Allowed HTML attribute names. For example `["style", "href", "src", "class"]`.
- `escapes` - Replacers for escaping characters. For example `[ ["&", "&amp;"] ]`. The provided replacers will be merged together with the default.

These options control how this Sanitizer instance will treat input when sanitizing. HTML tags with element names not in the allowlist will be escaped, and attributes with names not in the allowlist will be stripped away.

## Sanitizing input

The `sanitize()` method allows sanitizing arbitrary text input by escaping and stripping HTML tags according to this instance's configuration.

Consider this example input and output which assumes `a` is an allowed element name, and `href` an allowed attribute.

Example input:
```
<a href="https://example.com" onmouseover="alert(1);">This link is valid but has a bad attribute to be stripped</a> You can mix HTML with plain text here. <iframe>And this shouldn't be allowed at all</iframe>
```

Example output:

```
<a href="https://example.com">This link is valid but has a bad attribute to be stripped</a> You can mix HTML with plain text here. &lt;iframe&gt;And this shouldn't be allowed at all&lt;&sol;iframe&gt;
```