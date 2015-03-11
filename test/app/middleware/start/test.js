/* global require, describe, it */
'use strict';

var mpath = './../../../../app/middleware/start';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	start = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/start', function tests() {

	// SETUP //

	var request = {},
		response = {},
		next = function(){};

	// TESTS //

	it( 'should export a function', function test() {
		expect( start ).to.be.a( 'function' );
	});

	it( 'should append a locals object to the request object', function test() {
		start( request, response, next );
		expect( request.locals ).to.be.an( 'object' );
	});

	it( 'should append an id', function test() {
		start( request, response, next );
		assert.property( request, 'rid' );
		expect( request.rid ).to.be.a( 'string' );
	});

	it( 'should append a logger to the request object', function test() {
		start( request, response, next );
		assert.property( request, 'logger' );
		expect( request.logger ).to.be.an( 'object' );
	});

	it( 'should invoke a callback when complete', function test( done ) {
		next = function() {
			assert.ok( true );
			done();
		};
		start( request, response, next );
	});

});
