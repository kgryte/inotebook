'use strict';

// MODULES //

var exec = require( 'child_process' ).exec;


// FUNCTIONS //

/**
* FUNCTION: parse( str )
*	Attempts to parse a string as JSON.
*
* @private
* @param {String} str - string to parse
* @returns {Object|Null} JSON object
*/
function parse( str ) {
	try {
		return JSON.parse( str );
	} catch ( err ) {
		return null;
	}
} // end FUNCTION parse()


// CHECK //

/**
* FUNCTION: check( request, response, next )
*	Checks for already installed modules.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after checking for already installed modules
*/
function check( request, response, next ) {
	var list = request.body,
		child,
		cmd;

	cmd = 'npm ls --depth=0 --production --json';
	child = exec( cmd, onCheck );

	/**
	* FUNCTION: onCheck( error, stdout, stderr )
	*	Callback invoked after checking installed dependencies.
	*
	* @private
	* @param {Error|Null} error - error object
	* @param {String} stdout - standard out
	* @param {String} stderr - standard error
	*/
	function onCheck( error, stdout, stderr ) {
		var installed,
			mods,
			err,
			len,
			i;
		if ( error ) {
			return next( error );
		}
		request.logger.debug({
			'stdout': stdout,
			'stderr': stderr
		});

		installed = parse( stdout );
		if ( installed === null ) {
			err = {
				'status': 500,
				'message': 'Internal server error. Unable to check for installed dependencies. Command result could not be parsed as JSON.'
			};
			return next( err );
		}
		// Only install modules not already installed...
		if ( installed.hasOwnProperty( 'dependencies' ) ) {
			installed = installed.dependencies;
			len = list.length;
			mods = [];
			for ( i = 0; i < len; i++ ) {
				if ( !installed.hasOwnProperty( list[ i ] ) ) {
					mods.push( list[ i ] );
				}
			}
		} else {
			mods = list;
		}
		request.locals.modules = mods;
		next();
	}
} // end FUNCTION check()


// EXPORTS //

module.exports = check;
