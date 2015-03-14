/**
*
*	FUNCTION: registerCallback
*
*
*	DESCRIPTION:
*		- Event listener for when an element is registered.
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

// FUNCTIONS //

/**
* FUNCTION: cloneStyle( el )
*	Clone a style element. Note: IE safe clone.
*
* @private
* @param {DOMElement} el - style element
* @returns {DOMElement} cloned style element
*/
function cloneStyle( el ) {
	var s = document.createElement( 'style' );
	s.textContent = el.textContent;
	return s;
} // end FUNCTION cloneStyle()


// REGISTER //

/**
* FUNCTION: registerCallback( el )
*	Event listener for when an element is registered.
*
* @param {DOMElement} el - Polymer element
*/
function registerCallback( el ) {
	/* jslint validthis:true */
	var selectors,
		tmpl,
		i, s;

	selectors = [
		'#ace_editor',
		'#ace-tm'
	];
	tmpl = el.templateContent();
	for ( i = 0; i < selectors.length; i++ ) {
		s = document.querySelector( selectors[ i ] );
		if ( s ) {
			tmpl.appendChild( cloneStyle( s ) );
		}
	}
} // end FUNCTION registerCallback()


// EXPORTS //

module.exports = registerCallback;
