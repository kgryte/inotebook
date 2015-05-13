'use strict';

// MODULES //

var isBoolean = require( 'validate.io-boolean-primitive' );


// HIDE EDITOR CHANGED //

/**
* FUNCTION: hideEditorChanged( oldVal, newVal )
*	Event handler for changes to a `hideEditor` attribute.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function hideEditorChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( !isBoolean( newVal ) ) {
		err = new TypeError( 'hideEditor::invalid assignment. Must be a boolean primitive. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.hideEditor = oldVal;
		return;
	}
	this.fire( 'change', {
		'attr': 'hideEditor',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION hideEditorChanged()


// EXPORTS //

module.exports = hideEditorChanged;
