# I. Intro

Lavender is a component-based HTML renderer library with lightweight scripting support using JS, as well as HTML template expressions.

## I.I. Application structure

The `Lavender` class is used to store and retrieve/render components. Components are added to the registry using the `Lavender.register()` method, which takes the desired name of the component and a `Component` instance.

The `Component` class holds the component's hydration function and HTML syntax tree. The `Component.resolve()` method allows rendering the component.

Note that within Verbiage, `Lavender` is registered as a global variable.

## I.II. Component structure

Components are scanned for in the `/src/components` directory. Each component is made up of two parts: a .html file containing the template, and an optional .js file containing the hydration logic. Both parts must be in the same directory and must have the same file name (except the extension).

## I.III. Rendering with Lavender

Rendering is done by calling `Lavender.render(componentName, contextData)`. This method returns the HTML that was rendered as a string.

While the component data is volatile between scopes, rendering context data stays the same across all levels of the template. This makes it useful for exchanging information like authentication state with components.

# II. Hydration - JavaScript

Components can add a JavaScript function to enhance the component's rendering with arbitrary data. The JS file must export a function called `hydrate`. This function takes two arguments: the rendering context object - `context`, and the data that was passed into this component - `thisArg`, respectively.

The hydration function must return an object representing the data to apply to this component. This data will be available under the `self` property when accessing it via HTML templates.

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

Symbols can traverse into objects: `<p>{echo strings.greeting}</p>` --> `<p>Hello, World!</p>`
Prepend an `@` symbol to access the rendering context: `<p>{echo @currentUser.username}</p>`

## III.I. Echo expression

```html
<p>{echo greetings.helloWorld}</p>
```

The echo expression takes input from a symbol and inserts it into the document body directly. It **does not sanitize** the incoming string whatsoever, making it a good fit for situations like writing the output of a Markdown-to-HTML parser, but a bad fit for general user input.


## III.II. If expression

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

## III.III. For expression

```html
<ul>
    {for fruitBowl fruit}
        <li>{echo fruit}</li>
    {end}
</ul>
```

The for expression takes the input of an iterable symbol and an iterator name, respectively. The template contained within is executed once for each item, with the current item available for querying under the chosen iterator name.

## III.IV. Render expression

```html
{render MyComponent}

{render UserBadge user}
```

The render expression takes a component name and an optional symbol to pass on to the component being rendered, respectively. The rendered component is pasted into the template.