(function() {
    let searchData = null; // { docs: [], index: {} }
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    async function loadIndex() {
        if (searchData) return;
        
        const pathParts = window.location.pathname.split('/');
        const wikiName = pathParts[1];
        
        try {
            const response = await fetch(`/${wikiName}/search-index.json`);
            searchData = await response.json();
        } catch (e) {
            console.error('Failed to load search index', e);
        }
    }

    function tokenize(text) {
        return text.toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(word => word.length > 2);
    }

    function search(query) {
        if (!searchData) return [];
        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return [];

        let resultDocIndices = null;

        for (const token of queryTokens) {
            // Find all indexed words that start with or contain the token
            // This allows for partial matches while still using the index
            let matchingIndices = new Set();
            for (const word in searchData.index) {
                if (word.includes(token)) {
                    searchData.index[word].forEach(idx => matchingIndices.add(idx));
                }
            }

            if (resultDocIndices === null) {
                resultDocIndices = matchingIndices;
            } else {
                // Intersect results (AND search)
                resultDocIndices = new Set([...resultDocIndices].filter(idx => matchingIndices.has(idx)));
            }
            
            if (resultDocIndices.size === 0) break;
        }

        if (!resultDocIndices) return [];

        return [...resultDocIndices]
            .map(idx => searchData.docs[idx])
            .slice(0, 15); // Limit results
    }

    function renderResults(results) {
        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        const wikiName = window.location.pathname.split('/')[1];
        
        searchResults.innerHTML = results.map(item => `
            <div class="search-result-item">
                <a href="/${wikiName}/w/${item.p}">
                    <div class="search-result-title">${item.t} ${item.i ? '📁' : ''}</div>
                    <div class="search-result-path">${item.p}</div>
                    <div class="search-result-excerpt">${item.d}</div>
                </a>
            </div>
        `).join('');
        
        searchResults.style.display = 'block';
    }

    searchInput.addEventListener('focus', loadIndex);
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.trim().length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const results = search(query);
        renderResults(results);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
})();
