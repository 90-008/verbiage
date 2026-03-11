const { Markdawn } = require("../../lib/markdawn/Markdawn")

const FileIconAssociations = [
    ["text/", "📝"],
    ["video/", "📺"],
    ["image/", "📷"],
    ["audio/", "🎶"],
    ["application/json", "🧾"]
]

class FileListPresenter {
    directory
    includeDirs = true
    includeType = null
    withMarkdown = false

    getIcon(file) {
        let icon = FileIconAssociations.find(ico => file.mimeType?.startsWith(ico[0]))
        return icon != null ? icon[1] : "📄"
    }

    presentFile(file) {
        let features

        if (this.withMarkdown && !file.isDirectory && !file.isMediaFile) {
            let read = file.read().content.toString('utf8')

            let dawn = new Markdawn({})
            features = dawn.render(read, file.name, false).features
        }

        return {
            file: file,
            icon: file.isDirectory ? "📁" : this.getIcon(file),
            features: features || null
        }
    }

    items(cursor = 0, limit = -1) {
        let presented = []
        let dirNames = []
        let fileNames = []
        Object.keys(this.directory.items).forEach(k => {
            let entry = this.directory.items[k]
            if (entry.isDirectory && this.includeDirs) {
                dirNames.push(k)
            } else {
                if (this.includeType && !entry.mimeType.startsWith(this.includeType)) return
                fileNames.push(k)
            }
        })
        dirNames.sort((a, b) => { a.localeCompare(b) })
        fileNames.sort((a, b) => { a.localeCompare(b) })

        presented = [
            ...dirNames.map(i => this.directory.items[i]),
            ...fileNames.map(i => this.directory.items[i])
        ]

        presented = presented.slice(cursor, limit > -1 ? cursor + limit : presented.length)

        presented = presented.map(entry => this.presentFile(entry))

        return presented
    }

    constructor(directory, options = {}) {
        if (!directory.isDirectory) throw new Error("The file list presenter can only be used on directories.")
        this.directory = directory
        Object.assign(this, options)
        return this
    }
}

module.exports.FileListPresenter = FileListPresenter