const LINK_REGEX = /(?<!href=.+)(?<!<a.+>)(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?(\:[0-9]{1-5})?\b([-a-zA-Z0-9()@:%_\+~#?&//=.]*))/gi
const BACKWARD_SLASH = String.fromCharCode(92)

class BlockFeature {
    match
    replacer
    transform
    claim
}

class HeaderFeature extends BlockFeature {
    static match = /^#{1,6} (.+)/
    static replacer = "*"
    static claim = false

    static getSlug = (match, level) => {
        let slug = match[1]
            .toLowerCase()
            .replaceAll(" ", "-")

        return `toc-h${level}-${slug}`
    }

    static getLevel = (match) => {
        let hCount = 0
        for (let char of match[0]) {
            if (char != "#" || hCount == 6) break
            hCount++
        }

        return hCount
    }

    static transform = (match, dawn) => {
        let level = HeaderFeature.getLevel(match)

        return `<h${level} id="${HeaderFeature.getSlug(match, level)}">${dawn.renderInlineFeatures(match[1])}</h${level}>`
    }

    static describe = (match) => {
        let level = HeaderFeature.getLevel(match)

        return {
            level: level,
            title: match[1],
            slug: HeaderFeature.getSlug(match, level)
        }
    }
}

class QuoteFeature extends BlockFeature {
    static match = /^> (.+)/
    static replacer = `<blockquote>*</blockquote>`
    static claim = true

    static transform = (match, dawn) => {
        return dawn.render(match.join("\n"), false).content
    }
}

class UnorderedListFeature extends BlockFeature {
    static match = /^(?:<li>)?- (.+)/
    static replacer = `<ul>*</ul>`
    static claim = true

    static transform = (match, dawn) => {
        return dawn.render(match.map(line => `<li>${line}</li>`).join("\n"), false).content
    }
}

class OrderedListFeature extends BlockFeature {
    static match = /^(?:<li>)?\* (.+)/
    static replacer = `<ol>*</ol>`
    static claim = true

    static transform = (match, dawn) => {
        return dawn.render(match.map(line => `<li>${line}</li>`).join("\n"), false).content
    }
}

class CodeBlockFeature extends BlockFeature {
    static match = /^``(.*)/
    static replacer = `<samp>*</samp>`
    static claim = true

    static transform = (match, dawn) => {
        return match.map(line => dawn.escaperFunction(line).replaceAll(" ", "&nbsp;")).join("<br>")
    }
}

class HorizontalRuleFeature extends BlockFeature {
    static match = /^---$/
    static replacer = `<hr>`
    static claim = false

    static transform = () => {
        return ""
    }
}

class InlineFeature {
    openingBrace
    closingBrace
    transform
}

class ItalicsFeature extends InlineFeature {
    static openingBrace = "*"
    static closingBrace = "*"
    static transform = (match, dawn) => {
        let matchClean = match.slice(1, match.length - 1)

        return `<i>${dawn.renderInlineFeatures(matchClean)}</i>`
    }
}

class BoldFeature extends InlineFeature {
    static openingBrace = "**"
    static closingBrace = "**"
    static transform = (match, dawn) => {
        let matchClean = match.slice(2, match.length - 2)

        return `<b>${dawn.renderInlineFeatures(matchClean)}</b>`
    }
}

class UnderlineFeature extends InlineFeature {
    static openingBrace = "__"
    static closingBrace = "__"
    static transform = (match, dawn) => {
        let matchClean = match.slice(2, match.length - 2)

        return `<u>${dawn.renderInlineFeatures(matchClean)}</u>`
    }
}

class StrikethroughFeature extends InlineFeature {
    static openingBrace = "~~"
    static closingBrace = "~~"
    static transform = (match, dawn) => {
        let matchClean = match.slice(2, match.length - 2)

        return `<s>${dawn.renderInlineFeatures(matchClean)}</s>`
    }
}

class InlineCodeBlockFeature extends InlineFeature {
    static openingBrace = "`"
    static closingBrace = "`"
    static transform = (match, dawn) => {
        let matchClean = dawn.escaperFunction(match.slice(1, match.length - 1))

        return `<code>${matchClean}</code>`
    }
}

class HighlightFeature extends InlineFeature {
    static openingBrace = "=="
    static closingBrace = "=="
    static transform = (match, dawn) => {
        let matchClean = match.slice(2, match.length - 2)

        return `<mark>${dawn.renderInlineFeatures(matchClean)}</mark>`
    }
}

class MaskedLinkFeature extends InlineFeature {
    static openingBrace = "{{"
    static closingBrace = "}}"
    static transform = (match, dawn) => {
        let matchClean = match.slice(2, match.length - 2)
        let linkParts = matchClean.split("|")
        if (linkParts[1]) {
            return `<a href="${linkParts[0]}" target="_blank">${dawn.renderInlineFeatures(linkParts[1].replace("/", "&sol;"))}</a>`
        } else {
            return match.slice(0, match.length - 2)
        }
    }
}

class MarkdownLinkFeature extends InlineFeature {
    static openingBrace = "["
    static closingBrace = ")"
    static transform = (match, dawn) => {
        let matchClean = match.slice(1, match.length - 1)
        let linkParts = matchClean.split("](")
        if (linkParts[1]) {
            return `<a href="${linkParts[1]}" target="_blank">${dawn.renderInlineFeatures(linkParts[0].replace("/", "&sol;"))}</a>`
        } else {
            return match.slice(0, match.length - 2)
        }
    }
}

class Markdawn {
    blockFeatures = [
        HeaderFeature,
        QuoteFeature,
        CodeBlockFeature,
        UnorderedListFeature,
        OrderedListFeature,
        HorizontalRuleFeature
    ]

    inlineFeatures = [
        BoldFeature,
        ItalicsFeature,
        UnderlineFeature,
        StrikethroughFeature,
        InlineCodeBlockFeature,
        HighlightFeature,
        MaskedLinkFeature,
        MarkdownLinkFeature
    ]

    featureMap = {}

    escaperFunction = null

    renderInlineFeatures(line) {
        let final = ""
        let cursor = 0
        let currentSyntax = null
        let currentFeatureGroup = null
        let candidateFeature = null
        let featureEscaped = false

        while (line[cursor] != null) {
            let current = line[cursor]
            //console.log("syntax", currentSyntax)
            //console.log("candidate", candidateFeature)
            cursor++

            if (currentSyntax == null && this.featureMap[current] != null) {
                if (line.charCodeAt(cursor - 2) == 92) featureEscaped = true // char code 92: backward slash
                currentFeatureGroup = this.featureMap[current]
                currentSyntax = current
                candidateFeature = currentFeatureGroup.get(currentSyntax) || null
                continue
            }

            if (currentFeatureGroup != null) {
                currentSyntax += current
                candidateFeature = currentFeatureGroup.get(currentSyntax) || candidateFeature

                // false alarm, no syntax features matching this pattern
                if (!candidateFeature && !currentFeatureGroup.values().find(feat => feat.openingBrace.startsWith(currentSyntax))) {
                    final += currentSyntax

                    currentSyntax = null
                    currentFeatureGroup = null
                    featureEscaped = false

                    continue
                }

                if (!candidateFeature) continue
                if (
                    currentSyntax.length > candidateFeature.closingBrace.length
                    && currentSyntax.endsWith(candidateFeature.closingBrace)
                ) {
                    let currentCloser = candidateFeature.closingBrace
                    let closerCandidate = candidateFeature

                    while (closerCandidate == candidateFeature) {
                        //console.log(currentSyntax, currentCloser, closerCandidate)

                        let newCandidate = currentFeatureGroup.values().find(feat => feat.closingBrace == currentCloser)
                        if (newCandidate == null) {
                            cursor--; currentSyntax = currentSyntax.slice(0, -1); break;
                        } else { closerCandidate = newCandidate }
                        currentCloser += line[cursor]
                        currentSyntax += line[cursor] || candidateFeature.closingBrace[0]
                        cursor++
                    }

                    if (closerCandidate != candidateFeature) continue
                } else { continue }

                if (line[cursor - (candidateFeature.closingBrace.length + 1)] == BACKWARD_SLASH) { continue }

                if (!featureEscaped) {
                    let transformed = candidateFeature.transform(currentSyntax, this)
                    final += transformed

                    candidateFeature = null
                } else {
                    final +=
                        candidateFeature.openingBrace
                        + this.renderInlineFeatures(
                            currentSyntax.slice(candidateFeature.openingBrace.length, -(candidateFeature.closingBrace.length)
                            ))
                        + candidateFeature.closingBrace
                }

                currentSyntax = null
                currentFeatureGroup = null
                featureEscaped = false
            } else {
                final += current
            }
        }

        if (candidateFeature && currentSyntax != null) {
            final += featureEscaped
                ? currentSyntax
                : candidateFeature.openingBrace + this.renderInlineFeatures(currentSyntax.slice(candidateFeature.openingBrace.length))
        }

        final = final.replace(LINK_REGEX, `<a href="$1" target="_blank">$1</a>`)
        final = final.replace(BACKWARD_SLASH, "")

        return final
    }

    render(text, getFeatures = true, fileName = "markdown.md") {
        let final = ""

        let textLines = text.split("\n").map(l => l.trim().replaceAll("\r", ""))
        let features = getFeatures ? this.getFeatures(textLines, fileName) : null
        textLines = this.rewriteFencedCodeBlocks(textLines)
        let cursor = 0

        let currentClaimant = null
        let claimedLines = []

        while (textLines[cursor] != null) {
            let line = textLines[cursor]
            cursor++

            let hasBlockFeature = false

            if (currentClaimant) {
                let match = line.match(currentClaimant.match)
                if (!match) {
                    let textTransformed = currentClaimant.transform(claimedLines, this)
                    final += currentClaimant.replacer.replace("*", textTransformed)
                    final += `<p>${this.renderInlineFeatures(line)}</p>`

                    currentClaimant = null
                    continue
                }

                claimedLines.push(match[1])
                continue
            }

            if (line.length == 0) continue

            for (let blockFeat of this.blockFeatures) {
                let match = line.match(blockFeat.match)
                if (!match) continue

                if (blockFeat.claim) {
                    currentClaimant = blockFeat
                    claimedLines = []
                    claimedLines.push(match[1])
                } else {
                    let textTransformed = blockFeat.transform(match, this)
                    final += blockFeat.replacer.replace("*", textTransformed)
                }

                hasBlockFeature = true
                break
            }

            if (hasBlockFeature) continue

            final += `<p>${this.renderInlineFeatures(line)}</p>`
        }

        return { content: final, features: features }
    }

    renderPlainText(text, fileName = "text.txt") {
        let final = ""

        let lines = text.split("\n")
        let features = this.getFeatures(lines, fileName, false)

        for (let line of lines) {
            final += (`<p>${this.escaperFunction(line).replaceAll(" ", "&nbsp;")}</p>`)
        }

        return { content: final, features: features }
    }

    getFeatures(lines, fileName = null, getBlocks = true) {
        lines = lines.map(ln => ln.replaceAll("\r", ""))
        let frontmatter = getBlocks ? this.getFrontmatter(lines) : null

        let title = null
        let description = null
        let excerpt = null
        let blocks = []

        if (getBlocks) {
            let cursor = 0
            while (lines[cursor] != null) {
                let current = lines[cursor]
                cursor++

                let hasFeature = false
                for (let blockFeat of this.blockFeatures) {
                    let match = current.match(blockFeat.match)
                    if (!match) continue

                    if (!blockFeat.describe) break

                    blocks.push({ feature: blockFeat, data: blockFeat.describe(match), line: cursor })
                    hasFeature = true
                    break
                }

                if (!hasFeature && !excerpt && current.length > 0) {
                    excerpt = current
                }
            }
        } else {
            excerpt = lines[0]
        }

        // grab title and description from frontmatter
        title = frontmatter?.title || null
        description = frontmatter?.description || ""

        // ...or fallback to extracting from block features
        if (title == null) {
            let firstHeader = blocks.find(b => b.feature.constructor == HeaderFeature.constructor)
            if (firstHeader && firstHeader.line == 1) {
                title = firstHeader.data.title
            } else {
                title = fileName // ...or fallback to the provided file name
            }
        }

        return { frontmatter: frontmatter, title: title, description: description, excerpt: excerpt }
    }

    getFrontmatter(lines) {
        if (lines[0] != "---") return null

        let fields = {}
        let currentField = null

        lines.shift()
        let endIndex = lines.findIndex(l => l == "---")
        if (!endIndex) return null

        let cursor = 0
        let complete = false
        while (!complete) {
            let current = lines[cursor]
            cursor++
            if (current == null || current == "---") { complete = true; continue }

            let fieldMatch = current.match(/^([a-z0-9]+):\s?(.*)$/)
            if (fieldMatch) {
                if (currentField != null) {
                    fields[currentField.name] = currentField.isList ? currentField.items : currentField.items.join("\n")
                }

                let fieldName = fieldMatch[1]
                let fieldContent = fieldMatch[2]

                if (fieldContent.startsWith("[") && fieldContent.endsWith("]")) {
                    try {
                        fields[fieldName] = JSON.parse(fieldContent)
                    } catch (e) {
                        fields[fieldName] = fieldContent
                    }

                    continue
                }

                if (fieldContent && fieldContent != "|") {
                    fields[fieldName] = fieldContent
                } else {
                    currentField = { name: fieldName, items: [], isList: fieldContent != "|" }
                }
            } else {
                if (!currentField) continue

                let itemMatch = current.match(/^-\s?(.+)/)
                currentField.items.push(itemMatch != null ? itemMatch[1] : current)
            }
        }

        lines.splice(0, endIndex + 1)

        while (lines[0].length == 0) { lines.shift() }

        return fields
    }

    /*
        Rewrite Markdown-style fenced code blocks to fit seamlessly 
        into our parsing system.
    */
    rewriteFencedCodeBlocks(lines) {
        let finalLines = []
        let currentFenced = []
        let isFenced = false

        let cursor = 0
        let complete = false

        while (!complete) {
            let current = lines[cursor]
            if (current == null) {
                if (isFenced) finalLines.push("```", ...currentFenced)

                complete = true
                continue
            }
            cursor++

            if (isFenced) {
                if (current.trim() == '```') {
                    isFenced = false
                    finalLines.push(...currentFenced.map(line => "``" + line))

                    currentFenced = []
                    continue
                }

                currentFenced.push(current)
            } else {
                if (current.startsWith('```')) {
                    isFenced = true
                    continue
                }

                finalLines.push(current)
            }
        }

        return finalLines
    }

    constructor(options = {}) {
        this.escaperFunction = options.escaperFunction || ((text) => { return text })

        for (let inlineFeat of this.inlineFeatures) {
            let firstChar = this.featureMap[inlineFeat.openingBrace[0]]
            if (firstChar) {
                firstChar.set(inlineFeat.openingBrace, inlineFeat)
            } else {
                let featGroup = new Map()
                featGroup.set(inlineFeat.openingBrace, inlineFeat)
                this.featureMap[inlineFeat.openingBrace[0]] = featGroup
            }
        }

        return this
    }
}

module.exports.Markdawn = Markdawn