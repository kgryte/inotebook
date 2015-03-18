/**
*
*	FUNCTION: modeChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to the editor mode.
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

// MODULES //

var isString = require( 'validate.io-string' );


// VARIABLES //

var MODES = [
	'javascript',
	'text'
];


// FUNCTIONS //

/**
* FUNCTION: contains( arr, val )
*	Validates if an array contains a specified value.
*
* @private
* @param {Array} arr - input array
* @param {*} val - search value
* @returns {Boolean} boolean indicating if the array contains the specified value
*/
function contains( arr, val ) {
	var len = arr.length,
		i;

	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] === val ) {
			return true;
		}
	}
	return false;
} // end METHOD contains()


// MODE CHANGED //

/**
* FUNCTION: modeChanged( oldVal, newVal )
*	Event handler for changes to editor mode.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function modeChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var err,
		val;
	if ( !isString( newVal ) ) {
		err = new TypeError( 'mode::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.mode = oldVal;
		return;
	}
	// TODO: support aliases??
	// TODO: Should we sanitize, e.g., convert to lowercase?
	val = newVal.toLowerCase();
	if ( !contains( MODES, val ) ) {
		err = new Error( 'mode()::invalid assignment. Unsupported mode. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.mode = oldVal;
		return;
	}
	this._editor.getSession().setMode( 'ace/mode/' + val );

	this.fire( 'change', {
		'attr': 'mode',
		'prev': oldVal,
		'curr': val
	});
} // end FUNCTION modeChanged()


// EXPORTS //

module.exports = modeChanged;
