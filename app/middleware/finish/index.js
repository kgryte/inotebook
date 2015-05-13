'use strict';

// MODULES //

var topical = require( 'topical' );


// FINISH //

/**
* FUNCTION: finish( request, response, next )
*	Finish middleware.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after completing tasks
*/
function finish( request, response, next ) {
	// Log the response object:
	request.logger.info({ 'response': response });

	// Publish response metrics:
	topical.publish( 'response', {
		'time': parseFloat( response.get( 'X-Response-Time' ) ),
		'bytes': parseInt( response.get( 'Content-Length' ), 10 )
	});
	next();
} // end FUNCTION finish()


// EXPORTS //

module.exports = finish;
