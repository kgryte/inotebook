/**
*
*	ROUTES: POST /logs
*
*
*	DESCRIPTION:
*		- Route providing an endpoint for dumping client-side logs.
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

var parse = require( 'body-parser' ).json({ 'limit': '50mb' }),
	logs = require( './logs.js' ),
	okay = require( './okay.js' );


// EXPORTS //

module.exports = [
	parse,
	logs,
	okay
];
