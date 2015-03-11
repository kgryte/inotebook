/* global require, describe, it, beforeEach */
'use strict';

var mpath = './../../../../app/middleware/error';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	mw = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/error', function tests() {

	// SETUP //

	var request, response, next;

	request = {
		'logger': {
			info: function() {}
		}
	};
	response = {
		status: function( status ) {
			response._status = status;
			return this;
		},
		json: function( body ) {
			response.body = body;
			return this;
		}
	};
	next = function(){};

	beforeEach( function() {
		response._status = null;
		response.body = null;
	});

	// TESTS //

	it( 'should export a function', function test() {
		expect( mw ).to.be.a( 'function' );
	});

	it( 'should not return a 200 status', function test() {
		mw( new Error(), request, response, next );
		assert.notEqual( response._status, 200 );
	});

	it( 'should set the response body', function test() {
		mw( new Error( 'beep' ), request, response, next );
		expect( response.body ).to.be.an( 'object' );
	});

	it( 'should invoke a callback after sending an error response', function test( done ) {
		next = function next() {
			assert.ok( true );
			done();
		};
		mw( {'status': 502, 'message': 'beep' }, request, response, next );
	});

});
