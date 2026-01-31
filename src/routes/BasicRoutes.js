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
        "GET": async (data) => {
            let asset = Verbiage.assets[data.args.path]

            data.contentType = asset.type
            data.body = await asset.bytes()

            return data
        }
    }
)

module.exports.PageTestRoute = new RouteLeaf(
    "/w/:user/pages/+path",
    {
        "GET": (data) => {
            //let rendered = Lavender.render("BaseLayout", { greeting: "Hello, World!", appRequest: data })
            let rendered = Lavender
                .layout("BaseLayout")
                .render("WikiPage", { greeting: "Hello, World!", appRequest: data })
            //console.log(rendered)

            data.body = rendered.html
            return data
        }
    },
)