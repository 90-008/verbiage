const { Markdawn } = require("../lib/markdawn/Markdawn");

const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", 
    "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the", 
    "their", "then", "there", "these", "they", "this", "to", "was", "will", "with"
]);

class SearchIndexer {
    storage;

    constructor(storage) {
        this.storage = storage;
    }

    tokenize(text) {
        if (!text) return [];
        return text.toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(word => word.length > 2 && !STOP_WORDS.has(word));
    }

    buildIndex() {
        let docs = [];
        let wordMap = {}; // word -> [docIndex, docIndex, ...]

        this.crawl(this.storage.files, docs, wordMap);

        return {
            docs: docs,
            index: wordMap
        };
    }

    crawl(file, docs, wordMap) {
        this.indexFile(file, docs, wordMap);

        if (file.isDirectory) {
            file.list();
            for (let [, child] of file.items) {
                this.crawl(child, docs, wordMap);
            }
        }
    }

    indexFile(file, docs, wordMap) {
        let path = file.pathStripped;
        let isDirectory = file.isDirectory;
        
        let content = "";
        if (isDirectory) {
            let readme = file.tryGetChild("readme.md", false);
            if (readme) {
                content = readme.read().content.toString('utf8');
            }
        } else if (file.mimeType === "text/markdown" || file.mimeType === "text/plain") {
            try {
                content = file.read().content.toString('utf8');
            } catch (e) {
                console.error(`indexer > failed to read ${file.absolutePath}: ${e.message}`);
            }
        }

        let title = file.name;
        let excerpt = "";

        if (content) {
            let dawn = new Markdawn();
            let features = dawn.getFeatures(content.split("\n"), file.name);
            title = features.title || file.name;
            excerpt = features.excerpt || "";
        }

        let docIndex = docs.length;
        docs.push({
            t: title,
            p: path,
            d: excerpt,
            i: isDirectory
        });

        // Index title, path, and content
        let tokens = new Set([
            ...this.tokenize(title),
            ...this.tokenize(path),
            ...this.tokenize(content)
        ]);

        for (let token of tokens) {
            if (!wordMap[token]) wordMap[token] = [];
            wordMap[token].push(docIndex);
        }
    }
}

module.exports = { SearchIndexer };
