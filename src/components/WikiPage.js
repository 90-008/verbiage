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
    let isMediaFile = isDirectory == false && !contentType.startsWith("text/")

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
        markdown = contentType == "text/markdown" ? dawn.render(textSanitized) : dawn.renderPlainText(textSanitized)
    } else {

    }


    return {
        markdown: markdown || {},
        fileList: presented,
        fileType: {
            document: !isDirectory,
            directory: isDirectory,
            media: isMediaFile
        }
    }
}