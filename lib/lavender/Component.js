class Component {
    template
    syntaxTree

    constructor(template) {
        this.template = template

        this.syntaxTree = new AST(this.template)
    }
}

class AST {
    steps = []

    /*
        AST parser

        Mediocre code ahead. Don't try at home.
    */
    constructor(template) {
        let cursor = 0
        let tokenCount = 0

        /*
            For error reporting (at line 123, col 456)
        */
        let firstBrace = [1, 1]
        let line = 1
        let col = 1

        let currentToken = ""

        /* 
            Stack of syntax blocks we're adding steps to. LIFO, first item is deepest.
            Some tokens such as if put us deeper in the stack, the end token removes the first
            item (taking us out of the current block).
        */
        let stack = [this.steps]
        let currentStep = new TextStep()

        while (template[cursor] != null) {
            let now = template[cursor]

            if (now == "\n") {
                line++
                col = 1
            }

            if (now == "{") {
                tokenCount++

                if (tokenCount == 1) firstBrace = [line, col]
            }

            if (tokenCount > 0) { currentToken += now } else { currentStep.text += now }

            if (now == "}") {
                tokenCount--

                if (tokenCount == 0) {
                    stack[0].push(currentStep)

                    /* {do thing} -> do thing */
                    currentToken = currentToken.slice(1, currentToken.length - 1)

                    let tokenParts = currentToken.split(" ")
                    let token = tokenParts[0]

                    switch (token) {
                        case "if":
                            /*
                                {if} ... {end}

                                Push an if-step into our syntax tree and focus the
                                parser in on its steps.
                            */
                            let ifS = new IfStep()
                            ifS.condition = tokenParts[1]
                            stack[0].push(ifS)

                            stack.unshift(ifS.steps)
                            break
                        case "else":
                            /*
                                {if} ... {else} ... {end}

                                We go up a layer in our stack and find the last step.
                                If the expression is written correctly up to this point, the
                                last step should've been an if step. We then focus back in on it,
                                this time on its else-if steps.
                            */
                            let currentIf = stack[1][stack[1].length - 1]
                            if (!currentIf instanceof IfStep) throw "Enountered else outside of an if block at line " + line

                            stack.shift()
                            stack.unshift(currentIf.elseSteps)
                            break
                        case "end":
                            /*
                                {end}
                                End the current block.
                            */
                            if (stack.length == 1) throw "Encountered end at the top level of the template at line " + line

                            stack.shift()
                            break
                        default:
                            throw `Not implemented: ${token}`
                    }

                    currentToken = ""
                    currentStep = new TextStep()
                }
            }

            cursor++
            col++
        }

        if (tokenCount > 0) throw `Detected mismatched braces starting at around line ${firstBrace[0]}, char ${firstBrace[1]}. Check for any duplicate braces in your template expressions.`

        stack[0].push(currentStep) // Make sure to push any leftover text.
        console.log("finally", JSON.stringify(this.steps, null, 4))
    }
}

class TextStep {
    text = ""
}

class IfStep {
    condition = ""
    steps = []
    elseSteps = []
}

module.exports.Component = Component