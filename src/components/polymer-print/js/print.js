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
