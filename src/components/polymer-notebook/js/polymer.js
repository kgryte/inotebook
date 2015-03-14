/**
*
*	COMPONENT: polymer-notebook
*
*
*	DESCRIPTION:
*		- Registers the polymer-notebook web-component.
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

var Notebook = require( './notebook.js' );


// POLYMER //

Polymer( 'polymer-notebook', Notebook.prototype );
