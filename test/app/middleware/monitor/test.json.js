/* global require, describe, it, beforeEach */
'use strict';

var mpath = './../../../../app/middleware/monitor/json.js';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	json = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/monitor/json', function tests() {

	// SETUP //

	var request, response, next;

	request = {
		'locals': {
			'monitor': {
				'beep': 'boop'
			}
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
		expect( json ).to.be.a( 'function' );
	});

	it( 'should return a 200 status', function test() {
		json( request, response, next );
		assert.strictEqual( response._status, 200 );
	});

	it( 'should set the response body', function test() {
		expect( run ).to.not.throw( Error );
		function run() {
			json( request, response, next );
			assert.deepEqual( response.body, request.locals.monitor );
		}
	});

	it( 'should invoke a callback after sending the JSON', function test( done ) {
		var next = function next() {
			assert.ok( true );
			done();
		};
		json( request, response, next );
	});

});
