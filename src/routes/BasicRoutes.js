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
)

module.exports.PageTestRoute = new RouteLeaf(
    "/w/:user/pages/+path",
    {
        "GET": (data) => {
            let rendered = Lavender.render("TestComponent", { greeting: "Hello, World!", appRequest: data })

            data.body = rendered
            return data
        }
    },
)