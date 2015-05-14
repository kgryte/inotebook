'use strict';

/**
* FUNCTION: send( request, response, next )
*	Returns a response.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after sending a response
*/
function send( request, response, next ) {
	response
		.set( 'Content-type', 'application/javascript' )
		.status( 200 )
		.send( request.locals.bundle );
	next();
} // end FUNCTION send()


// EXPORTS //

module.exports = send;
