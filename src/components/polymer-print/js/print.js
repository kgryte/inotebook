/**
*
*	PRINT
*
*
*	DESCRIPTION:
*		- Defines the print element prototype.
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

'use strict';

// PRINT //

/**
* FUNCTION: Print()
*	Print constructor.
*
* @constructor
* @returns {Print} Print instance
*/
function Print() {
	if ( !( this instanceof Print ) ) {
		return new Print();
	}
	return this;
} // end FUNCTION Print()


// ATTRIBUTES //

/**
* ATTRIBUTE: body
*	Element body.
*
* @type {String}
* @default ''
*/
Print.prototype.body = '';


// WATCHERS //

Print.prototype.bodyChanged = require( './watchers/body.js' );


// EXPORTS //

module.exports = Print;
