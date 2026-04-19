const pathUtil = require("node:path/posix")
const { Mime } = require("../shared/mime")

const LINK_REGEX = /(?<!href=.+)(?<!<a.+>)([a-z0-9]+?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?(\:[0-9]{1-5})?\b([-a-zA-Z0-9()@:%_\+~#?&//=.]*))/gi

function linkPresenter(href) {
    let currentDir = this.context.currentDir
    let currentWiki = this.context.currentWiki
    if (!currentDir || !currentWiki) return href

    href = href.replaceAll("\\", "/")

    if (href.match(LINK_REGEX)) return href
    if (href.startsWith("#")) return href
    /* don't interfere with /+wiki-name/... */
    if (href.match(/\/?\+[a-z0-9]+.*/)) return href

    hrefMatch = href.match(/([^?#]+)([?#]?.+)?/)
    hrefPath = hrefMatch[1]
    hrefExtras = hrefMatch[2] || ""

    location = ""

    if (hrefPath.startsWith("/")) { // /absolute/path -> /+wiki-name/w/absolute/path.md
        location = pathUtil.normalize(hrefPath)
    } else { // ./relative/path -> /+wiki-name/w/subdir/relative/path.md
        location = pathUtil.join(currentDir.pathNormalized, hrefPath)
    }

    let locationDug = currentDir.manager.dig(location)
    /* if the location is not found, try again but with .md */
    if (!locationDug.file) locationDug = currentDir.manager.dig(location + ".md")
    /* if it's still not found, just spit the href back out with the current wiki */
    if (!locationDug.file) return pathUtil.normalize(`/${currentWiki}/w/${location}`)

    href = `/${currentWiki}/w/${locationDug.file.pathNormalized}${hrefExtras}`

    return href
}

function mediaLinkPresenter(href) {
    if (href.startsWith("#")) return null

    let currentDir = this.context.currentDir
    let currentWiki = this.context.currentWiki
    if (!currentDir || !currentWiki) return href

    hrefMatch = href.match(/([^?#]+)([?#]?.+)?/)
    hrefPath = hrefMatch[1]
    hrefExtras = hrefMatch[2] || ""

    let location

    if (href.match(LINK_REGEX) || href.match(/\/?\+[a-z0-9]+.*/)) {
        location = hrefPath
        let fileType = Mime.fromFileName(location).split("/")[0]
        if (!(["image", "audio", "video"].includes(fileType))) fileType = null

        return { type: fileType, href: href, link: href }
    }

    if (hrefPath.startsWith("/")) { // /absolute/path -> /+wiki-name/w/absolute/path.md
        location = pathUtil.normalize(hrefPath)
    } else { // ./relative/path -> /+wiki-name/w/subdir/relative/path.md
        location = pathUtil.join(currentDir.pathNormalized, hrefPath)
    }

    let locationDug = currentDir.manager.dig(location)
    if (!locationDug.file) return null

    let fileType = locationDug.file.mimeType.split("/")[0]

    if (!(["image", "audio", "video"].includes(fileType))) return null

    return {
        type: fileType,
        href: `/${currentWiki}/raw/${locationDug.file.pathNormalized}${hrefExtras}`,
        link: `/${currentWiki}/w/${locationDug.file.pathNormalized}${hrefExtras}`
    }
}

module.exports.linkPresenter = linkPresenter
module.exports.mediaLinkPresenter = mediaLinkPresenter