const { readdirSync, readFileSync, statSync, existsSync } = require('node:fs')
const { join, parse, basename, resolve } = require('node:path')

const { Mime } = require('./shared/mime.js')

const { Waiter } = require('../lib/waiter/WaiterServer.js')
const { Component } = require('../lib/lavender/Component.js')
const { Lavender, Sanitizer } = require('../lib/lavender/Lavender.js')
const { StorageManager } = require('../lib/cabinet/Cabinet.js')
const { SearchIndexer } = require('./SearchIndexer.js')

class App {
    server
    lavender
    assets
    storage
    sanitizer
    wikiName
    searchIndexer
    cachedSearchIndex

    constructor() {
        this.server = new Waiter(this)
        this.lavender = new Lavender()

        this.assets = {}

        let dataDir = resolve(process.env.VERBIAGE_DATA || join(__dirname, '../data'))
        this.wikiName = process.env.VERBIAGE_WIKI || basename(dataDir)
        console.log(`app > data: ${dataDir}`)
        console.log(`app > wiki: ${this.wikiName}`)

        this.storage = new StorageManager(dataDir, {
            mimeFunction: Mime.fromFileName
        })

        this.searchIndexer = new SearchIndexer(this.storage)

        this.sanitizer = new Sanitizer({
            allowedTags: ["p", "a", "b", "i", "div"],
            allowedAttributes: ["href", "style", "class"]
        })

        return this
    }

    getSearchIndex() {
        if (!this.cachedSearchIndex) {
            console.log("app > Rebuilding search index...")
            this.cachedSearchIndex = this.searchIndexer.buildIndex()
        }
        return this.cachedSearchIndex
    }

    invalidateSearchIndex() {
        this.cachedSearchIndex = null
    }

    start() {
        this.server.listen(3001)
        console.log(`app > listening on http://localhost:3001/${this.wikiName}/w/~`)

        return this
    }

    /* 
        Attaches a middleware to the root node of the RouteTree.
        This essentially means the middleware will be found on every search,
        making a global middleware.
    */
    use(fn) {
        this.server.routes.leaves.use(fn)

        return this
    }

    loadRoutesFromDir(where) {
        console.log("app > Importing routes...")
        let files = readdirSync(where)

        files.forEach((f) => {
            let routes = require(join(where, f))
            for (let routeName in routes) {
                let route = routes[routeName]
                this.server.addRoute(route)
                console.log(`app/routes > Imported ${route.path} from ${f}`)
            }
        })
    }

    loadComponentsFromDir(where) {
        console.log("app > Importing components...")
        let files = readdirSync(where, { recursive: true })

        /*
            - Get a list of all .html files in the directory.
            - Strip away their extensions, see if they have a .js counterpart.
            - Combine the HTML and JS, pack it into a new Component instance.
            - Load component into Lavender.
        */
        files.forEach((f) => {
            if (statSync(join(where, f)).isDirectory()) return
            /* Match thing.html but not e.g. thing.error.html or thing.part.html */
            if (!f.match(/^[^.]+\.html$/gm)) return

            let basePart = parse(f).dir + "/" + parse(f).name
            let hasScript = existsSync(join(where, basePart) + ".js")
            let hasFallback = existsSync(join(where, basePart) + ".error.html")
            console.log(`app/html > Importing component ${basePart} | has script: ${hasScript} | has fallback: ${hasFallback}`)

            let template = readFileSync(join(where, basePart) + ".html", { encoding: "utf8" })
            let fallbackTemplate = hasFallback ? readFileSync(join(where, basePart) + ".error.html", { encoding: "utf8" }) : null
            let { hydrate, onError } = hasScript ? require(join(where, basePart) + ".js") : { hydrate: null, onError: null }

            if (hasScript && !hydrate) throw new Error("Component JS file is present but isn't exporting any hydrator")

            let compName = parse(f).name
            let component = new Component(
                { base: template, fallback: hasFallback && fallbackTemplate },
                { base: hydrate, fallback: onError },
                basePart, this.lavender)

            this.lavender.register(compName, component)
        })
    }

    loadStaticAssetsFromDir(where) {
        console.log("app > loading static assets")
        let files = readdirSync(where, { recursive: true })

        files.forEach((f) => {
            if (statSync(join(where, f)).isDirectory()) return

            let assetPath = f.replaceAll("\\", "/")
            console.log(`app/static > Importing asset ${assetPath}`)

            let assetContent = readFileSync(join(where, f))
            this.assets[assetPath] = new Blob([assetContent], { type: Mime.fromExt(parse(f).ext) })
        })
    }

    load() {
        this.loadRoutesFromDir(join(__dirname, '../src/routes'))
        this.loadComponentsFromDir(join(__dirname, '../src/components'))
        this.loadStaticAssetsFromDir(join(__dirname, '../public'))

        return this
    }
}

module.exports.App = App