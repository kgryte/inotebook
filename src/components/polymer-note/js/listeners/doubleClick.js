/**
*
*	FUNCTION: onDoubleClick
*
*
*	DESCRIPTION:
*		- Event listener for double clicks.
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

/* global document */
'use strict';

// FUNCTIONS //

/**
* FUNCTION: clearSelection()
*	Clears any text selection as a result of a double-click.
*
* @private
*/
function clearSelection() {
	if ( document.selection && document.selection.empty ) {
        document.selection.empty();
    } else if ( window.getSelection ) {
        window.getSelection().removeAllRanges();
    }
} // end FUNCTION clearSelection()


// ON DOUBLE CLICK //

/**
* FUNCTION: onDoubleClick( evt, detail, sender )
*	Event listener for double clicks.
*
* @param {Event} evt - standard event object
* @param details - e.detail
* @param {DOMElement} sender - reference to the node that declared the event handler
*/
function onDoubleClick( evt ) {
	/* jslint validthis:true */
	evt.preventDefault();
	clearSelection();
	if ( this.mode === 'markdown' ) {
		this.hideEditor = !this.hideEditor;
	}
	this.fire( 'doubledclicked.note', evt );
	this.fire( 'doubleclicked', evt );
	return false;
} // end FUNCTION onDoubleClick()


// EXPORTS //

module.exports = onDoubleClick;
