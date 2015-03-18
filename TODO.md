TODO
====

1. 
2. 
3. README
4. ability to require
	-	contact server
	-	spawn and run npm install
	-	browserify
	-	return
	- 	will need a way to keep track of these separate to actual package.json
		-	in inb file, have imported modules
		-	when load, these are downloaded, browserified, and shipped to the browser along with the notebook
5. move protocol and port from `app/index.js`
	-	make cmd line options
6. make logger level a command-line option
7. move away from a config file!!!
	-	config node_module becomes more a parser for command-line arguments
	-	see compute-mean
8. ability to create an HTTPS server
9. `/loglevel` route
	-	allow for setting level for specific channels, multiple channels, etc. --> body would be an array; loop through array and set stream levels; '*' would indicate all streams.
10. when setting loglevel, determine if can pass in any numeric value and it will work. If so, do not need `isInteger` check, but simply `isNumber`.
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
	-	table, plot, help
36. minify during build
37. search (ES)
	-	could perform in browser via worker
	-	would want to display snippets ala sublime
38. ability to gist from an nb
39. btn tips
40. d&d cells from other nbs
41. med style comments?
42. 



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
	-	themeChanged
		-	should ensure valid theme is provided
	-	README
	-	examples
	-	tests
	-	...
2. editor
3. 



### Bugs

1. When edit note title and repeatedly hit backspace, eventually move to left of icon
2. 


### Tests

#### Server

1. log level validate --> other values!!!
2. app/logger
3. app/config
4. middleware/index.js
5. 



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
