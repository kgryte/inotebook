/* global require, describe, it, beforeEach */
'use strict';

var mpath = './../../../../app/middleware/logs/logs.js';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Stub required modules:
	proxyquire = require( 'proxyquire' ),

	// Module to be tested:
	logs = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/logs/logs', function tests() {

	// SETUP //

	var request, response, next;

	request = {
		'body': [
			{
				'log': 'beep'
			}
		],
		get: function( header ) {
			if ( header === 'X-Request-Client' ) {
				return 'beep';
			}
		}
	};
	response = {};
	next = function(){};

	// TESTS //

	it( 'should export a function', function test() {
		expect( logs ).to.be.a( 'function' );
	});

	it( 'should dump client-side logs', function test( done ) {
		var logs = proxyquire( mpath, {
			'logger': {
				info: function( blob ) {
					assert.strictEqual( blob.cid, 'beep' );
					assert.deepEqual( blob.logs, request.body );
					done();
				}
			}
		});
		logs( request, response, next );
	});

	it( 'should invoke a callback after dumping client-side logs', function test( done ) {
		next = function next() {
			assert.ok( true );
			done();
		};
		logs( request, response, next );
	});

});
