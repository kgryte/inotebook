/**
*
*	ROUTES: PUT /loglevel
*
*
*	DESCRIPTION:
*		- Route for setting the runtime log level.
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

// MIDDLEWARE //

var parse = require( 'body-parser' ).json(),
	validate = require( './validate.js' ),
	level = require( './level.js' ),
	okay = require( './okay.js' );


// EXPORTS //

module.exports = [
	parse,
	validate,
	level,
	okay
];
