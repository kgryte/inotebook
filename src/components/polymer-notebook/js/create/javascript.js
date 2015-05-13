'use strict';

/**
* FUNCTION: createJavaScript()
*	Creates an empty JavaScript note.
*
* @returns {Object} context
*/
function createJavaScript() {
	/* jslint validthis:true */
	this.notes.push({
		'uid': this._uuid.v4(),
		'mode': 'javascript',
		'name': 'Note',
		'body': ''
	});

	// TODO: emit an event announcing that we have created a new note

	return this;
} // end METHOD createJavaScript()


// EXPORTS //

module.exports = createJavaScript;
