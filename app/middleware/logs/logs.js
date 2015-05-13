'use strict';

// MODULES //

var logger = require( 'logger' );


// LOGS //

/**
* FUNCTION: logs( request, response, next )
*	Dumps client-side logs.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after finishing
*/
function logs( request, response, next ) {
	var cid = request.get( 'X-Request-Client' );
	logger.info({
		'cid': cid,
		'logs': request.body
	});
	next();
} // end FUNCTION logs()


// EXPORTS //

module.exports = logs;
