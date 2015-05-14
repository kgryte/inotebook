'use strict';

// MODULES //

var isStringArray = require( 'validate.io-string-array' );


// VALIDATE //

/**
* FUNCTION: validate( request, response, next )
*	Validates request parameters.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after validating
*/
function validate( request, response, next ) {
	var query = request.body,
		msg,
		error;

	if ( !isStringArray( query ) ) {
		msg = 'Invalid request. Must provide a string array.';
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
