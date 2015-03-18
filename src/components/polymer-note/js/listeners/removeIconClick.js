/**
*
*	FUNCTION: onRemoveIconClick
*
*
*	DESCRIPTION:
*		- Event listener invoked when a user clicks a remove icon.
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
* FUNCTION: onRemoveIconClick( evt, detail, sender )
*	Event listener invoked when a user clicks a remove icon.
*
* @param {Event} evt - standard event object
* @param details - e.detail
* @param {DOMElement} sender - reference to the node that declared the event handler
*/
function onRemoveIconClick( evt ) {
	/* jslint validthis:true */
	evt.preventDefault();
	this.fire( 'clicked.removeicon', evt );
	return false;
} // end FUNCTION onDoubleClick()


// EXPORTS //

module.exports = onRemoveIconClick;
