'use strict';

// MODULES //

var express = require( 'express' ),
	bootable = require( 'bootable' ),
	config = require( 'config' ),
	logger = require( 'logger' ),
	isObject = require( 'validate.io-object' ),
	middleware = require( './middleware' ),
	server = require( './server' );


// FUNCTIONS //

/**
* FUNCTIONS: onBoot( [clbk] )
*	Returns a callback to be invoked after boot completion.
*
* @private
* @param {Function} [clbk] - optional callback
*/
function onBoot( clbk ) {
	/**
	* FUNCTION: onBoot( [error] )
	*	Callback invoked after application boot sequence completion.
	*
	* @private
	* @param {Error} [error] - error object
	*/
	return function onBoot( error ) {
		if ( error ) {
			logger.info({ 'error': error });
			return process.exit( -1 );
		}
		if ( clbk ) {
			clbk();
		}
	}; // end FUNCTION onBoot()
} // end FUNCTION onBoot()


// BOOT //

/**
* FUNCTION: boot( [options[, clbk]] )
*	Defines the boot order for an express application. When invoked, creates and boots the application.
*
* @param {Object} [options] - boot options
* @param {Function} [clbk] - callback to invoke after successfully booting the application
* @returns {Function} express application
*/
function boot( options, clbk ) {
	var nargs = arguments.length,
		opts,
		done,
		app;

	if ( nargs === 1 ) {
		if ( typeof options === 'function' ) {
			done = options;
			opts = {};
		}
		else if ( isObject( options ) ) {
			opts = options;
		}
		else {
			throw new TypeError( 'boot()::invalid input argument. Must provide either an options object or a callback function. Value: `' + options + '`.' );
		}
	}
	else if ( nargs > 1 ) {
		if ( !isObject( options ) ) {
			throw new TypeError( 'boot()::invalid input argument. Options argument must be an object. Value: `' + options + '`.' );
		} else {
			opts = options;
		}
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'boot()::invalid input argument. Callback must be a function. Value: `' + clbk + '`.' );
		} else {
			done = clbk;
		}
	}
	else {
		opts = {};
	}
	// [0] Update application settings...
	config.merge( opts );

	// [1] Set the application log level:
	logger.levels( 'main', config.get( 'logger.level' ) );

	// [2] Log the current run-time environment:
	logger.info( 'Environment configuration: %s.', config.get( 'env' ) );

	// [3] Create the application...
	app = bootable( express() );

	// [4] Bind application middleware...
	app.phase( middleware );

	// [5] Create the server...
	app.phase( server );

	// [6] Boot the application...
	app.boot( onBoot( done ) );

	return app;
} // end FUNCTION boot()


// EXPORTS //

module.exports = boot;
