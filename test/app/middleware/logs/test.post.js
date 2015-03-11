/* global require, describe, it */
'use strict';

var mpath = './../../../../app/middleware/logs';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	mw = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/logs/post', function tests() {

	it( 'should export an array of middleware', function test() {
		expect( mw ).to.be.an( 'array' );
	});

});
