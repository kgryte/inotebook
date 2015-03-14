/**
*
*	NAVBAR
*
*
*	DESCRIPTION:
*		- Defines the navigation bar prototype.
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

// NAVBAR //

/**
* FUNCTION: NavBar()
*	NavBar constructor.
*
* @constructor
* @returns {NavBar} NavBar instance
*/
function NavBar() {
	if ( !( this instanceof NavBar ) ) {
		return new NavBar();
	}
	return this;
} // end FUNCTION NavBar()


// ATTRIBUTES //

/**
* ATTRIBUTE: theme
*	Navigation style theme.
*
* @type {String}
* @default 'indigo'
*/
NavBar.prototype.theme = 'indigo';


// WATCHERS //

NavBar.prototype.themeChanged = require( './watchers/theme.js' );


// EXPORTS //

module.exports = NavBar;
