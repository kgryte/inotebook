/**
*
*	FUNCTION: nmaeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a note name.
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

var isString = require( 'validate.io-string' );


// NAME CHANGED //

/**
* FUNCTION: nameChanged( oldVal, newVal )
*	Event handler for changes to a note name.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function nameChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( !isString( newVal ) ) {
		err = new TypeError( 'name::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.name = oldVal;
		return;
	}
	this.fire( 'change', {
		'attr': 'name',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION nameChanged()


// EXPORTS //

module.exports = nameChanged;
