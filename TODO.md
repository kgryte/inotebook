TODO
====

1. remove any use of `.bind`
	-	wrap clbks in fcns which use `self`
	-	editor
	-	notebook
	-	...
2. validate.io mods to window
	-	requires rewrite of main lib
3. README
4. ability to require
	- 	make `requirify` and event emitter
		-	useful for progress indicators; e.g., when the module has been installed and required, in addition to bubbling errors
		-	error should be linked to the module name which was requested
	- 	will need a way to keep track of these separate to actual package.json
		-	in inb file, have imported modules
		-	will need to keep in sync with `package.json` used for installing `node_modules`
		-	when load, these are downloaded, browserified, and shipped to the browser along with the notebook
	-	store each requested bundle on the client (local storage, etc)
	-	when a different note requires a module
		-	first check if already in workspace
		-	next check if cache in client db
		-	then request from server
5. demo notebook should come from json stored on server
	-	currently hard coded in a client-side file
	-	sequence
		-	load base application
		-	make a request to a `GET /notebook` endpoint
		-	load notebook and render results
	-	what is not notebook currently exists in a directory?
		-	present a navigation page?
		-	is that really needed, or just a drop down to load a notebook?
6. cache browserified results to skip the `npm install` and `browserify` steps
	-	just return the bundle
	-	
7. check that a 204 status response has a response body!!!
	-	if not, need to update README and app generator boilerplate
8. 
9. `/loglevel` route
	-	allow for setting level for specific channels, multiple channels, etc. --> body would be an array; loop through array and set stream levels; '*' would indicate all streams.
10. 
11. modularize monitor plugins
	-	use compute modules
	-	extract stats object to module to allow it to be stubbed using proxyquire
12. update Makefile targets
	-	test endpts for ui and server
	-	test-cov targets
	- 	see todos
13. may want to consider __not__ using make targets in package.json; just point to node modules
	-	in the evt on a system which does not support Make
	-	actually, while this would be good, not really feasible given the complexity of the test process and its reliance on various variables :(
14. 
15. figure-io components
16. move wct.conf.js to /etc
	-	tmp move file into main directory before testing and then move back
	-	temporary measure until arbitrary location is allowed
17. favicon
18. codemirror
	-	comment addon setup and config
	-	display hints for compute fcns
	-	code/gutter folding
	-	autocomplete
	-	linting
		-	codemirror written before browserify; expects globals in json-lint and javascript-lint
19. ditch codemirror (????)
	-	heavyweight
	-	many DOM elements
	-	see how sublime does keyword highlighting
	-	just for js initially
	-	base on streams => react (?)
20. tangle kit --> yep. will require rewrite.
21. bower in `public` folder (?)
	-	need to update ignore files
22. extract polymer ui components to own repos
23. place vars in workspace
	-	ast
	-	should blacklist certain fcns and variables (e.g., window, doc, createElement, script, etc)
24. ability to print workspace
25. git commit from browser
	-	akin to typical 'save', but with a commit message
	-	every change & run
		-	if no run but change, autosave after so many secs
26. catch errors when executing
	-	bubble back to user
	-	error element
27. compute in worker
	-	cache vars in indexeddb???
	-	see #28
28. iframe
	-	cannot do; as need shared workspace
	-	could do, but would need to marshal and unmarshal values from one frame to another
29. print element should wrap results (no horizontal scroll)
30. 'live' cell mode
	-	for each new line, check if `;`. If not, print the value of the most recent variable assignment (ala mtlb)
	-	most recent, as a fcn may not return a value, but instead mutate a value
31. note toolbar
	-	single toolbar which uses focus, or each note gets its own controls?
32. rewrite prism.js as worker stream
	-	see github-markdown el
	-	then hook into [md-it](https://github.com/markdown-it/markdown-it#syntax-highlighting)
33. `help()` method
	-	how can we do this dynamically? say, by reading the module README.
		-	the README's are regular enough that should be able to parse until `## Tests`
		-	remove badges??? Maybe if not connected to the internet... (otherwise will appear as broken images) --> maybe replace with placeholders
34. fig component should have a chart type attr
	-	dynamically create the desired chart type
35. reserved words
	-	table
	-	plot
	-	help
	-	load
	-	require
	-	
	-	warning similar to MATLAB when a user reassigns a reserved word => or just throw!
		-	ability to restore if mistake
		-	requires, say, a duplicate assignment on window object `__table__`
36. minify during build
37. search (ES)
	-	could perform in browser via worker
	-	would want to display snippets ala sublime
38. ability to gist from an nb
39. btn tips
40. d&d cells from other nbs
41. med style comments?
42. convert nav-bar dd to polymer dd
	-	see polymer core-dd
43. nb cross communication via indexeddb...boom.
44. sortable notes
	- 	*sigh*...prob requires $
45. ability to track individual note diff
	-	this could be tricky, but the granularity could be awesome
46. keyboard shortcuts for creating new notes (taking into acct note mode)
	-	will need to take into acct editor key bindings
47. [node-repl](https://github.com/maxogden/node-repl)
48. list of requireable modules
	-	UI element; e.g., side bar showing the list
49. 



### Mods

1. module manager (manage cache)
2. inotebook init
3. inotebook publish



### Other

1. inotebook init
	-	check if existing `*.inb`
		-	if so, exit
	-	notebook name
	-	notebook desc
	-	author name
	-	license (use canonical license options)
	-	repo
	-	check if `package.json`
		-	if not, create a new one (where deps are stored)
	-	
2. inotebook publish
	-	use npm
	-	prefix with `inotebooks-` or `inb-`
	- 	if `--access` flag, then as scoped package
3. how does installing a notebook work?
	-	what is exported/required?
	-	maybe it is an executable which requires the config and fires up the inotebook server to serve the inotebook contents
	-	if installed globally, would provide a terminal command
	-	if installed locally, would need to `node_modules/.bin/<name>`
	-	notebook cmd combo of prefix `inb-` with notebook name; e.g., `inb-linear-regression`
4. 



### Editor

1. keyboard shortcut to toggle line numbers
2. markdown support (requires dynamic mode)
	-	use markdown-it
	-	include suitable plugins
		-	footnote
		-	dl
		-	sup/sub
		-	will need to write a plugin for markdown-it to support TeX
3. 


### Components

1. nav-bar
	-	extract dropdown colors, etc, to theme styles
		-	will need to think through how theming will work when extended to elements within shadow DOM
	-	replace dropdown with core element
		-	this should also allow removing the separate callbacks 
	-	README
	-	examples
	-	tests
	-	...
2. editor
3. note
	-	move heading to separate component
	-	lang/progress bar to separate component
4. 



### Bugs

1. When edit note title and repeatedly hit backspace, eventually move to left of icon
2. When display editor and rendered markdown, the containers are flush --> want slight margin similar to code and results
3. On Markdown edit, the editor is initially blank until one clicks within the element
4. On Markdown note, if have yet to render, am able to dblclick and hide the editor. Should only hide the editor if the content has been rendered
5. 


### Tests

#### Server

1. require route
2. app fail when run in app directory
3. 



#### Client

1. Everything...


### Art

1. ipyth/jupyter
2. zepellin
3. databricks
4. ijs
5. ijavascript
6. inode
7. [wolfram](http://reference.wolfram.com/language/tutorial/UsingANotebookInterface.html)
8. [mathworks](http://www.mathworks.com/help/matlab/matlab_prog/create-a-matlab-notebook-with-microsoft-word.html)
9. [domino](http://blog.dominodatalab.com/r-notebooks/)
10. rstudio
11. [knitr](http://yihui.name/knitr/)
12. notebookjs
13. 
