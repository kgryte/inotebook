/* global require, describe, it, before, after */
'use strict';

var mpath = './../../../../app/middleware/finish';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Application logger:
	logger = require( './../../../../app/node_modules/logger' ),

	// Pub/sub library:
	topical = require( 'topical' ),

	// Module to be tested:
	finish = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/finish', function tests() {

	// SETUP //

	var request, response, next;

	request = {
		'logger': logger.child({ 'rid':1234 })
	};
	response = {
		get: function( field ) {
			var value;
			switch ( field ) {
			case 'X-Response-Time':
				value = '15.2343ms';
				break;
			case 'Content-Length':
				value = '1105';
				break;
			default:
				throw new Error( 'get()::unrecognized header field.' );
			}
			return value;
		}
	};
	next = function(){};

	before( function() {
		topical.add( 'response' );
	});

	after( function() {
		topical.remove( 'response' );
	});


	// TESTS //

	it( 'should export a function', function test() {
		expect( finish ).to.be.a( 'function' );
	});

	it( 'should publish response metrics', function test( done ) {
		topical.once( 'response', function onResponse( metric ) {
			assert.property( metric, 'time' );
			expect( metric.time ).to.be.a( 'number' );
			assert.property( metric, 'bytes' );
			expect( metric.bytes ).to.be.a( 'number' );
			assert.ok( true );
			done();
		});
		finish( request, response, next );
	});

	it( 'should invoke a callback when complete', function test( done ) {
		next = function() {
			assert.ok( true );
			done();
		};
		finish( request, response, next );
	});

});
