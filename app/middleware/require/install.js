'use strict';

// MODULES //

var exec = require( 'child_process' ).exec;


// INSTALL //

/**
* FUNCTION: install( request, response, next )
*	Installs requested modules.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after completing install tasks
*/
function install( request, response, next ) {
	var child, cmd;

	cmd = 'npm install ';
	cmd += request.locals.modules.join( ' ' );
	cmd += ' --save';

	child = exec( cmd, onFinish );

	/**
	* FUNCTION: onFinish( error, stdout, stderr )
	*	Callback invoked once modules are installed.
	*
	* @private
	* @param {Error|Null} error - error object
	* @param {String} stdout - standard out
	* @param {String} stderr - standard error
	*/
	function onFinish( error, stdout, stderr ) {
		if ( error ) {
			return next( error );
		}
		request.logger.debug({
			'stdout': stdout,
			'stderr': stderr
		});
		next();
	}
} // end FUNCTION install()


// EXPORTS //

module.exports = install;
