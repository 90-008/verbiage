class Lavender {
    components

    register(name, component) {
        this.components[name] = component

        return this
    }

    render(name, context) {
        return this.components[name].resolve(context)
    }

    layout(name) {
        return new LayoutContext(this, name)
    }

    constructor() {
        this.components = {}
    }
}

class LayoutContext {
    app
    layoutName

    render(componentName, context, tolerateErrors = true) {
        let componentData = this.app.components[componentName].resolve(context)

        let layoutData = this.app.components[this.layoutName].resolve(Object.assign(context, { _innerContent: componentData, _innerOptional: tolerateErrors }))
        layoutData.component = componentData
        layoutData.anyErrored = componentData.errored || layoutData.errored

        return layoutData
    }

    constructor(app, layoutName) {
        this.app = app
        this.layoutName = layoutName

        return this
    }
}

module.exports.Lavender = Lavender