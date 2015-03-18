/**
*
*	FUNCTION: onCreateNew
*
*
*	DESCRIPTION:
*		- Event listener for creating new notes.
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
* FUNCTION: onCreateNew( evt, detail, sender )
*	Event listener for creating new notes.
*
* @param {Event} evt - standard event object
* @param details - e.detail
* @param {DOMElement} sender - reference to the node that declared the event handler
*/
function onCreateNew( evt ) {
	/* jslint validthis:true */
	evt.preventDefault();

	// TODO: expand purview to creating notebooks

	this._topical.publish( 'createnew.note', null );

	// TODO: reconcile publish and emitting. Possibly, the base nav-bar class should fire and the descendant class should listen for this evt and publish on topical.

	// this.fire( 'createnew.note', evt );
	// this.fire( 'createnew', evt );
	return false;
} // end FUNCTION onCreateNew()


// EXPORTS //

module.exports = onCreateNew;
