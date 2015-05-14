/* global window */
'use strict';

// MODULES //

var compute = require( 'compute.io' );


// VARIABLES //

var cache = {};


// FUNCTIONS //

/**
* FUNCTION: onReady()
*	Callback invoked when Polymer is ready.
*/
function onReady() {
	// TODO
} // end FUNCTION onReady()

/**
* FUNCTION: createGlobals()
*	Binds all compute methods to the global `window` object.
*/
function createGlobals() {
	var keys,
		i;
	keys = Object.keys( compute );
	for ( i = 0; i < keys.length; i++ ) {
		window[ keys[i] ] = compute[ keys[i] ];
	}
} // end FUNCTION createGlobals()

/**
* FUNCTION: print( val )
*	Returns an input value.
*
* @param {*} val - value
* @returns {*} input value
*/
function print( val ) {
	return val;
} // end FUNCTION print()

/**
* FUNCTION: load( url, clbk )
*   Fetches a resource from a provided URL and returns the result to a provided callback.
*
* @param {String} url - resource location
* @param {Function} clbk - callback to invoke upon resource receipt. Function should accept one input argument: [ result ]
*/
function load( url, clbk ) {
	var xhr;

	// Create a new request object:
	xhr = new XMLHttpRequest();

	// Open the request connection:
	xhr.open( 'GET', url, true );

	// Define the state change callback:
	xhr.onreadystatechange = function () {
		if ( xhr.readyState !== 4 || xhr.status !== 200 ){
			return;
		}
		clbk( xhr.responseText );
	};
	// Send the request:
	xhr.send();
} // end FUNCTION load()

/**
* FUNCTION: postResource( url, data, clbk )
*	Post data to a resource at a provided URL and return the response to a provided callback.
*
* @param {String} url - resource location
* @param {Object} data - data to be sent to location
* @param {Function} clbk - callback to invoke upon response receipt
*/
function postResource( url, data, clbk ) {
	var xhr;
	if ( url && clbk ) {
		// Create a new request object:
		xhr = new XMLHttpRequest();

		// Open the request connection:
		xhr.open( 'POST', url, true );

		// Set the request header:
		xhr.setRequestHeader( 'Content-type', 'application/json' );

		// Define the state change callback:
		xhr.onreadystatechange = function () {
			if ( xhr.readyState !== 4 || xhr.status !== 200 ){
				if ( xhr.status !== 200 ) {
					// TODO: clean up!!!
					clbk( new Error( 'status code is not 200' ) );
				}
				return;
			}
			clbk( null, xhr.responseText );
		};
		// Send the request:
		xhr.send( data );
	} // end IF (parameters)
} // end FUNCTION postResource()

/**
* FUNCTION: requirify( id )
*	Requires a module.
*
* @param {String} id - module identifier
*/
function requirify( id ) {
	var	protocol,
		host,
		url,
		get;

	protocol = window.location.protocol;
	host = window.location.hostname;
	url = window.location.href + 'require';

	postResource( url, JSON.stringify( [id] ), onResponse );

	function onResponse( error, script ) {
		if ( error ) {
			console.error( error );
		} else {
			// TODO: jshint!
			get = eval( script );
			cache[ id ] = get( id );
		}
	}
} // end FUNCTION requirify()

/**
* FUNCTION: requireModule( id )
*	Require method.
*
* @param {String} id - module identifier
* @returns {*} module
*/
function requireModule( id ) {
	var err;
	if ( !cache.hasOwnProperty( id ) ) {
		err = new Error( 'Cannot find module \'' + id + '\'' );
		err.code = 'MODULE_NOT_FOUND';
		throw err;
    }
    return cache[ id ];
} // end FUNCTION requireModule()


// SCRIPT //

createGlobals();
window.print = print;
window.load = load;
window.requirify = requirify;
window.require = requireModule;
window.addEventListener( 'polymer-ready', onReady );
