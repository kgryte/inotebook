'use strict';

/**
* FUNCTION: okay( request, response, next )
*	Returns a success response.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after sending response
*/
function okay( request, response, next ) {
	response.sendStatus( 204 );
	next();
} // end FUNCTION okay()


// EXPORTS //

module.exports = okay;
