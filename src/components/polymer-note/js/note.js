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
* ATTRIBUTE: body
*	Note body.
*
* @type {String}
* @default ''
*/
Note.prototype.body = '';


// LIFECYCLE //

Note.prototype.attached = require( './lifecycle/attached.js' );


// WATCHERS //

Note.prototype.modeChanged = require( './watchers/mode.js' );

Note.prototype.bodyChanged = require( './watchers/body.js' );


// EXPORTS //

module.exports = Note;
