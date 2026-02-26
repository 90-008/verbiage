const { RouteLeaf } = require("../../lib/waiter/RouteTree")

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

            let rendered = lavender
                .layout("BaseLayout")
                .render("WikiPage",
                    {
                        sanitizer: sanitizer,
                        ancestry: ancestry,
                        currentDir: currentDir,
                        currentWiki: data.args.wiki,
                        currentFile: file,
                    }, false)

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

            let rendered = lavender
                .layout("BaseLayout")
                .render("EditWikiPage",
                    {
                        ancestry: ancestry,
                        fileName: fileName,
                        currentWiki: data.args.wiki,
                        currentDir: cwd
                    }, false)

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