/* global require, describe, it */
'use strict';

var mpath = './../../../../app/middleware/monitor/monitor.js';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Module to be tested:
	monitor = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app/middleware/monitor/monitor', function tests() {

	// SETUP //

	var request = {},
		response = {};

	// TESTS //

	it( 'should export a function', function test() {
		expect( monitor ).to.be.a( 'function' );
	});

	it( 'should append metrics to a `locals` property on the HTTP request object', function test( done ) {
		var next = function next() {
			expect( request ).to.have.property( 'locals' );
			expect( request.locals ).to.have.property( 'monitor' );
			expect( request.locals.monitor ).to.be.an( 'object' );
			done();
		};
		monitor( request, response, next );
	});

	it( 'should invoke a callback after gathering monitor metrics', function test( done ) {
		var next = function next() {
			assert.ok( true );
			done();
		};
		monitor( request, response, next );
	});

});
