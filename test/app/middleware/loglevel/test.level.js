/* global require, describe, it */
'use strict';

var mpath = './../../../../app/middleware/loglevel/level.js';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Stub required modules:
	proxyquire = require( 'proxyquire' ),

	// Module to be tested:
	level = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/loglevel/level', function tests() {

	// SETUP //

	var request, response, next;

	request = {
		'body': [
			{
				'level': 'info'
			}
		]
	};
	response = {};
	next = function(){};

	// TESTS //

	it( 'should export a function', function test() {
		expect( level ).to.be.a( 'function' );
	});

	it( 'should set the log level', function test( done ) {
		var level = proxyquire( mpath, {
			'logger': {
				info: function() {},
				levels: function( stream, level ) {
					assert.strictEqual( level, request.body.level );
					done();
				}
			}
		});
		level( request, response, next );
	});

	it( 'should invoke a callback after setting the log level', function test( done ) {
		next = function next() {
			assert.ok( true );
			done();
		};
		level( request, response, next );
	});

});
