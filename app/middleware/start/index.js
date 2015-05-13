'use strict';

// MODULES //

var uuid = require( 'node-uuid' ),
	logger = require( 'logger' );


// START //

/**
* FUNCTION: start( request, response, next )
*	Start middleware.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after completing initial tasks
*/
function start( request, response, next ) {
	// Create a `locals` object to house local request variables shared among middleware:
	request.locals = {};

	// Assign the request a unique ID:
	request.rid = uuid.v4();

	// Create a child logger process which retains the request id through each middleware:
	request.logger = logger.child({ 'rid': request.rid });

	// Log the request object:
	logger.info({ 'request': request });

	// Log the request body and associated parameters:
	logger.debug({
		'body': request.body,
		'params': request.params,
		'query': request.query
	});
	// Proceed to next middleware:
	next();
} // end FUNCTION start()


// EXPORTS //

module.exports = start;
