'use strict';

/**
* FUNCTION: onCreateIconClick( evt, detail, sender )
*	Event listener invoked when a user clicks on a `create` icon.
*
* @param {Event} evt - standard event object
* @param details - e.detail
* @param {DOMElement} sender - reference to the node that declared the event handler
*/
function onCreateIconClick( evt ) {
	/* jslint validthis:true */
	evt.preventDefault();
	this.$.createIcon.classList.toggle( 'active' );
	this.fire( 'clicked.createicon', evt );
	return false;
} // end FUNCTION onCreateIconClick()


// EXPORTS //

module.exports = onCreateIconClick;
