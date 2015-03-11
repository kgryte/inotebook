/* global require, describe, it */
'use strict';

var mpath = './../../../app/node_modules/server';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	server = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/server', function tests() {

	it( 'should export a function', function test() {
		expect( server ).to.be.a( 'function' );
	});

	it( 'should export a server factory' );

	it( 'should create an HTTP server' );

	it( 'should create an HTTPS server' );

});
