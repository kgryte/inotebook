'use strict';

// MODULES //

var fs = require( 'fs' ),
	path = require( 'path' );


// VARIABLES //

var cwd = process.cwd(),
	filepath,
	file;

file = fs.readFileSync( path.join( __dirname, 'package.json' ), 'utf8' );

filepath = path.join( cwd, 'package.json' );


// INIT //

/**
* FUNCTION: init( request, response, next )
*	Runs initialization steps.
*
* @param {Object} request - HTTP request object
* @param {Object} response - HTTP response object
* @param {Function} next - callback to invoke after completing initialization steps
*/
function init( request, response, next ) {
	request.locals.install = '';
	request.locals.bundle = '';

	fs.exists( filepath, onExists );

	/**
	* FUNCTION: onExists( bool )
	*	Callback invoked after checking for a file.
	*
	* @private
	* @param {Boolean} bool - boolean indicating if a file exists
	*/
	function onExists( bool ) {
		if ( !bool ) {
			fs.writeFile( filepath, file, {
				'encoding': 'utf8'
			}, onWrite );
		} else {
			next();
		}
	}
	/**
	* FUNCTION: onWrite( [error] )
	*	Callback invoked after attempting to write a file.
	*
	* @private
	* @param {Error} [error] - error object
	*/
	function onWrite( error ) {
		if ( error ) {
			return next( error );
		}
		next();
	}
} // end FUNCTION init()


// EXPORTS //

module.exports = init;
