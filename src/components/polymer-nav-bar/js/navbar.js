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


// LIFECYCLE //

NavBar.prototype.created = require( './lifecycle/created.js' );


// INIT //

NavBar.prototype.init = require( './init' );


// LISTENERS //

NavBar.prototype.onCreateIconClick = require( './listeners/createIconClick.js' );

NavBar.prototype.onCreateMarkdownClick = require( './listeners/createMarkdownClick.js' );

NavBar.prototype.onCreateJavaScriptClick = require( './listeners/createJavaScriptClick.js' );

NavBar.prototype.onCreateNotebookClick = require( './listeners/createNotebookClick.js' );


// EXPORTS //

module.exports = NavBar;
