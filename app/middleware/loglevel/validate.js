/**
*
*	MIDDLEWARE: validate
*
*
*	DESCRIPTION:
*		- Validates a log level request.
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

var isNumber = require( 'validate.io-number' );


// VARIABLES //

var LEVELS = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal'
];


// FUNCTIONS //

/**
* FUNCTION: validLevel( value )
*	Validates a log level.
*
* @private
* @param {Number|String} value - log level
* @returns {Boolean} boolean indicating if the provided level parameter is valid
*/
function validLevel( value ) {
	if ( typeof value === 'string' ) {
		return LEVELS.indexOf( value ) !== -1;
	}
	// TODO: determine if integer check is needed
	return isNumber( value );
} // end FUNCTION validLevel()


// VALIDATE //

/**
* FUNCTION: validate( request, response, next )
*	Validates request parameters for setting the runtime log level.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after validating
*/
function validate( request, response, next ) {
	var query = request.body,
		msg,
		error;

	if ( !validLevel( query.level ) ) {
		msg = 'Invalid query parameter. `level` should either be numeric or one of the following strings: [' + LEVELS.join( ', ' ) + '].';
		error = {
			'status': 400,
			'message': msg
		};
		next( error );
		return;
	}
	next();
} // end FUNCTION validate()


// EXPORTS //

module.exports = validate;
