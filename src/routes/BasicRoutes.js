const { RouteLeaf } = require("../../lib/waiter/RouteTree")

module.exports.HomePageRoute = new RouteLeaf(
    "/",
    {
        "GET": (req) => {
            req.setHead("X-Hello", "Hello, World!")

            req.set("Hello, World!")

            return req
        }
    },
).use((data) => {
    if (data.request.url.startsWith("/api")) {
        data.contentType = "application/json; charset=utf-8"
    } else {
        data.contentType = "text/html; charset=utf-8"
    }
})

module.exports.StaticAssetRoute = new RouteLeaf(
    "/static/+path",
    {
        "GET": async (data, { assets }) => {
            let asset = assets[data.args.path]

            data.contentType = asset.type
            data.body = await asset.bytes()

            return data
        }
    }
)