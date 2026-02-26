module.exports.hydrate = ({
    fileName,
    currentDir,
}) => {
    let existingFile = fileName ? currentDir.tryGetChild(fileName) : null
    let existingContent = existingFile?.read().content || ""

    return {
        content: existingContent
    }
}