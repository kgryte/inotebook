/**
*
*	COMPONENT: polymer-github-markdown
*
*
*	DESCRIPTION:
*		- Registers the polymer-github-markdown web-component.
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

var Markdown = require( './github-markdown.js' );


// POLYMER //

Polymer( 'polymer-github-markdown', Markdown.prototype );
