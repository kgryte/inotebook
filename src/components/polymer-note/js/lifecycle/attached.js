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

