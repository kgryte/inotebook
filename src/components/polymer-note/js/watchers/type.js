/**
*
*	FUNCTION: typeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a note type.
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

/**
* FUNCTION: typeChanged( oldVal, newVal )
*	Event handler for changes to a note type.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function typeChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( typeof newVal !== 'string' ) {
		err = new TypeError( 'type::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.type = oldVal;
		return;
	}

	// TODO: change the renderer!!!

	this.fire( 'change', {
		'attr': 'type',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION typeChanged()


// EXPORTS //

module.exports = typeChanged;
