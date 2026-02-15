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
    static transform = (match, dawn) => {
        let hCount = 0
        for (let char of match[0]) {
            if (char != "#" || hCount == 6) break
            hCount++
        }

        return `<h${hCount}>${dawn.renderInlineFeatures(match[1])}</h${hCount}>`
    }
    static claim = false
}

class QuoteFeature extends BlockFeature {
    static match = /^> (.+)/
    static replacer = `<blockquote>*</blockquote>`
    static transform = (match, dawn) => {
        return dawn.render(match.join("\n")).content
    }
    static claim = true
}

class UnorderedListFeature extends BlockFeature {
    static match = /^(?:<li>)?- (.+)/
    static replacer = `<ul>*</ul>`
    static transform = (match, dawn) => {
        return dawn.render(match.map(line => `<li>${line}</li>`).join("\n")).content
    }
    static claim = true
}

class OrderedListFeature extends BlockFeature {
    static match = /^(?:<li>)?\* (.+)/
    static replacer = `<ol>*</ol>`
    static transform = (match, dawn) => {
        return dawn.render(match.map(line => `<li>${line}</li>`).join("\n")).content
    }
    static claim = true
}

class CodeBlockFeature extends BlockFeature {
    static match = /^``(.*)/
    static replacer = `<samp>*</samp>`
    static transform = (match, dawn) => {
        return match.map(line => dawn.escaperFunction(line)).join("<br>")
    }
    static claim = true
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
    static transform = (match) => {
        let matchClean = match.slice(2, match.length - 2)
        let linkParts = matchClean.split("|")

        /* TODO: Ideally, this should call the HTML sanitizer. */
        return `<a href="${linkParts[0]}" target="_blank">${linkParts[1].replace("/", "&sol;")}</a>`
    }
}

class Markdawn {
    blockFeatures = [
        HeaderFeature,
        QuoteFeature,
        CodeBlockFeature,
        UnorderedListFeature,
        OrderedListFeature
    ]

    inlineFeatures = [
        BoldFeature,
        ItalicsFeature,
        UnderlineFeature,
        StrikethroughFeature,
        InlineCodeBlockFeature,
        HighlightFeature,
        MaskedLinkFeature
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
                candidateFeature = currentFeatureGroup[currentSyntax] || null
                continue
            }

            if (currentFeatureGroup != null) {
                currentSyntax += current
                candidateFeature = currentFeatureGroup[currentSyntax] || candidateFeature

                // false alarm, no syntax features matching this pattern
                if (!candidateFeature && !Object.values(currentFeatureGroup).find(feat => feat.openingBrace.startsWith(currentSyntax))) {
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

                        let newCandidate = Object.values(currentFeatureGroup).find(feat => feat.closingBrace == currentCloser)
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
            final += featureEscaped ? currentSyntax : candidateFeature.transform(currentSyntax + candidateFeature.closingBrace, this)
        }

        final = final.replace(LINK_REGEX, `<a href="$1" target="_blank">$1</a>`)
        final = final.replace(BACKWARD_SLASH, "")

        return final
    }

    render(text) {
        let final = ""

        let textLines = [...text.split("\n"), ""]
        let cursor = 0

        let currentClaimant = null
        let claimedLines = []

        while (textLines[cursor] != null) {
            let line = textLines[cursor].trim()
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

        return { content: final }
    }

    constructor(options = {}) {
        this.escaperFunction = options.escaperFunction || ((text) => { return text })

        for (let inlineFeat of this.inlineFeatures) {
            let firstChar = this.featureMap[inlineFeat.openingBrace[0]]
            if (firstChar) {
                firstChar[inlineFeat.openingBrace] = inlineFeat
            } else {
                this.featureMap[inlineFeat.openingBrace[0]] = { [inlineFeat.openingBrace]: inlineFeat }
            }
        }

        return this
    }
}

module.exports.Markdawn = Markdawn