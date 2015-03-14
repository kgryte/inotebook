/**
*
*	GITHUB MARKDOWN
*
*
*	DESCRIPTION:
*		- Defines the github-markdown element prototype.
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

// MARKDOWN //

/**
* FUNCTION: Markdown()
*	Markdown constructor.
*
* @constructor
* @returns {Markdown} Markdown instance
*/
function Markdown() {
	if ( !( this instanceof Markdown ) ) {
		return new Markdown();
	}
	return this;
} // end FUNCTION Markdown()


// EXPORTS //

module.exports = Markdown;
