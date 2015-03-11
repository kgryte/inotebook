TODO
====

1. update travis.yml to include most recent build process
2. update to latest Polymer / web-component-tester, etc
3. update wct-local, wct-sauce
4. update vulcanize
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
	-	extract stats object to module to allow it to be stubbed using proxyrequire
12. update Makefile targets
	-	test endpts for ui and server
	-	remove distributable polymer target
13. may want to consider __not__ using make targets in package.json; just point to node modules
	-	in the evt on a system which does not support Make
14. 
