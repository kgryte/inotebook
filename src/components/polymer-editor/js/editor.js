/**
*
*	EDITOR
*
*
*	DESCRIPTION:
*		- Defines the editor prototype.
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

// EDITOR //

/**
* FUNCTION: Editor()
*	Editor constructor.
*
* @constructor
* @returns {Editor} Editor instance
*/
function Editor() {
	if ( !( this instanceof Editor ) ) {
		return new Editor();
	}
	return this;
} // end FUNCTION Editor()


// ATTRIBUTES //

/**
* ATTRIBUTE: body
*	Editor body.
*
* @type {String}
* @default ''
*/
Editor.prototype.body = '';


// LIFECYCLE //

Editor.prototype.registerCallback = require( './lifecycle/register.js' );

Editor.prototype.attached = require( './lifecycle/attached.js' );


// WATCHERS //

Editor.prototype.bodyChanged = require( './watchers/body.js' );


// EXPORTS //

module.exports = Editor;
