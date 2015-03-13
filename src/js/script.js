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

/**
* Code editor.
*/
var createEditor = require( './editor.js' );

/**
* Compute methods.
*/
require( './compute-io.js' );


// FUNCTIONS //

/**
* FUNCTION: onReady()
*	Callback invoked when Polymer is ready.
*/
function onReady() {
	createEditor( '#editor-1' );
} // end FUNCTION onReady()


// MISC //

window.print = function( val ) {
	return val;
};


// SCRIPT //

window.addEventListener( 'polymer-ready', onReady );
