const { RouteLeaf } = require("../../lib/waiter/RouteTree")

function canDelete(file) {
    if (file.isRoot) return false

    return true
}

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

            let rendered
            let actionCheck
            let action = data.searchParams.get("action") || "edit"

            switch (action) {
                case "delete":
                    if (cwd.tryGetChild(fileName) == null) { // TODO: proper error page
                        data.status = 404
                        return data
                    }

                    action = "delete"
                    actionCheck = canDelete
                    break
                default:
                    action = "edit"
                    actionCheck = () => { return true }
                    break
            }

            rendered = lavender
                .layout("BaseLayout")
                .render("EditWikiPage",
                    {
                        ancestry: ancestry,
                        fileName: fileName,
                        action: action,
                        hasPermission: actionCheck,
                        currentWiki: data.args.wiki,
                        currentDir: cwd
                    }, false)

            data.body = rendered.html
            return data
        },
        "POST": async (data, { storage }) => {
            let form = await data.formData()

            let action = data.searchParams.get("action") || "edit"

            switch (action) {
                case "delete":
                    let fileName = data.searchParams.get("name")
                    let file = storage.dig(data.args.path).file

                    if (!file || !file.tryGetChild(fileName)) { // TODO: proper error page
                        data.status = 400
                        return data
                    }

                    if (!canDelete(file.tryGetChild(fileName))) { // TODO: proper error page
                        data.status = 400
                        return data
                    }

                    storage.delete(data.args.path, fileName)

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${data.args.path}`)
                    break
                default:
                    if (!form) { data.status = 400; return data }

                    let { filename, content } = form.fields
                    if (!filename || !content) { // TODO: proper error page
                        data.status = 400
                        return data
                    }

                    let newFile = storage.upsert(data.args.path, filename.body.toString('utf8'), content.body)

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${newFile.pathStripped}`)
                    break
            }

            return data
        }
    }
)

module.exports.RawFileRoute = new RouteLeaf(
    "/:wiki/raw/+path",
    {
        "GET": (data, { storage }) => {
            let { file } = storage.dig(data.args.path)

            if (!file) {
                data.status = 404
                return data
            }

            if (file.isDirectory) {
                data.status = 400
                return data
            }

            let isDownload = data.searchParams.get("dl")
            if (isDownload == "1") data.setHead("Content-Disposition", "attachment")

            data.contentType = file.type || "application/octet-stream"
            data.body = file.read().content
            return data
        }
    }
)