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
	this.fire( 'removenote', evt );
	return false;
} // end FUNCTION onRemoveIconClick()


// EXPORTS //

module.exports = onRemoveIconClick;
