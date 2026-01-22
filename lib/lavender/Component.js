class Component {
    app
    template
    hydrator
    syntaxTree

    get componentStore() {
        if (this.app == null) return {}

        return this.app.components
    }

    resolve(context, thisArg = {}) {
        let data = this.hydrator != null ? this.hydrator(context, thisArg) : {}

        let final = this.syntaxTree.walk(data, context, thisArg, this.componentStore)
        return final
    }

    constructor(template, hydrator, app = null) {
        this.app = app
        this.template = template
        this.hydrator = hydrator

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
                        case "echo":
                            let echoS = new EchoStep()
                            echoS.symbol = tokenParts[1]
                            stack[0].push(echoS)

                            break
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
                        case "for":
                            let forS = new ForStep()
                            forS.symbol = tokenParts[1]
                            forS.iteratorName = tokenParts[2]
                            stack[0].push(forS)

                            stack.unshift(forS.steps)
                            break
                        case "end":
                            /*
                                {end}
                                End the current block.
                            */
                            if (stack.length == 1) throw "Encountered end at the top level of the template at line " + line

                            stack.shift()
                            break
                        case "render":
                            let renderS = new RenderStep()
                            renderS.component = tokenParts[1]
                            renderS.symbol = tokenParts[2]

                            stack[0].push(renderS)
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
        //console.log("finally", JSON.stringify(this.steps, null, 4))
    }

    getSymbol(symbol, data, context, important = false) {
        if (!symbol) throw "No symbol?!"
        let isContext = symbol.startsWith("@")

        let symbolParts
        if (isContext) {
            symbolParts = symbol.slice(1).split(".")
        } else {
            symbolParts = symbol.split(".")
        }

        let current = isContext ? context : data
        while (symbolParts[0] != null) {
            if (current[symbolParts[0]] == null) {
                if (important) {
                    throw `Property ${symbolParts[0]} is null (trying to get ${symbol})`
                } else { return null }
            }

            current = current[symbolParts[0]]
            symbolParts.shift()
        }

        return current
    }

    walk(data, context, thisArg, components, steps = null) {
        data["this"] = thisArg
        let final = ""

        /*
            Similar deal as the parser. Each item in the stack
            is a block of steps we walk. cursor is the
            progress we've made in this block, block is
            the syntax block itself.

            Some steps have steps of their own, taking us further into
            the stack. Once stack[0].cursor > stack[0].block.length - 1,
            we can assume we've reached the end of the block, and we
            take that item off the stack.

            Following this, once the stack is empty, we've reached the 
            end of the entire template.
        */
        let stack = [{ cursor: 0, block: steps || this.steps }]

        while (stack.length > 0) {
            let currentStep = stack[0].block[stack[0].cursor]
            stack[0].cursor += 1
            //console.log(stack, currentStep)

            switch (currentStep.constructor.name) {
                case "TextStep":
                    final += currentStep.text
                    break
                case "EchoStep":
                    final += this.getSymbol(currentStep.symbol, data, context)
                    break
                case "IfStep":
                    let condition = this.getSymbol(currentStep.condition, data, context)

                    if (condition) {
                        stack.unshift({ cursor: 0, block: currentStep.steps })
                    } else if (!condition && currentStep.elseSteps.length > 0) {
                        stack.unshift({ cursor: 0, block: currentStep.elseSteps })
                    }
                    break
                case "ForStep":
                    /*
                        We can't actually walk the steps of a for expression;
                        that would require a means of seeking back in the steps
                        and tracking whether we're in a looping expression, and more.
                        That would muddy up the AST walker code too much.

                        Instead, for each iterated upon item, we'll create a clone of
                        the present namespace, add the iterator name to it, launch a new
                        walking job on the for block's steps using that cloned data, and
                        gather the results.
                    */
                    let iterated = this.getSymbol(currentStep.symbol, data, context, true)

                    for (let item of iterated) {
                        let augmentedData = Object.assign({}, data)
                        Object.assign(augmentedData, { [currentStep.iteratorName]: item })

                        let rendered = this.walk(augmentedData, context, thisArg, components, currentStep.steps)
                        final += rendered
                    }
                    break
                case "RenderStep":
                    let component = components[currentStep.component]
                    if (!component) throw `No such component: ${currentStep.component}`

                    let componentThisArg = this.getSymbol(currentStep.symbol, data, context, true)
                    let rendered = component.resolve(context, componentThisArg)
                    final += rendered
                    break
                default:
                    throw `Not implemented: ${currentStep.constructor.name}`
            }

            if (stack[0].cursor > stack[0].block.length - 1) stack.shift()
        }

        //console.log(final)
        return final
    }
}

class TextStep {
    text = ""
}

class EchoStep {
    symbol = ""
}

class IfStep {
    condition = ""
    steps = []
    elseSteps = []
}

class ForStep {
    symbol = ""
    iteratorName = ""
    steps = []
}

class RenderStep {
    symbol = ""
    component = ""
}

module.exports.Component = Component