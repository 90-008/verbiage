class Lavender {
    components

    register(name, component) {
        this.components[name] = component

        return this
    }

    render(name, context) {
        return this.components[name].resolve(context)
    }

    constructor() {
        this.components = {}
    }
}

module.exports.Lavender = Lavender