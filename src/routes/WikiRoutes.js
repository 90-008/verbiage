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

            let currentDir = ancestry.findLast(fil => fil.isDirectory)

            if (!file) {
                return data.reject(404, "File not found.", {
                    currentWiki: data.args.wiki,
                    currentDir: currentDir
                })
            }

            currentDir.list()

            let rendered = lavender
                .layout("BaseLayout")
                .render("WikiPage",
                    {
                        sanitizer: sanitizer,
                        ancestry: ancestry,
                        "@ancestry": ancestry, // Ensure both ways for safety
                        currentDir: currentDir,
                        currentWiki: data.args.wiki,
                        currentFile: file,
                        writeEnabled: true,
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

            if (!cwd) {
                return data.reject(404, "Couldn't find the directory.", {
                    currentWiki: data.args.wiki,
                    currentDir: dug.ancestry.findLast(f => f.isDirectory)
                })
            }

            let fileName = data.searchParams.get("name") || ""

            let rendered
            let actionCheck
            let action = data.searchParams.get("action") || "edit"

            switch (action) {
                case "delete":
                    if (cwd.tryGetChild(fileName) == null) {
                        return data.reject(404, "Couldn't find the file to be deleted.", {
                            currentWiki: data.args.wiki,
                            currentDir: cwd
                        })
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
        "POST": async (data, app) => {
            let { storage } = app
            let form = await data.formData()

            let action = data.searchParams.get("action") || "edit"
            let fileName = data.searchParams.get("name")
            let file
            let cwd

            switch (action) {
                case "delete":
                    file = storage.dig(data.args.path).file

                    if (!file || !file.tryGetChild(fileName)) return data.reject(400, "The parent directory or file does not exist", { errorCode: "BAD_PATH" })

                    if (!canDelete(file.tryGetChild(fileName))) return data.reject(400, "You do not have permission to perform this action", { errorCode: "NO_PERMISSION" })

                    storage.delete(data.args.path, fileName)
                    app.invalidateSearchIndex()

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${data.args.path}`)
                    break
                case "upload":
                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return data.reject(400, "The parent directory or file does not exist", { errorCode: "BAD_PATH" })

                    form.forEach("files", (uploadedFile) => {
                        cwd.upsert(uploadedFile.filename, uploadedFile.body)
                    })
                    app.invalidateSearchIndex()

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${data.args.path}`)
                    break
                case "mkdir":
                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return data.reject(400, "The parent directory or file does not exist", { errorCode: "BAD_PATH" })

                    let dirName = form.get("filename")
                    if (!dirName || !dirName.body.toString('utf8')) return data.reject(400, "Missing directory name", { errorCode: "MISSING_FORM_FIELD" })

                    let newDir = cwd.mkdir(dirName.body.toString('utf8'))
                    app.invalidateSearchIndex()

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${newDir.pathNormalized}`)
                    break
                default:
                    if (!form) return data.reject(400, "Missing or malformed form data", { errorCode: "BAD_FORM_DATA" })

                    let { filename, content } = form.getMany("filename", "content")
                    if (!filename || !filename.body.toString('utf8') || !content) return data.reject(400, "Missing file name or content", { errorCode: "MISSING_FORM_FIELD" })

                    cwd = storage.dig(data.args.path).file
                    if (!cwd) return data.reject(400, "The parent directory or file does not exist", { errorCode: "BAD_PATH" })

                    /*
                        Dig in create mode to make directories to allow the new file
                        to be created without issues, in case the user supplied a
                        nested path.
                    */
                    storage.dig(data.args.path + "/" + filename.body.toString('utf8'), true, true)

                    let newFileName = filename.body.toString('utf8')
                    let existingFile = cwd.tryGetChild(newFileName)
                    if (!existingFile && (!newFileName.endsWith(".md") && !newFileName.endsWith(".txt"))) newFileName += ".md"

                    let newFile = storage.upsert(data.args.path, newFileName, content.body)
                    app.invalidateSearchIndex()

                    data.status = 302
                    data.setHead("Location", `/${data.args.wiki}/w/${newFile.pathStripped}`)
                    break
            }

            return data
        }
    }
)

module.exports.SearchIndexRoute = new RouteLeaf(
    "/:wiki/search-index.json",
    {
        "GET": (data, app) => {
            data.body = JSON.stringify(app.getSearchIndex())
            data.contentType = "application/json"
            return data
        }
    }
)

module.exports.RawFileRoute = new RouteLeaf(
    "/:wiki/raw/+path",
    {
        "GET": (data, { storage, lavender }) => {
            let { file } = storage.dig(data.args.path)

            if (!file) { // TODO: proper error page
                data.status = 404
                return data
            }

            if (file.isDirectory) return data.reject(400, "Can't perform raw get on a directory", { errorCode: "BAD_FILE_ACTION" })

            let isDownload = data.searchParams.get("dl")
            if (isDownload == "1") data.setHead("Content-Disposition", "attachment")

            data.contentType = file.mimeType + "; charset=utf-8" || "application/octet-stream"

            data.writeHead()

            file.readStream((chunk) => {
                data.write(chunk)
            })
                .catch((e) => { console.log(e); data.end() })
                .then(() => { data.end() })

            return data
        }
    }
)