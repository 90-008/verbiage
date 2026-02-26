const { RouteLeaf } = require("../../lib/waiter/RouteTree")
const { Markdawn } = require("../../lib/markdawn/Markdawn")

module.exports.ViewWikiPageRoute = new RouteLeaf(
    "/:wiki/w/+path",
    {
        "GET": (data, { lavender, storage, sanitizer }) => {
            let { file, ancestry } = storage.dig(data.args.path)
            if (!file) { // TODO: proper error page
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
                        currentFile: file,
                        isFile: !isDirectory
                    })

            data.body = rendered.html
            return data
        }
    },
)

module.exports.EditWikiPageRoute = new RouteLeaf(
    "/:wiki/edit/+path",
    {
        "GET": (data, { lavender, storage }) => {
            let dug = storage.dig(data.args.path)
            let cwd = dug.file
            let ancestry = dug.ancestry

            if (!cwd) { // TODO: proper error page
                data.status = 404
                return data
            }

            let fileName = data.searchParams.get("name") || ""

            let existingFile = fileName ? cwd.tryGetChild(fileName) : null
            let existingContent = existingFile?.read().content || ""

            let rendered = lavender
                .layout("BaseLayout")
                .render("EditWikiPage",
                    {
                        currentDir: cwd,
                        ancestry: ancestry,
                        currentWiki: data.args.wiki,
                        fileName: fileName,
                        content: existingContent
                    })

            data.body = rendered.html
            return data
        },
        "POST": async (data, { storage }) => {
            let form = await data.formData()

            let { filename, content } = form.fields
            if (!filename && !content) { // TODO: proper error page
                data.status = 400
                return data
            }

            let newFile = storage.upsert(data.args.path, filename.body.toString('utf8'), content.body)

            data.status = 302
            data.setHead("Location", `/${data.args.wiki}/w/${newFile.pathStripped}`)

            return data
        }
    }
)