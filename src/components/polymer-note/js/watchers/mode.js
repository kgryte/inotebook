/**
*
*	FUNCTION: modeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a note mode.
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


// MODE CHANGED //

/**
* FUNCTION: modeChanged( oldVal, newVal )
*	Event handler for changes to a note mode.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function modeChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( !isString( newVal ) ) {
		err = new TypeError( 'mode::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.mode = oldVal;
		return;
	}
	// Update the editor...
	if ( newVal === 'markdown' ) {
		this.$.editor.mode = 'text';
	} else {
		this.$.editor.mode = newVal;
	}
	// TODO: change the renderer!!!

	this.fire( 'change', {
		'attr': 'mode',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION modeChanged()


// EXPORTS //

module.exports = modeChanged;
