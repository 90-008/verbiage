class Mime {
    static extToMime = {
        "aac": "audio/aac",
        "apng": "image/apng",
        "avif": "image/avif",
        "avi": "video/x-msvideo",
        "bmp": "image/bmp",
        "bz": "application/x-bzip",
        "bz2": "application/x-bzip2",
        "css": "text/css",
        "csv": "text/csv",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "flac": "audio/flac",
        "gz": "application/gzip",
        "gif": "image/gif",
        "html": "text/html",
        "ico": "image/vnd.microsoft.icon",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "js": "text/javascript",
        "json": "application/json",
        "md": "text/markdown",
        "mid": "audio/midi",
        "midi": "audio/midi",
        "mjs": "text/javascript",
        "mkv": "video/matroska",
        "mp3": "audio/mp3",
        "mp4": "video/mp4",
        "mpeg": "video/mpeg",
        "odp": "application/vnd.oasis.opendocument.presentation",
        "ods": "application/vnd.oasis.opendocument.spreadsheet",
        "odt": "application/vnd.oasis.opendocument.text",
        "oga": "audio/ogg",
        "ogv": "video/ogg",
        "opus": "audio/ogg",
        "otf": "font/otf",
        "png": "image/png",
        "pdf": "application/pdf",
        "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "rar": "application/vnd.rar",
        "rtf": "application/rtf",
        "sh": "application/x-sh",
        "svg": "image/svg+xml",
        "tar": "application/x-tar",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "toml": "application/toml",
        "ts": "video/mp2t",
        "ttf": "font/ttf",
        "txt": "text/plain",
        "wav": "audio/wav",
        "weba": "audio/webm",
        "webm": "video/webm",
        "webp": "image/webp",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xml": "application/xml",
        "yaml": "application/yaml",
        "yml": "application/yaml",
        "zip": "application/zip",
        "7z": "application/x-7z-compressed"
    }

    static fromExt(ext) {
        if (ext.startsWith(".")) ext = ext.slice(1)
        return this.extToMime[ext] || "application/octet-stream"
    }

    static fromFileName(name) {
        let nameSplit = name.split(".")
        if (nameSplit.length == 1) return "application/octet-stream"

        return Mime.fromExt(nameSplit[nameSplit.length - 1].toLowerCase())
    }
}

module.exports.Mime = Mime