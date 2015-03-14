/**
*
*	FUNCTION: modeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to the editor mode.
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
* FUNCTION: modeChanged( oldVal, newVal )
*	Event handler for changes to editor mode.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function modeChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( typeof newVal !== 'string' ) {
		err = new TypeError( 'mode::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.mode = oldVal;
		return;
	}
	// TODO: validate allowed mode

	this._editor.getSession().setMode( 'ace/mode/' + newVal );

	this.fire( 'change', {
		'attr': 'mode',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION modeChanged()


// EXPORTS //

module.exports = modeChanged;
