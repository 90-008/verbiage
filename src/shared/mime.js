class Mime {
    static extToMime = {
        "js": "text/javascript",
        "css": "text/css",
        "ico": "image/vnd.microsoft.icon",
        "png": "image/png"
    }

    static fromExt(ext) {
        if (ext.startsWith(".")) ext = ext.slice(1)
        return this.extToMime[ext] || "application/octet-stream"
    }
}

module.exports.Mime = Mime