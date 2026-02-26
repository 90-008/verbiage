class AppRequest {
    request
    response
    args

    /* 
        headers is a list of [name, value] tuples.

        Not to be confused with this.request.headers, which are the received headers.
        These ones are to be sent.
     */
    headers
    status
    _cookiesParsed = null
    _formDataParsed = null
    _searchParamsParsed = null

    isStreamed
    body
    clientBody
    contentType

    /* Only decode cookies on-demand. Cache the result. */
    get cookies() {
        if (this._cookiesParsed != null) return this._cookiesParsed

        this._cookiesParsed = this.decodeCookies(this.request.headers["cookie"])
        return this._cookiesParsed
    }

    get searchParams() {
        if (this._searchParamsParsed != null) return this._searchParamsParsed

        let searchString = this.request.url.match(/.+\?(.+)/)[1]
        this._searchParamsParsed = searchString != null ? new URLSearchParams(searchString) : new URLSearchParams()

        return this._searchParamsParsed
    }

    async formData() {
        if (this._formDataParsed != null) return this._formDataParsed

        let typeHeader = new Header(this.request.headers["content-type"])
        if (typeHeader.value != "multipart/form-data") return null

        this._formDataParsed = new MultipartForm(this.clientBody, typeHeader.attributes["boundary"])
        return this._formDataParsed
    }

    constructor(req, res, args, clientBody) {
        this.request = req
        this.response = res
        this.args = args

        this.headers = []
        this.status = 200

        this.isStreamed = false
        this.body = ""
        this.clientBody = clientBody
        this.contentType = null

        return this
    }

    setCookie(cookie) {
        if (!cookie instanceof Cookie) throw "Must be a Cookie object."

        this.setHead("Set-Cookie", cookie.serialize(), true)
    }

    decodeCookies(header) {
        if (!header) return {}

        let decoded = {}
        let split = header.split("; ")

        split.forEach(pair => {
            let pairSplit = pair.split("=")
            let cName = pairSplit[0]
            let cValue = decodeURIComponent(pairSplit.slice(1).join())

            decoded[cName] = cValue
        })

        return decoded
    }

    setHead(name, value, forceNew = false) {
        if (forceNew) {
            this.headers.push([name, value])
            return this
        }

        let existing = this.headers.findIndex((item) => { return item[0] == name })

        existing > -1 ? this.headers[existing][1] = value : this.headers.push([name, value])

        return this
    }

    getHead(name) {
        let existing = this.headers.findIndex((item) => { return item[0] == name })

        if (existing == -1) return null

        return this.headers[existing]
    }

    headersToList() {
        let final = []
        if (this.contentType != null) this.setHead("Content-Type", this.contentType)

        this.headers.forEach((item) => {
            final = final.concat([item[0], item[1]])
        })

        return final
    }

    set(data) {
        if (this.isStreamed) throw "Attempt to set body when the request is using streamed mode"
        this.body = data

        return this
    }

    write(data) {
        if (!this.response.headersSent) throw "Attempt to write body before headers"

        this.response.write(data)

        return this
    }

    writeHead() {
        this.isStreamed = true

        this.response.writeHead(this.status, this.headersToList())

        return this
    }

    end() {
        if (!this.isStreamed) throw "Attempt to end response in non-streamed mode"

        this.response.end()

        return this
    }
}

class Cookie {
    name = null
    value = null

    domain = null
    expiresAt = null
    path = null
    sameSite = null
    isSecure = null
    isHttpOnly = null

    /* poor man's enum */
    SameSiteValue = {
        Strict: "Strict",
        Lax: "Lax",
        None: "None"
    }

    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    /* Return a properly-formatted cookie definition to be put in a Set-Cookie header */
    serialize() {
        if (!this.name || !this.value) throw "Cookie must have at least a name and a value to serialize"
        let final = ""

        final += this.name + "=" + encodeURIComponent(this.value) + ";" // <cookie name>=<cookie value>;

        let attributes = [
            this.domain && `Domain=${encodeURIComponent(this.domain)};`,
            this.expiresAt && `Expires=${new Date(this.expiresAt).toUTCString()};`,
            this.path && `Path=${this.path};`,
            this.sameSite && `SameSite=${this.sameSite};`,
            this.isSecure && `Secure;`,
            this.isHttpOnly && `HttpOnly;`,
        ]

        final += attributes.filter(a => a != null).join("")

        return final
    }
}

class Header {
    /*
        Utility class for parsing headers with attributes. Example usage:

        new Header("Header-Name: value; content-type=utf-8;") -> {name: "Header-Name", value: "value", attributes: {"content-type": "utf-8"}}
    */
    name = null
    value = null
    attributes = {}

    constructor(head) {
        /*
            Some-Header: value; attribute="asdf" -> { name: "Some-Header", value: "value", attributes..." }
            value; attribute="asdf" -> { name: null, value: "value", attributes..." }
        */
        let fullMatch = head.match(/(.+): (.+)/)
        let content

        if (fullMatch) {
            this.name = fullMatch[1]
            content = fullMatch[2]
        } else {
            content = head
        }
        let splits = content.split(";")
        splits = splits.map(s => s.trim())

        this.value = splits[0]
        splits.shift()

        for (let attr of splits) {
            /*
                Quotes optional.

                attribute="asdf" -> { attribute: "asdf" }
                attribute=asdf -> { attribute: "asdf" }
            */
            let attrMatch = attr.match(/(.+)="?([^"]+)"?/)
            if (!attrMatch) continue

            let attrName = attrMatch[1]
            let attrValue = attrMatch[2]
            this.attributes[attrName] = decodeURIComponent(attrValue)
        }

        return this
    }
}


/* 
    Utility class for parsing multipart form data. Takes the form data and a boundary.

    See MultipartField below for field return values.
*/
class MultipartForm {
    boundary = null
    fields = {}

    bytesStartsWith(bytes, pattern) {
        for (let i = 0; i < pattern.length - 1; i++) {
            if (bytes[i] != pattern[i]) return false
        }

        return true
    }

    lineToString(line) {
        return Buffer.from(line.slice(0, line.length - 2)).toString() // cut out trailing newline
    }

    constructor(data, boundary) {
        this.boundary = boundary
        let boundaryBytes = Array.from(new TextEncoder().encode(`--${boundary}`))

        let state = MultipartParseState.Start
        let cursor = 0
        let currentLine = []
        let currentField = new MultipartField()

        while (state != MultipartParseState.Complete) {
            let current = data[cursor]
            if (current == null) { state = MultipartParseState.Complete; continue }

            currentLine.push(current)
            cursor++

            if (currentLine[currentLine.length - 1] != 10) continue // if not newline

            switch (state) {
                case MultipartParseState.Start:
                    if (this.lineToString(currentLine).startsWith(`--${boundary}`)) {
                        state = MultipartParseState.ParseHeaders
                    }
                    break
                case MultipartParseState.ParseHeaders:
                    if (this.lineToString(currentLine).trim().length == 0) { // nothing but a newline
                        state = MultipartParseState.WriteBody
                    } else {
                        let head = new Header(this.lineToString(currentLine))
                        currentField.headers[head.name.toLowerCase()] = head
                    }
                    break
                case MultipartParseState.WriteBody:
                    if (this.bytesStartsWith(currentLine, boundaryBytes)) { // if body chunk starts with our boundary
                        state = MultipartParseState.ParseHeaders

                        /* consume current field */
                        currentField.name = currentField.headers["content-disposition"]?.attributes.name
                        currentField.filename = currentField.headers["content-disposition"]?.attributes.filename
                        currentField.type = currentField.headers["content-type"]?.value

                        currentField.body.splice(-2, 2) // cut trailing newline
                        currentField.body = Buffer.from(currentField.body)

                        this.fields[currentField.name] = currentField
                        currentField = new MultipartField()
                    } else {
                        for (let push of currentLine) { currentField.body.push(push) }
                    }
                    break
                default:
                    break
            }

            currentLine = []
        }

        return this
    }
}

class MultipartField {
    name = ""
    type = ""
    filename = ""
    headers = {}
    body = []

    constructor() {
        return this
    }
}

const MultipartParseState = {
    Complete: 0,
    Start: 1,
    ParseHeaders: 2,
    WriteBody: 3
}

module.exports.AppRequest = AppRequest;
module.exports.Cookie = Cookie;
module.exports.Header = Header;
module.exports.MultipartForm = MultipartForm;