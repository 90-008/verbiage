#!/usr/bin/env node
'use strict'

/*
    Static site generator for Verbiage.

    Crawls all wiki content and renders it to static HTML files.
    Write features (edit, delete, upload) are disabled in the output.
    Media files are copied as-is so raw/download links continue to work.

    Usage:
        node build.js <wiki-name> [output-dir]

    Examples:
        node build.js mywiki
        node build.js mywiki ./dist
*/

const { join, dirname, resolve } = require('node:path')
const { mkdirSync, writeFileSync, cpSync, existsSync } = require('node:fs')

const { App } = require('./src/App.js')

// -- args --

const args = process.argv.slice(2)
if (!args[0]) {
    console.error('Usage: node build.js <wiki-name> [output-dir]')
    process.exit(1)
}

const WIKI_NAME = args[0]
const OUT_DIR = args[1] ? resolve(args[1]) : join(__dirname, 'dist')

console.log(`build > wiki:   "${WIKI_NAME}"`)
console.log(`build > output: ${OUT_DIR}`)

// -- setup --
// Load the app without starting the HTTP server (no app.start()).
// This gives us access to the same lavender, storage and sanitizer
// instances used by the live server.

const app = new App()
app.load()

const { lavender, storage, sanitizer } = app

// -- output dir --

mkdirSync(OUT_DIR, { recursive: true })

// -- static assets --
// public/ is served at /static/+path, so copy it to dist/static/

const PUBLIC_DIR = join(__dirname, 'public')
const STATIC_OUT = join(OUT_DIR, 'static')
cpSync(PUBLIC_DIR, STATIC_OUT, { recursive: true })
console.log(`build > copied public/ → ${STATIC_OUT}`)

// -- crawl & render --

let pagesOk = 0
let pagesErr = 0

crawl(storage.files, [storage.files])

console.log(`\nbuild > done — ${pagesOk} pages rendered, ${pagesErr} errors`)
process.exit(pagesErr > 0 ? 1 : 0)

// ---------------------------------------------------------------------------

/*
    Recursively walk the file tree, rendering each node.
    We track ancestry ourselves so we don't need a second storage.dig() call
    per file (though dig() results would be equivalent).
*/
function crawl(file, ancestry) {
    renderPage(file, ancestry)

    if (file.isDirectory) {
        file.list()
        for (let [, child] of file.items) {
            crawl(child, [...ancestry, child])
        }
    } else {
        copyRaw(file)
    }
}

function renderPage(file, ancestry) {
    let path = file.pathStripped // "~" for root, "dir/file.md" for others

    try {
        let currentDir = ancestry.findLast(f => f.isDirectory)
        currentDir.list()

        let result = lavender.layout("BaseLayout").render("WikiPage", {
            sanitizer,
            ancestry,
            currentDir,
            currentWiki: WIKI_NAME,
            currentFile: file,
            // writeEnabled is intentionally absent — templates treat it as falsy
            // and hide all edit/delete/upload controls.
        }, false)

        if (result.anyErrored) {
            console.warn(`build > [warn] /${WIKI_NAME}/w/${path} — component error`)
        }

        // Mirror the URL structure: /:wiki/w/<pathStripped>/index.html
        // This means the path "~" → dist/:wiki/w/~/index.html
        //                    "docs/page.md" → dist/:wiki/w/docs/page.md/index.html
        let outPath = join(OUT_DIR, WIKI_NAME, 'w', path, 'index.html')
        mkdirSync(dirname(outPath), { recursive: true })
        writeFileSync(outPath, result.html || '', 'utf8')

        console.log(`build > [ok]  /${WIKI_NAME}/w/${path}`)
        pagesOk++
    } catch (e) {
        console.error(`build > [err] /${WIKI_NAME}/w/${path} — ${e.message}`)
        pagesErr++
    }
}

/*
    Copy a raw (non-text) file so that /:wiki/raw/:path links keep working.
    Text files are skipped — their content is already embedded in the HTML.
*/
function copyRaw(file) {
    try {
        let outPath = join(OUT_DIR, WIKI_NAME, 'raw', file.pathStripped)
        mkdirSync(dirname(outPath), { recursive: true })
        let read = file.read()
        writeFileSync(outPath, read.content)
    } catch (e) {
        console.error(`build > [err] copy raw ${file.pathStripped} — ${e.message}`)
    }
}
