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
