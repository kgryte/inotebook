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
* ATTRIBUTE: type
*	Note type.
*
* @type {String}
* @default 'javascript'
*/
Note.prototype.type = 'javascript';

/**
* ATTRIBUTE: body
*	Note body.
*
* @type {String}
* @default ''
*/
Note.prototype.body = '';


// WATCHERS //

Note.prototype.typeChanged = require( './watchers/type.js' );

Note.prototype.bodyChanged = require( './watchers/body.js' );


// EXPORTS //

module.exports = Note;
