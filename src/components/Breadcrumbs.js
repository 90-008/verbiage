module.exports.hydrate = (ctx) => {
    let { ancestry } = ctx
    if (!ancestry) return {}

    let crumbs = ancestry.map((a) => { return { isLast: false, file: a } })
    crumbs[crumbs.length - 1].isCurrent = true

    return { crumbs: crumbs }
}