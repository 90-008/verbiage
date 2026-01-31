const { join } = require('node:path')

const { App } = require('./src/App.js')

app = new App()

globalThis.Verbiage = app
globalThis.Lavender = app.lavender

app.loadRoutesFromDir(join(__dirname, '/src/routes'))
app.loadComponentsFromDir(join(__dirname, '/src/components'))
app.loadStaticAssetsFromDir(join(__dirname, 'public'))

app.start()