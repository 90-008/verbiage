const { TabList } = require("../generic/TabList")

module.exports.hydrate = (ctx) => {
    let wikiTabs

    if (ctx.currentWiki != null) {
        wikiTabs = new TabList("wiki", false)
            .tab("wiki", "Wiki", "/")
            .tab("gallery", "Gallery", "/")
            .tab("files", "Files", "/")
    }

    return {
        wikiTabs: wikiTabs
    }
}