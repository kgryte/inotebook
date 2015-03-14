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
14. browserify compute.io
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
20. tangle kit --> yep.
21. bower in `public` folder (?)
	-	need to update ignore files
22. extract polymer ui components to own repos
23. place vars in workspace
	-	ast
24. ability to print workspace
25. git commit from browser
	-	akin to typical 'save', but with a commit message
26. catch errors when executing
	-	bubble back to user
	-	error element
27. compute in worker
28. iframe
29. 



### Editor

1. keyboard shortcut to toggle line numbers
2. markdown support (dynamic mode)
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
12. 
