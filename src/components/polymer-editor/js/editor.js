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

/**
* ATTRIBUTE: mode
*	Editor mode.
*
* @type {String}
* @default 'text'
*/
Editor.prototype.mode = 'text';


// LIFECYCLE //

Editor.prototype.registerCallback = require( './lifecycle/register.js' );

Editor.prototype.attached = require( './lifecycle/attached.js' );


// WATCHERS //

Editor.prototype.bodyChanged = require( './watchers/body.js' );

Editor.prototype.modeChanged = require( './watchers/mode.js' );


// EXPORTS //

module.exports = Editor;
