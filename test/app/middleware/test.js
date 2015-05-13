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

	// SETUP //

	var app = {
		'use': function use(){},
		'get': function get(){},
		'post': function post(){},
		'put': function put(){}
	};

	// TESTS //

	it( 'should export a function', function test() {
		expect( middleware ).to.be.a( 'function' );
	});

	it( 'should invoke a provided callback', function test( done ) {
		middleware.call( app, next );

		function next() {
			assert.ok( true );
			done();
		}
	});

	it( 'should bind a defined set of routes to the application' );

});
