const fs = require("node:fs")
const pathUtil = require("path")

class StorageManager {
    mountPoint = ""
    files = null

    maxCacheSize = 15_000
    forbiddenNames = []

    isReadOnly = false

    tryPath(path) {
        let joined = pathUtil.join(this.mountPoint, path)
        let resolved = pathUtil.resolve(joined)
        if (!resolved.startsWith(this.mountPoint)) throw new Error("Illegal location")

        return true
    }

    exists(path) {
        return this.dig(path).file != null
    }

    isDirectory(path) {
        let { file } = this.dig(path)
        if (!file) throw new FileNotFoundError()

        return file.isDirectory
    }

    list(path) {
        let { file } = this.dig(path)
        if (!file) throw new FileNotFoundError()

        file.list()
        return file
    }

    read(path) {
        let { file } = this.dig(path)
        if (!file) throw new FileNotFoundError()

        file.read()
        return file
    }

    dig(path, caseSensitive = true) {
        if (path == "~") return { file: this.files, ancestry: [this.files] }
        this.tryPath(path)

        let normal = pathUtil.posix.normalize(path)
        let pathParts = normal.split("/")

        let current = this.files
        let ancestry = []
        let complete = false

        while (!complete) {
            if (pathParts[0].length > 0) { ancestry.push(current); current = current.tryGetChild(pathParts[0], caseSensitive) }
            pathParts.shift()

            if (current == null || pathParts.length == 0) { complete = true; break }
        }
        if (current != null) ancestry.push(current)

        return { file: current, ancestry: ancestry }
    }

    constructor(mount, options = {}) {
        this.mountPoint = mount

        if (options.maxCacheSize != null) this.maxCacheSize = options.maxCacheSize
        if (options.forbiddenNames != null) this.forbiddenNames = options.forbiddenNames
        if (options.isReadOnly != null) this.isReadOnly = options.isReadOnly

        this.files = new File("/", this)
        this.files.isDirectory = true
        this.files.name = "/"

        return this
    }
}

class File {
    manager

    path = ""
    absolutePath = ""
    name = ""

    content
    stats = null
    isStatted = false

    size
    createdAt
    modifiedAt

    isDirectory = false
    isListed = false
    items = {}

    get itemsPresentable() {
        let presented = []
        let dirNames = []
        let fileNames = []
        Object.keys(this.items).forEach(item => this.items[item].isDirectory ? dirNames.push(item) : fileNames.push(item))
        dirNames.sort((a, b) => { a.localeCompare(b) })
        fileNames.sort((a, b) => { a.localeCompare(b) })

        presented = [...dirNames.map(i => this.items[i]), ...fileNames.map(i => this.items[i])]

        return presented
    }

    get pathStripped() {
        if (this.path == "/") return "~"
        return this.path.match(/^[\\\/]?(.+)$/m)[1]
    }

    read() {
        if (this.isDirectory) throw new Error("Attempt to call read on a directory")
        if (this.content != null) return this

        let content = fs.readFileSync(this.absolutePath)
        console.log(`fs > read ${this.absolutePath}`)
        if (content.length < this.manager.maxCacheSize) this.content = content

        return { file: this, content: content }
    }

    list() {
        if (!this.isDirectory) throw new Error("Attempt to call list on a non-directory")
        if (this.isListed) return this

        let items = fs.readdirSync(this.absolutePath, { withFileTypes: true, recursive: false })
        console.log(`fs > readdir ${this.absolutePath}`)
        for (let dirent of items) {
            let item = this.tryGetChild(dirent.name)
            if (!item) continue
            item.isDirectory = dirent.isDirectory()
        }
        this.isListed = true

        return this
    }

    stat() {
        if (this.isStatted) return this

        let stats = fs.statSync(this.absolutePath)
        console.log(`fs > stat ${this.absolutePath}`)
        this.useStats(stats)

        return this
    }

    useStats(stats) {
        this.stats = stats
        this.isStatted = true

        this.isDirectory = stats.isDirectory()
        this.size = stats.size
        this.modifiedAt = stats.mtimeMs
        this.createdAt = stats.birthtimeMs
    }

    tryGetChild(name, caseSensitive = true) {
        if (!this.isDirectory) return null

        let existingItem = null
        if (caseSensitive) {
            existingItem = this.items[name]
        } else {
            let k = Object.keys(this.items).find(fname => fname.toLowerCase() == name.toLowerCase())
            existingItem = this.items[k]
        }
        if (existingItem) return existingItem

        let joined = pathUtil.join(this.absolutePath, name)
        let exists = fs.existsSync(joined)
        if (!exists) return null

        let newItem = new File(pathUtil.join(this.path, name), this.manager)
        newItem.stat()
        newItem.name = name

        this.items[name] = newItem

        return newItem
    }

    constructor(path, manager) {
        this.manager = manager

        let joined = pathUtil.join(manager.mountPoint, path)
        this.path = path
        this.absolutePath = joined

        return this
    }
}

class FileNotFoundError extends Error {
    constructor() { super(); return this }
}

module.exports.StorageManager = StorageManager