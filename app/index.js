/**
*
*	APP
*
*
*	DESCRIPTION:
*		- Returns a method for creating and booting an express application.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var express = require( 'express' ),
	bootable = require( 'bootable' ),
	server = require( 'server' ),
	logger = require( 'logger' ),
	middleware = require( './middleware' );


// VARIABLES //

var PROTOCOL = 'http',
	PORT = 7337;


// FUNCTIONS //

/**
* FUNCTION: onError( error )
*	Server error event handler.
*
* @private
* @param {Error} error - server error
*/
function onError( error ) {
	if ( error.code === 'EADDRINUSE' ) {
		logger.info( 'Server address already in use.' );
	}
	logger.info({ 'error': error });
	return process.exit( -1 );
} // end FUNCTION onError()

/**
* FUNCTION: onListen()
*	Callback invoked once a server is listening and ready to handle requests.
*
* @private
*/
function onListen() {
	logger.info( PROTOCOL.toUpperCase() + ' server initialized. Server is listening for requests on port: ' + PORT + '.' );
} // end FUNCTION onListen()


// APP //

/**
* FUNCTION: boot( [clbk] )
*	Defines the boot order for an express application. When invoked, creates and boots the application.
*
* @param {Function} [clbk] - callback to invoke after successfully booting the application
* @returns {Function} express application
*/
function boot( clbk ) {
	// [0] Create the application...
	var app = bootable( express() );

	// [1] Bind application middleware...
	app.phase( middleware );

	// [2] Create the server...
	app.phase( server );

	// [3] Boot the application...
	app.boot( onBoot );

	return app;

	/**
	* FUNCTION: onBoot( [error] )
	*	Callback invoked after application boot sequence completion.
	*
	* @private
	* @param {Error} [error] - error object
	*/
	function onBoot( error ) {
		if ( error ) {
			logger.info({ 'error': error });
			return process.exit( -1 );
		}
		app.server.on( 'error', onError );
		app.server.listen( PORT, onListen );
		if ( clbk ) {
			clbk();
		}
	} // end FUNCTION onBoot()
} // end FUNCTION boot()


// EXPORTS //

module.exports = boot;
