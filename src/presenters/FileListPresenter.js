const FileIconAssociations = [
    ["text/", "📝"],
    ["video/", "📺"],
    ["image/", "📷"],
    ["audio/", "🎶"]
]

class FileListPresenter {
    directory

    getIcon(file) {
        let icon = FileIconAssociations.find(ico => file.mimeType?.startsWith(ico[0]))
        return icon != null ? icon[1] : "📄"
    }

    presentFile(file) {
        return {
            file: file,
            icon: file.isDirectory ? "📁" : this.getIcon(file)
        }
    }

    items(cursor = 0, limit = -1) {
        let presented = []
        let dirNames = []
        let fileNames = []
        Object.keys(this.directory.items).forEach(item => this.directory.items[item].isDirectory ? dirNames.push(item) : fileNames.push(item))
        dirNames.sort((a, b) => { a.localeCompare(b) })
        fileNames.sort((a, b) => { a.localeCompare(b) })

        presented = [
            ...dirNames.map(i => this.presentFile(this.directory.items[i])),
            ...fileNames.map(i => this.presentFile(this.directory.items[i]))
        ]

        presented = presented.slice(cursor, limit > -1 ? cursor + limit : presented.length - 1)

        return presented
    }

    constructor(directory) {
        if (!directory.isDirectory) throw new Error("The file list presenter can only be used on directories.")
        this.directory = directory
        return this
    }
}

module.exports.FileListPresenter = FileListPresenter