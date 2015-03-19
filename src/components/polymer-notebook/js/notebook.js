/**
*
*	NOTEBOOK
*
*
*	DESCRIPTION:
*		- Defines the notebook prototype.
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

// NOTEBOOK //

/**
* FUNCTION: Notebook()
*	Notebook constructor.
*
* @constructor
* @returns {Notebook} Notebook instance
*/
function Notebook() {
	if ( !( this instanceof Notebook ) ) {
		return new Notebook();
	}
	return this;
} // end FUNCTION Notebook()


// LIFECYCLE //

Notebook.prototype.created = require( './lifecycle/created.js' );


// INIT //

Notebook.prototype.init = require( './init' );


// CREATE //

Notebook.prototype.createMarkdown = require( './create/markdown.js' );

Notebook.prototype.createJavaScript = require( './create/javascript.js' );

Notebook.prototype.createNotebook = require( './create/notebook.js' );


// WATCHERS //

Notebook.prototype.notesChanged = require( './watchers/notes.js' );


// LISTENERS //

Notebook.prototype.onRemoveNote = require( './listeners/removeNote.js' );


// EXPORTS //

module.exports = Notebook;
