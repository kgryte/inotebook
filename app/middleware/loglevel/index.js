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
