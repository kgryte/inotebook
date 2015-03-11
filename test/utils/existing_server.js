'use strict';

// MODULES //

var http = require( 'http' );


// VARIABLES //

// TODO: this should be a command-line option!!!
var PORT = 7337;


// SERVER //

/**
* FUNCTION: create( clbk )
*	Creates a web server and begins listening for HTTP requests.
*
* @param {Function} clbk - callback to invoke after creating the web server
*/
function create( clbk ) {
	var server = http.createServer();
	server.on( 'error', onError );
	server.listen( PORT, onListen );
	function onError( error ) {
		if ( error.code === 'EADDRINUSE' ) {
			console.error( 'Server to be tested is already running.' );
		}
		server.close();
	}
	function onListen() {
		clbk();
	}
} // end FUNCTION create()


// EXPORTS //

module.exports = create;
