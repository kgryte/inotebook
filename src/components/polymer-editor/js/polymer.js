/**
*
*	COMPONENT: polymer-editor
*
*
*	DESCRIPTION:
*		- Registers the polymer-editor web-component.
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

var Editor = require( './editor.js' );


// POLYMER //

Polymer( 'polymer-editor', Editor.prototype );
