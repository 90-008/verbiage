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
            //let rendered = Lavender.render("BaseLayout", { greeting: "Hello, World!", appRequest: data })
            let rendered = Lavender
                .layout("BaseLayout")
                .render("TestComponent", { greeting: "Hello, World!", appRequest: data })
            console.log(rendered)

            data.body = rendered.html
            return data
        }
    },
)