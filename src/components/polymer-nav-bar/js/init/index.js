/**
*
*	FUNCTION: init
*
*
*	DESCRIPTION:
*		- Performs element initialization.
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

/* global document */
'use strict';

/**
* FUNCTION: init()
*	Initialization.
*
* @returns {Object} context
*/
function init() {
	/* jslint validthis:true */
	var el;

	// Create a new topical element to access the application publish-subscribe service:
	el = document.createElement( 'polymer-topical' );
	this._topical = el.topical;

	// Add topics:
	this._topical
		.add( 'create.note.javascript' )
		.add( 'create.note.markdown' )
		.add( 'create.notebook' );

	return this;
} // end FUNCTION init()


// EXPORTS //

module.exports = init;
