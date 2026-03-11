const { Markdawn } = require("../../lib/markdawn/Markdawn")
const { FileListPresenter } = require("../presenters/FileListPresenter")

module.exports.hydrate = ({
    sanitizer,
    currentFile,
    currentDir,
    currentWiki
}) => {
    let isDirectory = currentFile.isDirectory

    let presented = new FileListPresenter(currentDir).items()

    let contentType = currentFile.mimeType
    let isMediaFile = isDirectory == false && currentFile.isMediaFile

    let markdown

    if (!isMediaFile) {
        let document
        if (!isDirectory) {
            document = currentFile.read().content.toString('utf8')
        } else {
            document = currentFile.tryGetChild("readme.md", false)?.read().content.toString('utf8')
        }

        if (document == null) {
            let newLink = currentDir.path == "/"
                ? `/${currentWiki}/edit/~?name=README.md`
                : `/${currentWiki}/edit/${currentDir.path}?name=README.md`
            document = `*This directory has no readme file.* {{${newLink}|Click here to create one}}.`
        }

        let dawn = new Markdawn({ escaperFunction: sanitizer.escape })

        let textSanitized = sanitizer.sanitize(document)
        markdown = contentType == "text/markdown" || isDirectory ? dawn.render(textSanitized, true, currentFile.name) : dawn.renderPlainText(textSanitized, currentFile.name)
    }

    let fileType = {
        document: !isDirectory,
        directory: isDirectory,
        media: isMediaFile,
        printable: !isMediaFile,
        image: isMediaFile && contentType.startsWith("image/"),
        audio: isMediaFile && contentType.startsWith("audio/"),
        video: isMediaFile && contentType.startsWith("video/")
    }

    return {
        markdown: markdown || {},
        docTitle: markdown?.features?.title || currentFile.name,
        docDescription: markdown?.features?.description || "",
        readmeFile: currentFile.isDirectory ? currentFile.tryGetChild("readme.md", false) : null,
        fileList: presented,
        fileType: fileType,
        generic: !(fileType.printable || fileType.image || fileType.audio || fileType.video)
    }
}