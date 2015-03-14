/**
*
*	COMPONENT: polymer-print
*
*
*	DESCRIPTION:
*		- Registers the polymer-print web-component.
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

/* global Polymer */
'use strict';

// MODULES //

var Print = require( './print.js' );


// POLYMER //

Polymer( 'polymer-print', Print.prototype );
