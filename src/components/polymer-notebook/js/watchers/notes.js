/**
*
*	FUNCTION: notesChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a notes array.
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

var isArray = require( 'validate.io-array' );


// NOTES CHANGED //

/**
* FUNCTION: notesChanged( val[, newVal] )
*	Event handler for changes to a notes array.
*
* @param {Array} val - change event value
* @param {Array} [newVal] - new array of notes
*/
function notesChanged( val, newVal ) {
	/* jslint validthis:true */
	var err;
	if ( arguments.length > 1 && !isArray( newVal ) ) {
		err = new TypeError( 'notes::invalid assignment. Notes must be an array. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.notes = val;
		return;
	}

	// TODO: do something with the notes...
	// TODO: if a note is changed/inserted, validate that a note conforms to note spec

	if ( !this.notes.length ) {
		// Create a new empty note...
		this.notes.push({
			'uid': Math.random(),
			'name': 'Note',
			'mode': 'markdown',
			'body': ''
		});
	}
	this.fire( 'notes', {
		'type': 'change'
	});
	if ( newVal === void 0 ) {
		this.fire( 'change', {
			'attr': 'notes',
			'data': val[ 0 ]
		});
	} else {
		this.fire( 'change', {
			'attr': 'notes',
			'prev': val,
			'curr': newVal
		});
	}
} // end FUNCTION notesChanged()


// EXPORTS //

module.exports = notesChanged;
