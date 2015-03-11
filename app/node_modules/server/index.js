/**
*
*	SERVER
*
*
*	DESCRIPTION:
*		- Returns a function to create an application server.
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

'use strict';

// MODULES //

var http = require( 'http' );


// SERVER //

/**
* FUNCTION: create( clbk )
*	Creates an HTTP server.
*
* @param {Function} clbk - callback to run after initializing the server
*/
function create( next ) {
	/* jshint validthis:true */
	this.server = http.createServer( this );
	next();
} // end FUNCTION create()


// EXPORTS //

module.exports = create;
