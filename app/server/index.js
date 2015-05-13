'use strict';

// MODULES //

var fs = require( 'fs' ),
	path = require( 'path' ),
	http = require( 'http' ),
	https = require( 'https' ),
	config = require( 'config' ),
	logger = require( 'logger' ),
	root = require( 'root' );


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
	throw error;
} // end FUNCTION onError()

/**
* FUNCTION: httpServer( app )
*	Creates an HTTP server.
*
* @private
* @param {Function} app - application
* @returns {Server} HTTP server
*/
function httpServer( app ) {
	return http.createServer( app );
} // end FUNCTION httpServer()

/**
* FUNCTION: httpsServer( app )
*	Creates an HTTPS server.
*
* @private
* @param {Function} app - application
* @returns {Server} HTTPS server
*/
function httpsServer( app ) {
	var ssl = config.get( 'ssl' ),
		opts = {},
		filepath,
		err;

	// TODO: generalize for additional HTTPS options...

	// Get the private key for SSL...
	filepath = path.resolve( root, ssl.key );
	if ( !fs.existsSync( filepath ) ) {
		err = new Error( 'Unable to find private key for SSL. Path: `' + ssl.key + '`.' );
		return onError( err );
	}
	opts.key = fs.readFileSync( filepath, 'utf8' );

	// Get the public certificate for SSL...
	filepath = path.resolve( root, ssl.cert );
	if ( !fs.existsSync( filepath ) ) {
		err = new Error( 'Unable to find public certificate for SSL. Path: `' + ssl.cert + '`.' );
		return onError( err );
	}
	opts.cert = fs.readFileSync( filepath, 'utf8' );

	// Create the HTTPS server:
	return https.createServer( opts, app );
} // end FUNCTION httpServer()


// SERVER //

/**
* FUNCTION: create( next )
*	Creates an HTTP server.
*
* @param {Function} next - callback to run after initializing the server
*/
function create( next ) {
	/* jshint validthis:true */
	var server,
		port,
		ssl;

	// Get server configuration settings...
	port = config.get( 'port' );
	ssl = config.get( 'ssl.enabled' );

	// Determine if we need to create a basic or secure HTTP server...
	if ( ssl ) {
		server = httpsServer( this );
	} else {
		server = httpServer( this );
	}
	server.on( 'error', onError );

	// Begin listening for HTTP requests...
	server.listen( port, onListen );

	// Expose the server to the application:
	this.server = server;

	/**
	* FUNCTION: onListen()
	*	Callback invoked once a server is listening and ready to handle requests.
	*
	* @private
	*/
	function onListen() {
		logger.info( ( ( ssl ) ? 'HTTPS' : 'HTTP' ) + ' server initialized. Server is listening for requests on port: ' + server.address().port + '.' );
		next();
	} // end FUNCTION onListen()
} // end FUNCTION create()


// EXPORTS //

module.exports = create;
