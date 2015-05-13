'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' );


// BODY CHANGED //

/**
* FUNCTION: bodyChanged( oldVal, newVal )
*	Event handler for changes to a body attribute.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function bodyChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( !isString( newVal ) ) {
		err = new TypeError( 'body::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.body = oldVal;
		return;
	}
	this.fire( 'change', {
		'attr': 'body',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION bodyChanged()


// EXPORTS //

module.exports = bodyChanged;
