module.exports.hydrate = (context, thisArg) => {
    return { array: ["apples", "oranges", "bananas", "pears"] }
}

module.exports.onError = (e, context) => {
    return {}
}