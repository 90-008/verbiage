const { TabList } = require("./generic/TabList")

/* ugly, should come up with a better solution later */
function actionLink(action, filename, dir, wiki) {
    return `/${wiki}/edit/${dir.pathNormalized}?${filename ? "name=" + filename + "&" : ""}action=${action}`
}

module.exports.hydrate = ({
    fileName,
    currentDir,
    currentWiki,
    action,
    hasPermission
}) => {
    let existingFile = fileName ? currentDir.tryGetChild(fileName) : null
    let isEditable = (!existingFile?.isMediaFile) || !existingFile
    let existingContent
    if (
        existingFile
        && !existingFile.isDirectory
        && action == "edit"
        && isEditable
    ) existingContent = existingFile.read().content || ""

    let actionTabs = new TabList(action)
        .tab("edit", "Edit file", actionLink("edit", fileName, currentDir, currentWiki))
        .tab("upload", "Upload files", actionLink("upload", fileName, currentDir, currentWiki))
        .tab("mkdir", "Create directory", actionLink("mkdir", fileName, currentDir, currentWiki))

    return {
        content: existingContent || "",
        editable: isEditable,
        editMode: action == "edit",
        upsertMode: action == "edit",
        deleteMode: action == "delete",
        hasPermission: hasPermission(existingFile),
        actionTabs: actionTabs
    }
}