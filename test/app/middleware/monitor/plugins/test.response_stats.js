/* global require, describe, it, beforeEach */
'use strict';

var mpath = './../../../../../app/middleware/monitor/plugins/response_stats.js';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Pubsub library:
	topical = require( 'topical' ),

	// Stub required modules:
	proxyquire = require( 'proxyquire' ).noCallThru(),

	// Module to be tested:
	plugin = require( mpath ),

	// Mock data object:
	stats = require( './mock.json' );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/monitor/plugins/response_stats', function tests() {

	// SETUP //

	var monitor, next;

	beforeEach( function() {
		monitor = {};
		next = function(){};
	});

	// TESTS //

	it( 'should export a function', function test() {
		expect( plugin ).to.be.a( 'function' );
	});

	it( 'should have an arity of 2', function test() {
		assert.strictEqual( plugin.length, 2 );
	});

	it( 'should invoke a callback after appending response metrics', function test( done ) {
		next = function() {
			assert.ok( true );
			done();
		};
		plugin( monitor, next );
	});

	it( 'should append to the monitor object', function test( done ) {
		next = function() {
			assert.property( monitor, 'response' );
			expect( monitor.response ).to.be.an( 'object' );
			done();
		};
		plugin( monitor, next );
	});

	it( 'should return accurate statistics', function test( done ) {
		var expected, data, plugin, stubs;

		stubs = {
			'topical': topical,
			'./response_stats.json': stats
		};

		plugin = proxyquire( mpath, stubs );

		data = [
			{
				'time': 2,
				'bytes': 2
			},
			{
				'time': NaN,
				'bytes': 1
			},
			{
				'time': 1,
				'bytes': 3
			},
			{
				'time': 3,
				'bytes': 2
			}
		];

		expected = {
			'count': 4,
			'time': {
				'count': 3,
				'sum': 6,
				'mean': 2,
				'min': 1,
				'max': 3,
				'variance': 1
			},
			'bytes': {
				'sum': 8,
				'mean': 2,
				'min': 1,
				'max': 3,
				'variance': 2/3
			}
		};

		next = function() {
			var d = monitor.response;
			assert.deepEqual( d, expected );
			done();
		};

		for ( var i = 0; i < data.length; i++ ) {
			topical.publish( 'response', data[ i ] );
		}
		plugin( monitor, next );
	});

});
