/**
*
*	FUNCTION: themeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a navigation bar theme.
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
* FUNCTION: themeChanged( oldVal, newVal )
*	Event handler for changes to a navigation bar's theme.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function themeChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( typeof newVal !== 'string' ) {
		err = new TypeError( 'theme::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.theme = oldVal;
		return;
	}
	this.fire( 'change', {
		'attr': 'theme',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION themeChanged()


// EXPORTS //

module.exports = themeChanged;
