/**
*
*	SCRIPT: compute-io
*
*
*	DESCRIPTION:
*		- Binds all compute methods to the global `window` object; e.g., `compute.mean()` => `mean()`.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

/* global window */
'use strict';

// MODULES //

var compute = require( 'compute.io' );


// SCRIPT //

var keys,
	i;

keys = Object.keys( compute );

for ( i = 0; i < keys.length; i++ ) {
	window[ keys[i] ] = compute[ keys[i] ];
}
