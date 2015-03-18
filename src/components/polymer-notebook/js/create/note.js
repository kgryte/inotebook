/**
*
*	FUNCTION: createNote
*
*
*	DESCRIPTION:
*		- Creates an empty note.
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
* FUNCTION: createNote()
*	Creates an empty note.
*
* @returns {Object} context
*/
function createNote() {
	/* jslint validthis:true */
	this.notes.push({
		'uid': this._uuid.v4(),
		'mode': 'javascript',
		'name': 'Note',
		'body': ''
	});
	return this;
} // end METHOD createNote()


// EXPORTS //

module.exports = createNote;
