/**
*
*	SCRIPT: main
*
*
*	DESCRIPTION:
*		- Main application script.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

/* global window */
'use strict';

// MODULES //

var compute = require( 'compute.io' );


// FUNCTIONS //

/**
* FUNCTION: onReady()
*	Callback invoked when Polymer is ready.
*/
function onReady() {
	// TODO
} // end FUNCTION onReady()

/**
* FUNCTION: createGlobals()
*	Binds all compute methods to the global `window` object.
*/
function createGlobals() {
	var keys,
		i;
	keys = Object.keys( compute );
	for ( i = 0; i < keys.length; i++ ) {
		window[ keys[i] ] = compute[ keys[i] ];
	}
} // end FUNCTION createGlobals()

/**
* FUNCTION: print( val )
*	Returns an input value.
*
* @param {*} val - value
* @returns {*} input value
*/
function print( val ) {
	return val;
} // end FUNCTION print()

/**
* FUNCTION: load( url, clbk )
*   Fetches a resource from a provided URL and returns the result to a provided callback.
*
* @param {String} url - resource location
* @param {Function} clbk - callback to invoke upon resource receipt. Function should accept one input argument: [ result ]
*/
function load( url, clbk ) {
	var xhr;

	// Create a new request object:
	xhr = new XMLHttpRequest();

	// Open the request connection:
	xhr.open( 'GET', url, true );

	// Define the state change callback:
	xhr.onreadystatechange = function () {
		if ( xhr.readyState !== 4 || xhr.status !== 200 ){
			return;
		}
		clbk( xhr.responseText );
	};
	// Send the request:
	xhr.send();
} // end FUNCTION load()


// SCRIPT //

createGlobals();
window.print = print;
window.load = load;
window.addEventListener( 'polymer-ready', onReady );
