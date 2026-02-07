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