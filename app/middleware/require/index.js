'use strict';

// MIDDLEWARE //

var parse = require( 'body-parser' ).json(),
	validate = require( './validate.js' ),
	init = require( './init.js' ),
	check = require( './check.js' ),
	install = require( './install.js' ),
	bundle = require( './bundle.js' ),
	send = require( './send.js' );


// EXPORTS //

module.exports = [
	parse,
	validate,
	init,
	check,
	install,
	bundle,
	send
];
