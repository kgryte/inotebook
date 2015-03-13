/**
*
*	SCRIPT: editor
*
*
*	DESCRIPTION:
*		-
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

/* global window, document */
'use strict';

// MODULES //

var ace = require( 'brace' );

require( 'brace/mode/javascript' );


// FUNCTIONS //

/**
* FUNCTION: onRun( editor )
*	Callback which extracts editor contents and runs the code.
*
* @private
* @param {Editor} editor - Editor instance
*/
function onRun( editor ) {
	var parent = editor.container.parentNode,
		code,
		fcn,
		val,
		el;

	code = editor.getValue();
	code = code.replace( /print\((.*)\)/, 'return print($1)' );

	fcn = new Function( code );
	val = fcn();

	el = parent.querySelector( '.print' );
	if ( !el ) {
		el = document.createElement( 'div' );
		el.classList.add( 'print' );
		parent.appendChild( el );
	}
	el.innerHTML = val;
} // end FUNCTION onRun()


// EDITOR //

/**
* FUNCTION: create( selector )
*	Creates a new JavaScript editor instance.
*
* @param {String} selector - id selector
* @returns {Editor} Editor instance
*/
function create( selector ) {
	var editor, session;

	if ( selector[ 0 ] === '#' ) {
		selector = selector.slice( 1 );
	}
	editor = ace.edit( selector );
	editor.setFontSize( 16 );
	editor.setBehavioursEnabled( true );
	editor.setHighlightActiveLine( true );
	editor.setShowPrintMargin( false );

	session = editor.getSession();
	session.setMode( 'ace/mode/javascript' );
	session.setTabSize( 4 );
	session.setUseSoftTabs( false );
	session.setUseWrapMode( true );

	// TODO: shift-enter
	// TODO: extract to separate file
	editor.commands.addCommand({
		'name': 'run',
		'bindKey': {
			'win': 'Ctrl-Enter',
			'mac': 'Command-Enter'
		},
		'exec': onRun
	});
	return editor;
} // end FUNCTION create()


// EXPORTS //

module.exports = create;
