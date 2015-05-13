'use strict';

// MODULES //

var topical = require( 'topical' ),
	stats = require( './response_stats.json' );


// FUNCTIONS //

/**
* FUNCTION: timeStats( t )
*	Updates response time stats.
*
* @private
* @param {Number} t - response time
*/
function timeStats( t ) {
	var d = stats.time;
	if ( t !== t ) {
		// Time is NaN...
		return;
	}
	// Update the number of responses with response times:
	d.count += 1;

	// Update the response time stats:
	updateStats( d, t, d.count );
} // end FUNCTION timeStats()

/**
* FUNCTION: bytesStats( b )
*	Updates response byte stats.
*
* @private
* @param {Number} b - response content length
*/
function byteStats( b ) {
	updateStats( stats.bytes, b, stats.count );
} // end FUNCTION bytesStats()

/**
* FUNCTION: updateStats( acc, x, N )
*	Calculates summary statistics.
*
* @private
* @param {Object} acc - accumulation object
* @param {Number} x - incremental update
* @param {Number} N - number of values
*/
function updateStats( acc, x, N ) {
	var delta, M2;

	// Calculate the previous sum of squared differences:
	M2 = acc.variance * ( N-2 );

	// Update the sum:
	acc.sum += x;

	// Min and max values...
	if ( N === 1 ) {
		acc.min = x;
		acc.max = x;
	} else {
		if ( x < acc.min ) {
			acc.min = x;
		} else if ( x > acc.max ) {
			acc.max = x;
		}
	}
	// Mean value:
	delta = x - acc.mean;
	acc.mean += delta / N;

	// Variance:
	if ( N < 2 ) {
		acc.variance = 0;
		return;
	}
	M2 += delta * ( x-acc.mean );
	acc.variance = M2 / ( N-1 );
} // end FUNCTION updateStats()


// LISTENERS //

/**
* FUNCTION: onResponse( data )
*	Event handler for response events.
*
* @private
* @param {Object} data - data object containing response statistics
*/
function onResponse( data ) {
	stats.count += 1;
	timeStats( data.time );
	byteStats( data.bytes );
} // end FUNCTION onResponse()


// SETUP //

topical
	.add( 'response' )
	.subscribe( 'response', onResponse );


// PLUGIN //

/**
* FUNCTION: plugin( monitor, next )
*	Middleware plugin which returns response statistics.
*
* @param {Object} monitor - object to which metrics are appended
* @param {Function} next - callback to be invoked upon appending metrics
*/
function plugin( monitor, next ) {
	monitor.response = stats;
	next();
} // end FUNCTION plugin()


// EXPORTS //

module.exports = plugin;
