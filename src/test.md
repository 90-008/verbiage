# Markdawn!

Test file for a (hopefully...) functioning markdown engine. Markdawn's syntax is mostly the same as actual Markdown, but with a few stylistic and practical choices.

## Syntax

### Paragraph

This text is a paragraph.

### Bold

**What you type:** `**embolden**`
**What you get:** **embolden**

### Italics

**What you type:** `*italicize*`
**What you get:** *italicize*

### Underline

**What you type:** `__underline__`
**What you get:** __underline_

### Strikethrough

**What you type:** `~~strikethru~~`
**What you get:** ~~strikethru~~

### Highlight

**What you type:** `==mark==`
**What you get:** ==mark==

### Inline code

**What you type:** \`i am code`
**What you get:** `i am code`

### Link

**What you type:** `{{https://google.com|Google}}`
**What you get:** {{https://google.com|Google}}

Plaintext links are converted automatically. For example: https://developer.mozilla.org/

### Header

**What you type:** `### h3`
**What you get:**
### h3

### Unordered list

**What you type:**
``- Apples
``- Oranges
``- Tomatoes

**What you get:** 
- Apples
- Oranges
- Tomatoes

### Ordered list

**What you type:**
``* Dice onions
``* Bake until golden brown
``* Serve

**What you get:** 
* Dice onions
* Bake until golden brown
* Serve

### Standalone code block

**What you type:**
\``console.log(stuff)
\``#!/bin/bash

**What you get:**
``console.log(stuff)
``#!/bin/bash

<div style="background-color: yellow; padding: 4px;"><p>Oh and you can insert (some) raw html too. And *mix* and __match__ it with markdawn syntax.</p></div>

## Troublesome syntax

*this is **nested** syntax*

*this is syntax that goes to eol

\*this is escaped syntax __with some syntax__ within*

\*this is escaped syntax that goes to eol

`<p>since this is in a code block, this should be escaped</p>`

## Troublesome sanitizer cases

<iframe src="/"></iframe> iframes are not allowed so this shouldnt render

<a href="https://example.com" onmouseover="alert('XSS!');">this is a raw link that works but has a forbidden attribute that should be cleaned</a>

<b>the second closing tag should be escaped</b> right here --> </b> <--