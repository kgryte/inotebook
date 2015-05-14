'use strict';

// MODULES //

var browserify = require( 'browserify' );


// BUNDLE //

/**
* FUNCTION: bundle( request, response, next )
*	Bundles the requested modules.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after bundling modules
*/
function bundle( request, response, next ) {
	var b = browserify();
	b.require( request.body );
	b.bundle( done );

	/**
	* FUNCTION: done( error, buffer )
	*	Callback invoked one browserify bundles the modules.
	*
	* @private
	* @param {Error} [error] - error object
	* @param {Buffer} buffer - buffered bundle
	*/
	function done( error, buffer ) {
		if ( error ) {
			return next( error );
		}
		request.logger.debug({
			'bundle': buffer.toString()
		});
		request.locals.bundle = buffer;
		next();
	}
} // end FUNCTION bundle()


// EXPORTS //

module.exports = bundle;
