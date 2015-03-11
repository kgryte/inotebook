/**
*
*	MIDDLEWARE: JSON
*
*
*	DESCRIPTION:
*		- Returns a JSON response.
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
* FUNCTION: json( request, response, next )
*	Returns a JSON response.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after sending a JSON response
*/
function json( request, response, next ) {
	response
		.status( 200 )
		.json( request.locals.monitor );
	next();
} // end FUNCTION json()


// EXPORTS //

module.exports = json;
