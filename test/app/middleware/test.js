/* global require, describe, it */
'use strict';

var mpath = './../../../app/middleware';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	middleware = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware', function tests() {

	it( 'should export a function', function test() {
		expect( middleware ).to.be.a( 'function' );
	});

	it( 'should bind a defined set of routes to the application' );

});
