/**
*
*	TOPICAL
*
*
*	DESCRIPTION:
*		- Defines the topical element prototype.
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

// MODULES //

var topical = require( 'topical' );


// TOPICAL //

/**
* FUNCTION: Topical()
*	Topical constructor.
*
* @constructor
* @returns {Topical} Topical instance
*/
function Topical() {
	if ( !( this instanceof Topical ) ) {
		return new Topical();
	}
	return this;
} // end FUNCTION Topical()


Topical.prototype.topical = topical;


// EXPORTS //

module.exports = Topical;
