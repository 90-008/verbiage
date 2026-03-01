module.exports.hydrate = ({
    fileName,
    currentDir,
    action,
    hasPermission
}) => {
    let existingFile = fileName ? currentDir.tryGetChild(fileName) : null
    let existingContent
    if (existingFile && !existingFile.isDirectory && action == "edit") existingContent = existingFile?.read().content || ""

    return {
        content: existingContent || "",
        editMode: action == "edit",
        upsertMode: action == "edit",
        deleteMode: action == "delete",
        hasPermission: hasPermission(existingFile)
    }
}