/**
*
*	ROUTES: GET /monitor
*
*
*	DESCRIPTION:
*		- Returns the application status and associated runtime statistics.
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

var monitor = require( './monitor.js' ),
	json = require( './json.js' );

// EXPORTS //

module.exports = [
	monitor,
	json
];
