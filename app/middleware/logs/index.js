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
