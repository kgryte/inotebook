/* global require, describe, it */
'use strict';

var mpath = './../../app';

// MODULES //

var // Expectation library:
	chai = require( 'chai' ),

	// Stub required modules:
	proxyquire = require( 'proxyquire' ),

	// Module to be tested:
	createApp = require( mpath );


// VARIABLES //

var expect = chai.expect,
	assert = chai.assert;


// TESTS //

describe( 'app', function tests() {

	it( 'should export a function to create an application', function test() {
		expect( createApp ).to.be.a( 'function' );
	});

	it( 'should throw an error if the function has an arity of 1 and is provided an options argument which is neither an object or a function', function test() {
		var values = [
			'5',
			5,
			NaN,
			null,
			undefined,
			true,
			[]
		];

		for ( var i = 0; i < values.length; i++ ) {
			expect( badValue( values[ i ] ) ).to.throw( TypeError );
		}

		function badValue( value ) {
			return function() {
				createApp( value );
			};
		}
	});

	it( 'should throw an error if the function has an arity of 2 and is provided an options argument which is not an object', function test() {
		var values = [
			'5',
			5,
			NaN,
			null,
			undefined,
			true,
			[],
			function(){}
		];

		for ( var i = 0; i < values.length; i++ ) {
			expect( badValue( values[ i ] ) ).to.throw( TypeError );
		}

		function badValue( value ) {
			return function() {
				createApp( value, function(){} );
			};
		}
	});

	it( 'should throw an error if provided a callback which is not a function', function test() {
		var values = [
			'5',
			5,
			NaN,
			null,
			undefined,
			true,
			[],
			{}
		];

		for ( var i = 0; i < values.length; i++ ) {
			expect( badValue( values[ i ] ) ).to.throw( TypeError );
		}

		function badValue( value ) {
			return function() {
				createApp( {}, value );
			};
		}
	});

	it( 'should return an application', function test( done ) {
		var app = createApp();
		expect( app ).to.be.a( 'function' );
		setTimeout( onTimeout, 200 );
		function onTimeout() {
			app.server.close();
			assert.ok( true );
			done();
		}
	});

	it( 'should return an application when provided run-time options', function test( done ) {
		var app = createApp( {} );
		expect( app ).to.be.a( 'function' );
		setTimeout( onTimeout, 200 );
		function onTimeout() {
			app.server.close();
			assert.ok( true );
			done();
		}
	});

	it( 'should invoke a callback upon successful application creation', function test( done ) {
		var app = createApp( onApp );
		function onApp() {
			app.server.close();
			assert.ok( true );
			done();
		}
	});

	it( 'should invoke a callback upon successful application creation when provided run-time options', function test( done ) {
		var app = createApp( {}, onApp );
		function onApp() {
			app.server.close();
			assert.ok( true );
			done();
		}
	});

	it( 'should append routes during application creation', function test( done ) {
		var app = createApp( onApp );
		function onApp() {
			app.server.close();
			assert.ok( Object.keys( app._router.stack ).length );
			done();
		}
	});

	it( 'should exit the process if errors are encountered during the boot process', function test( done ) {
		var fcn, createApp;

		fcn = process.exit;
		process.exit = function onExit() {
			assert.ok( true, 'process failed to exit' );
			process.exit = fcn;
			done();
		};

		createApp = proxyquire( './../../app', {
			bootable: function() {
				return {
					phase: function() {},
					boot: function( clbk ) {
						clbk( new Error( 'error' ) );
					}
				};
			}
		});
		createApp();
	});

});
