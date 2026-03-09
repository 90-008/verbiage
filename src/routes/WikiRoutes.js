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
        "GET": (data, { lavender, storage, reportBadRequest }) => {
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
                case "upload":
                    action = "upload"
                    actionCheck = () => { return true }
                    break
                case "mkdir":
                    action = "mkdir"
                    actionCheck = () => { return true }
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
        "POST": async (data, { storage, reportBadRequest }) => {
            let form = await data.formData()

            let action = data.searchParams.get("action") || "edit"
            let fileName = data.searchParams.get("name")
            let file
            let cwd

            switch (action) {
                case "delete":
                    file = storage.dig(data.args.path).file

                    if (!file || !file.tryGetChild(fileName)) return reportBadRequest(data, "BAD_PATH", "The parent directory or file does not exist")

                    if (!canDelete(file.tryGetChild(fileName))) return reportBadRequest(data, "NO_PERMISSION", "You do not have permission to perform this action")

                    storage.delete(data.args.path, fileName)

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${data.args.path}`)
                    break
                case "upload":
                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return reportBadRequest(data, "BAD_PATH", "The parent directory or file does not exist")

                    form.forEach("files", (uploadedFile) => {
                        cwd.upsert(uploadedFile.filename, uploadedFile.body)
                    })

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${data.args.path}`)
                    break
                case "mkdir":
                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return reportBadRequest(data, "BAD_PATH", "The parent directory or file does not exist")

                    let dirName = form.get("filename")
                    if (!dirName) return reportBadRequest(data, "MISSING_FORM_FIELD", "Missing directory name")

                    let newDir = cwd.mkdir(dirName.body.toString('utf8'))

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${newDir.pathNormalized}`)
                    break
                default:
                    if (!form) return reportBadRequest(data, "BAD_FORM_DATA", "Missing or malformed form data")

                    let { filename, content } = form.getMany("filename", "content")
                    if (!filename || !content) return reportBadRequest(data, "MISSING_FORM_FIELD", "Missing file name or content")

                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return reportBadRequest(data, "BAD_PATH", "The parent directory or file does not exist")

                    let newFileName = filename.body.toString('utf8')
                    let existingFile = cwd.tryGetChild(newFileName)
                    if (!existingFile && (!newFileName.endsWith(".md") && !newFileName.endsWith(".txt"))) newFileName += ".md"

                    let newFile = storage.upsert(data.args.path, newFileName, content.body)

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
        "GET": (data, { storage, lavender, reportBadRequest }) => {
            let { file } = storage.dig(data.args.path)

            if (!file) { // TODO: proper error page
                data.status = 404
                return data
            }

            if (file.isDirectory) return reportBadRequest(data, "BAD_FILE_ACTION", "Cannot perform raw get on a directory", lavender)

            let isDownload = data.searchParams.get("dl")
            if (isDownload == "1") data.setHead("Content-Disposition", "attachment")

            data.contentType = file.mimeType + "; charset=utf-8" || "application/octet-stream"
            data.body = file.read().content
            return data
        }
    }
)