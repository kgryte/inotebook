/**
*
*	FUNCTION: attached
*
*
*	DESCRIPTION:
*		- Event listener for when an element is inserted into the DOM.
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
* FUNCTION: attached()
*	Event listener for when an element is inserted into the DOM.
*/
function attached() {
	/* jslint validthis:true */
	if ( this.mode === 'markdown' ) {
		this.$.editor.mode = 'text';
	} else {
		this.$.editor.mode = this.mode;
	}
} // end FUNCTION attached()


// EXPORTS //

module.exports = attached;

