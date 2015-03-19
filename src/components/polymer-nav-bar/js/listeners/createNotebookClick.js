/**
*
*	FUNCTION: onCreateNotebookClick
*
*
*	DESCRIPTION:
*		- Event listener invoked when a user clicks to create a new notebook.
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
* FUNCTION: onCreateNotebookClick( evt, detail, sender )
*	Event listener invoked when a user clicks to create a new notebook.
*
* @param {Event} evt - standard event object
* @param details - e.detail
* @param {DOMElement} sender - reference to the node that declared the event handler
*/
function onCreateNotebookClick( evt ) {
	/* jslint validthis:true */
	evt.preventDefault();

	this.$.createIcon.classList.toggle( 'active' );

	this.fire( 'clicked.create.notebook', evt );

	// TODO: move to descendant.
	this._topical.publish( 'create.notebook', null );

	// TODO: reconcile publish and emitting. Possibly, the base nav-bar class should fire and the descendant class should listen for this evt and publish on topical. => yes.
	return false;
} // end FUNCTION onCreateNotebookClick()


// EXPORTS //

module.exports = onCreateNotebookClick;
