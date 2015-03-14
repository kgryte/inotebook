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
	var keys,
		i;

	// Bind all compute methods to the global `window` object...
	keys = Object.keys( compute );
	for ( i = 0; i < keys.length; i++ ) {
		window[ keys[i] ] = compute[ keys[i] ];
	}
} // end FUNCTION onReady()

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


// SCRIPT //

window.print = print;
window.addEventListener( 'polymer-ready', onReady );
