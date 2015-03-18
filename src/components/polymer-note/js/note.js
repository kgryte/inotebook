/**
*
*	NOTE
*
*
*	DESCRIPTION:
*		- Defines the note prototype.
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

// NOTE //

/**
* FUNCTION: Note()
*	Note constructor.
*
* @constructor
* @returns {Note} Note instance
*/
function Note() {
	if ( !( this instanceof Note ) ) {
		return new Note();
	}
	return this;
} // end FUNCTION Note()


// ATTRIBUTES //

/**
* ATTRIBUTE: mode
*	Note mode.
*
* @type {String}
* @default ''
*/
Note.prototype.mode = '';

/**
* ATTRIBUTE: name
*	Note name.
*
* @type {String}
* @default 'Note'
*/
Note.prototype.name = 'Note';

/**
* ATTRIBUTE: body
*	Note body.
*
* @type {String}
* @default ''
*/
Note.prototype.body = '';

/**
* ATTRIBUTE: hideEditor
*	Toggles editor visibility.
*
* @type {Boolean}
* @default false
*/
Note.prototype.hideEditor = false;


// LIFECYCLE //

Note.prototype.created = require( './lifecycle/created.js' );

Note.prototype.attached = require( './lifecycle/attached.js' );


// WATCHERS //

Note.prototype.modeChanged = require( './watchers/mode.js' );

Note.prototype.nameChanged = require( './watchers/name.js' );

Note.prototype.bodyChanged = require( './watchers/body.js' );

Note.prototype.hideEditorChanged = require( './watchers/hideEditor.js' );


// LISTENERS //

Note.prototype.onDoubleClick = require( './listeners/doubleClick.js' );

Note.prototype.onRemoveIconClick = require( './listeners/removeIconClick.js' );


// EXPORTS //

module.exports = Note;
