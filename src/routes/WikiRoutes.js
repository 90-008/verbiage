const { RouteLeaf } = require("../../lib/waiter/RouteTree")
const { Markdawn } = require("../../lib/markdawn/Markdawn")

module.exports.ViewWikiPageRoute = new RouteLeaf(
    "/:wiki/w/+path",
    {
        "GET": (data, { lavender, storage, sanitizer }) => {
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
                document = file.tryGetChild("readme.md", false)?.read().content.toString('utf8')
            }

            if (document == null) {
                let newLink = currentDir.path == "/"
                    ? `/${data.args.wiki}/edit/~?name=README.md`
                    : `/${data.args.wiki}/edit/${currentDir.path}?name=README.md`
                document = `*This directory has no readme file.* {{${newLink}|Click here to create one}}.`
            }

            let md = document
            let mdSanitized = sanitizer.sanitize(md)
            let ren = new Markdawn({ escaperFunction: sanitizer.escape }).render(mdSanitized)

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