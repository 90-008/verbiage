module.exports.hydrate = ({
    fileName,
    currentDir,
    action,
    hasPermission
}) => {
    let existingFile = fileName ? currentDir.tryGetChild(fileName) : null
    let isEditable = existingFile && existingFile.mimeType.startsWith("text/")
    let existingContent
    if (
        existingFile
        && !existingFile.isDirectory
        && action == "edit"
        && isEditable
    ) existingContent = existingFile.read().content || ""

    return {
        content: existingContent || "",
        editable: isEditable,
        editMode: action == "edit",
        upsertMode: action == "edit",
        deleteMode: action == "delete",
        hasPermission: hasPermission(existingFile)
    }
}