const { Markdawn } = require("../../lib/markdawn/Markdawn")
const { FileListPresenter } = require("../presenters/FileListPresenter")

module.exports.hydrate = ({
    sanitizer,
    currentFile,
    currentDir,
    currentWiki
}) => {
    let isDirectory = currentFile.isDirectory
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

    let md = document
    let mdSanitized = sanitizer.sanitize(md)
    let ren = new Markdawn({ escaperFunction: sanitizer.escape }).render(mdSanitized)

    let presented = new FileListPresenter(currentDir).items()

    return {
        markdown: ren,
        fileList: presented,
        fileType: {
            document: !isDirectory,
            directory: isDirectory
        }
    }
}