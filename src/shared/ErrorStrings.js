class ErrorStrings {
    static strings = {
        "default": {
            "title": "Something went wrong.",
            "flavor": "Error",
            "description": "An unspecified error occurred. You (probably) don't need to panic.",
            "genericMessage": "Something went wrong."
        },
        "404": {
            "title": "Not Found",
            "flavor": "Not Found",
            "description": "Couldn't find what you're looking for.",
            "genericMessage": "The page or resource you were looking for could not be found. Check if the URL or link you entered or received is spelled correctly."
        },
        "400": {
            "title": "Bad Request",
            "flavor": "That doesn't seem right.",
            "description": "You submitted a malformed or bad request, and it could not be completed.",
            "genericMessage": "The information you provided in your request was invalid. Please refer to the documentation for usage instructions."
        }
    }

    static getErrorString = (code) => {
        return ErrorStrings.strings[code] || ErrorStrings.strings["default"]
    }
}

module.exports.ErrorStrings = ErrorStrings