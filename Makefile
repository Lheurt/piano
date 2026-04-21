PORT     ?= 8080
REACT_V  := 18.3.1
BABEL_V  := 7.29.0
VENDOR   := vendor

.DEFAULT_GOAL := serve
.PHONY: serve install assets update clean

serve: ## Start a local dev server (Babel requires HTTP to fetch .jsx files)
	@echo "Serving on http://localhost:$(PORT)"
	python3 -m http.server $(PORT)

install: ## Install http-server for faster reloads (optional, serve works without it)
	npm install --save-dev http-server
	@echo "Run: npx http-server -p $(PORT)"

assets: ## Download CDN dependencies to vendor/ for offline use
	mkdir -p $(VENDOR)
	curl -fsSLo $(VENDOR)/react.js       https://unpkg.com/react@$(REACT_V)/umd/react.development.js
	curl -fsSLo $(VENDOR)/react-dom.js   https://unpkg.com/react-dom@$(REACT_V)/umd/react-dom.development.js
	curl -fsSLo $(VENDOR)/babel.js       https://unpkg.com/@babel/standalone@$(BABEL_V)/babel.min.js
	@echo "Update script src in index.html to use vendor/ paths when going offline."

update: ## Show current vs latest versions of React and Babel
	@echo "Pinned versions in this Makefile:"
	@echo "  react / react-dom : $(REACT_V)"
	@echo "  @babel/standalone : $(BABEL_V)"
	@echo ""
	@echo "Latest on npm:"
	@npm view react            version | sed 's/^/  react            : /'
	@npm view react-dom        version | sed 's/^/  react-dom        : /'
	@npm view @babel/standalone version | sed 's/^/  @babel\/standalone : /'
	@echo ""
	@echo "To pin a new version, edit REACT_V / BABEL_V at the top of this Makefile,"
	@echo "update the script src attributes in index.html, then run 'make assets'."

clean: ## Remove vendor/ and node_modules/
	rm -rf $(VENDOR) node_modules package.json package-lock.json
