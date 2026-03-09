const { TabList } = require("./generic/TabList")

const actionTitles = {
    "edit": "Edit file",
    "upload": "Upload files",
    "delete": "Delete file",
    "mkdir": "Create folder"
}

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
        .tab("mkdir", "Create folder", actionLink("mkdir", fileName, currentDir, currentWiki))

    return {
        content: existingContent || "",
        editable: isEditable,
        editMode: action == "edit",
        upsertMode: action == "edit",
        deleteMode: action == "delete",
        uploadMode: action == "upload",
        createDirMode: action == "mkdir",
        actionTitle: actionTitles[action],
        hasPermission: hasPermission(existingFile),
        actionTabs: actionTabs
    }
}