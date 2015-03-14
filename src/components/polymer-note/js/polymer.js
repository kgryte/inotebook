/**
*
*	COMPONENT: polymer-note
*
*
*	DESCRIPTION:
*		- Registers the polymer-note web-component.
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

var Note = require( './note.js' );


// POLYMER //

Polymer( 'polymer-note', Note.prototype );
