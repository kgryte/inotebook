/**
*
*	FIGURE
*
*
*	DESCRIPTION:
*		- Defines the figure element prototype.
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

// FIGURE //

/**
* FUNCTION: Figure()
*	Figure constructor.
*
* @constructor
* @returns {Figure} Figure instance
*/
function Figure() {
	if ( !( this instanceof Figure ) ) {
		return new Figure();
	}
	return this;
} // end FUNCTION Figure()


// ATTRIBUTES //

/**
* ATTRIBUTE: data
*	Element data.
*
* @type {Array|null}
* @default null
*/
Figure.prototype.data = null;


// WATCHERS //

Figure.prototype.dataChanged = require( './watchers/data.js' );


// EXPORTS //

module.exports = Figure;
