const { RouteLeaf } = require("../../lib/waiter/RouteTree")
const { readFileSync } = require("fs")
const { Markdawn } = require("../../lib/markdawn/Markdawn")
const { Sanitizer } = require("../../lib/lavender/Lavender")

const sanitizer = new Sanitizer({
    allowedTags: ["p", "a", "b", "i", "div"],
    allowedAttributes: ["href", "style", "class"]
})

module.exports.HomePageRoute = new RouteLeaf(
    "/",
    {
        "GET": (req) => {
            req.setHead("X-Hello", "Hello, World!")

            req.set("Hello, World!")

            return req
        }
    },
).use((data) => {
    if (data.request.url.startsWith("/api")) {
        data.contentType = "application/json; charset=utf-8"
    } else {
        data.contentType = "text/html; charset=utf-8"
    }
})

module.exports.StaticAssetRoute = new RouteLeaf(
    "/static/+path",
    {
        "GET": async (data, { assets }) => {
            let asset = assets[data.args.path]

            data.contentType = asset.type
            data.body = await asset.bytes()

            return data
        }
    }
)

module.exports.PageTestRoute = new RouteLeaf(
    "/:wiki/w/+path",
    {
        "GET": (data, { lavender, storage }) => {
            let { file, ancestry } = storage.dig(data.args.path)
            if (!file) {
                data.status = 404
                return data
            }

            let currentDir = ancestry.findLast(fil => fil.isDirectory)
            currentDir.list()

            let isDirectory = file.isDirectory
            let document
            if (!isDirectory) {
                document = file.read().content.toString('utf8')
            } else {
                document = file.tryGetChild("README.md")?.read().content.toString('utf8')
            }

            if (document == null) {
                let newLink = currentDir.path == "/"
                    ? `/${data.args.wiki}/w/README.md?action=new`
                    : `/${data.args.wiki}/w/${currentDir.path}/README.md?action=new`
                document = `*This directory has no readme file.* {{${newLink}|Click here to create one}}.`
            }

            let md = document
            let mdSanitized = sanitizer.sanitize(md)
            let ren = new Markdawn({ escaperFunction: Sanitizer.escape }).render(mdSanitized)

            let rendered = lavender
                .layout("BaseLayout")
                .render("WikiPage",
                    {
                        markdown: ren.content,
                        ancestry: ancestry,
                        currentDir: currentDir,
                        currentWiki: data.args.wiki,
                        isFile: !isDirectory
                    })

            data.body = rendered.html
            return data
        }
    },
)