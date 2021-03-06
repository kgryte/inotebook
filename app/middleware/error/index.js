/**
*
*	MIDDLEWARE: error
*
*
*	DESCRIPTION:
*		- Generic error handling middleware.
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

/**
* FUNCTION: onError( error, request, response, next )
*	Middleware for error handling.
*
* @param {Error|Object} error - error object
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after handling the error
*/
function onError( error, request, response, next ) {
	var err = error;
	request.logger.info({ 'error': error });
	if ( err instanceof Error ) {
		err = {
			'status': 500,
			'message': error.message
		};
	}
	response
		.status( err.status )
		.json( err );

	next();
} // end FUNCTION onError()


// EXPORTS //

module.exports = onError;
