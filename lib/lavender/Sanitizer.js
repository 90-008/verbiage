const STANDARD_ESCAPED_CHARACTERS = [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ["'", "&#x27;"],
    [`"`, "&quot;"],
    ["/", "&sol;"]
]

// https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const HTML_VOID_ELEMENTS = [
    "area", "base", "br", "col", "embed",
    "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr"
]

const MAX_OPENING_TAGS = 25

class HtmlTag {
    element = ""
    attributes = {}
    isClosing = false

    toString() {
        let final = "<"

        if (this.isClosing) final += "/"
        final += this.element

        for (let attr in this.attributes) {
            final += " " + (this.attributes[attr] == true ? attr : `${attr}="${this.attributes[attr]}"`)
        }

        final += ">"

        return final
    }

    clean(allowedAttrs) {
        if (this.isClosing) {
            this.attributes = {}
            return this
        }

        let cleaned = {}

        for (let attr in this.attributes) {
            if (allowedAttrs.includes(attr)) cleaned[attr] = this.attributes[attr]
        }

        this.attributes = cleaned
        return this
    }

    constructor(contents) {
        //console.log("tag text", contents)
        let cursor = 0
        let state = HtmlTagParserState.ElementName
        let currentAttribute = { name: "", content: true }

        if (contents[0] == "/") { this.isClosing = true; cursor++ }

        while (cursor < contents.length + 1) {
            let current = contents[cursor] || ""
            cursor++

            switch (state) {
                case HtmlTagParserState.ElementName:
                    if (current.trim().length == 0) {
                        state = HtmlTagParserState.PreAttributeName
                        break
                    }

                    this.element += current
                    break
                case HtmlTagParserState.PreAttributeName:
                    if (current.trim().length == 0) break

                    currentAttribute.name += current
                    state = HtmlTagParserState.AttributeName
                    break
                case HtmlTagParserState.AttributeName:
                    if (current == "=") {
                        state = HtmlTagParserState.AttributeContent
                        break
                    }

                    if (current.trim().length == 0) {
                        state = HtmlTagParserState.PreAttributeName

                        this.attributes[currentAttribute.name] = currentAttribute.content
                        currentAttribute = { name: "", content: true }
                        break
                    }

                    currentAttribute.name += current
                    break
                case HtmlTagParserState.AttributeContent:
                    currentAttribute.content = ""

                    if (current == `"`) { state = HtmlTagParserState.AttributeContentQuoted }
                    else {
                        state = HtmlTagParserState.AttributeContentUnquoted
                        currentAttribute.content += current
                    }

                    break
                case HtmlTagParserState.AttributeContentQuoted:
                    if (current == `"`) {
                        state = HtmlTagParserState.PreAttributeName

                        this.attributes[currentAttribute.name] = currentAttribute.content
                        currentAttribute = { name: "", content: true }
                    } else {
                        currentAttribute.content += current
                    }

                    break
                case HtmlTagParserState.AttributeContentUnquoted:
                    if (current.trim().length == 0) {
                        state = HtmlTagParserState.PreAttributeName

                        this.attributes[currentAttribute.name] = currentAttribute.content
                        currentAttribute = { name: "", content: true }
                    } else {
                        currentAttribute.content += current
                    }

                    break
                default:
                    throw new Error("Not implemented " + state)
            }
        }

        return this
    }
}

const HtmlTagParserState = {
    ElementName: 0,
    PreAttributeName: 1,
    AttributeName: 2,
    AttributeContent: 3,
    AttributeContentQuoted: 4,
    AttributeContentUnquoted: 5
}

class Sanitizer {
    allowedTags = []
    allowedAttributes = []
    escapes = [...STANDARD_ESCAPED_CHARACTERS]

    static escape(text, escapes = STANDARD_ESCAPED_CHARACTERS) {
        let escaped = new String(text)

        for (let escape of escapes) {
            escaped = escaped.replaceAll(escape[0], escape[1])
        }

        return escaped
    }

    sanitize(text) {
        let final = ""
        let cursor = 0
        let state = SanitizerParseState.PlainText

        let currentTag = ""
        let currentTagCount = 0
        let tagStack = []

        let complete = false

        while (!complete) {
            let current = text[cursor]
            cursor++

            switch (state) {
                case SanitizerParseState.PlainText:
                    if (current == "<") {
                        state = SanitizerParseState.HtmlTag
                        currentTagCount++
                        break
                    }

                    if (current == null) { complete = true; break }

                    final += current
                    break
                case SanitizerParseState.HtmlTag:
                    if (current == null) {
                        final += "<" + this.sanitize(currentTag)
                        complete = true

                        break
                    }

                    if (current == "<") {
                        currentTagCount++
                        currentTag += current

                        if (currentTagCount > MAX_OPENING_TAGS) {
                            final += Sanitizer.escape(currentTag, this.escapes)

                            state = SanitizerParseState.PlainText
                            currentTagCount = 0
                            currentTag = ''
                        }

                        break
                    }

                    if (current == ">") {
                        if (currentTagCount > 1) {
                            currentTagCount--
                            currentTag += current

                            break
                        }

                        state = SanitizerParseState.PlainText
                        let tag = new HtmlTag(currentTag)

                        if (tag.isClosing) {
                            /*
                                Detect mismatched tag endings, 
                                e.g. <b>this is valid</b> there shouldn't be</b> an ending here

                                The second closing <b> tag would be escaped.
                            */
                            if (tagStack[0] != tag.element) {
                                final += Sanitizer.escape(tag.toString(), this.escapes)
                                currentTag = ""
                                currentTagCount = 0

                                break
                            } else {
                                tagStack.shift()
                            }
                        } else if (!HTML_VOID_ELEMENTS.includes(tag.element)) {
                            tagStack.unshift(tag.element)
                        }

                        if (this.allowedTags.includes(tag.element)) {
                            final += tag
                                .clean(this.allowedAttributes)
                                .toString()
                        } else {
                            final += Sanitizer.escape(tag.toString(), this.escapes)
                        }

                        currentTag = ""
                        currentTagCount = 0
                        break
                    }

                    currentTag += current
                    break
                default:
                    throw new Error("Not implemented: " + state)
            }
        }

        return final
    }

    constructor(options = {}) {
        this.allowedTags = options.allowedTags || []
        this.allowedAttributes = options.allowedAttributes || []
        if (options.escapes) this.escapes = [...this.escapes, ...options.escapes]

        return this
    }
}

const SanitizerParseState = {
    PlainText: 0,
    HtmlTag: 1
}

module.exports.Sanitizer = Sanitizer