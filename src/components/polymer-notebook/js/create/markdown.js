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
