const { RouteLeaf } = require("../../lib/waiter/RouteTree")
const { ErrorStrings } = require("../shared/ErrorStrings")

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
            data.setHead("Cache-Control", `max-age=${60 * 60 * 6}`) // 6 hours

            return data
        }
    }
)

module.exports.ErrorHandlerRoute = new RouteLeaf(
    "/_statusCode/:code",
    {
        "GET": (data, { lavender }) => {
            let rej = data.clientRejection

            if (data.contentType && data.contentType.startsWith("text/html")) {
                let strings = ErrorStrings.getErrorString(data.status)

                let rendered = lavender
                    .layout("MinimalLayout")
                    .render("ErrorScreen",
                        {
                            title: strings.title,
                            rejectionStrings: strings,
                            rejectionMessage: rej.data.message || "Something went wrong.",
                            rejectionCode: data.status,
                            rejectionType: rej.data.errorCode || ""
                        }, false)

                data.body = rendered.html
                return data
            } else {
                data.body = JSON.stringify(
                    {
                        message: rej.data.message || "Something went wrong.",
                        code: rej.data.errorCode || "GENERIC_ERROR"
                    }
                )
                return data
            }
        }
    }
)

module.exports.NotFoundHandlerRoute = new RouteLeaf(
    "/_statusCode/404",
    {
        "GET": (data, { lavender }) => {
            let rej = data.clientRejection

            if (rej.data.currentWiki) {
                let rendered = lavender
                    .layout("BaseLayout")
                    .render("WikiNotFoundError",
                        {
                            currentDir: rej.data.currentDir,
                            currentWiki: data.args.wiki,
                            rejectionMessage: rej.data.message || strings.genericMessage
                        }, false)

                data.body = rendered.html
                return data
            }

            if (data.contentType && data.contentType.startsWith("text/html")) {
                let strings = ErrorStrings.getErrorString(data.status)

                let rendered = lavender
                    .layout("MinimalLayout")
                    .render("ErrorScreen",
                        {
                            title: strings.title,
                            rejectionStrings: strings,
                            rejectionMessage: rej.data.message || strings.genericMessage,
                            rejectionCode: data.status
                        }, false)

                data.body = rendered.html
                return data
            } else {
                data.body = rej.data.message ? JSON.stringify({ message: rej.data.message }) : ""
                return data
            }

            return data
        }
    }
)