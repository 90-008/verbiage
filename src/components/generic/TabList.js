class TabList {
    current
    tabs = []
    track

    tab(id, title, href) {
        this.tabs.push({
            id: id,
            title: title,
            href: href,
            isCurrent: id == this.current
        })

        return this
    }

    constructor(currentId = "", track = true) {
        this.current = currentId
        this.track = track
    }
}

module.exports.hydrate = (_, thisArg) => {
    if (!thisArg instanceof TabList) throw new Error("Expected a TabList, got " + thisArg.constructor.name)

    return {}
}

module.exports.TabList = TabList