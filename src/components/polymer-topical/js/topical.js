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
