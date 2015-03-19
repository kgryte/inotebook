/**
*
*	FUNCTION: createMarkdown
*
*
*	DESCRIPTION:
*		- Creates an empty Markdown note.
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
* FUNCTION: createMarkdown()
*	Creates an empty Markdown note.
*
* @returns {Object} context
*/
function createMarkdown() {
	/* jslint validthis:true */
	this.notes.push({
		'uid': this._uuid.v4(),
		'mode': 'markdown',
		'name': 'Note',
		'body': ''
	});

	// TODO: emit an event announcing that we have created a new note

	return this;
} // end METHOD createMarkdown()


// EXPORTS //

module.exports = createMarkdown;
