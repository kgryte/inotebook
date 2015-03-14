/**
*
*	FUNCTION: attached
*
*
*	DESCRIPTION:
*		- Event listener for when an element is inserted into the DOM.
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

// MODULES //

var ace = require( 'brace' );


// ACE MODES //

require( 'brace/mode/javascript' );
require( 'brace/mode/text' );


// FUNCTIONS //

/**
* FUNCTION: onRun( editor )
*	Callback which extracts editor contents and runs the code.
*
* @private
* @param {Editor} editor - Editor instance
*/
function onRun( editor ) {
	/* jshint validthis: true */
	var code = editor.getValue();
	code = code.replace( /print\((.*)\)/, 'return print($1)' );

	this.body = code;
} // end FUNCTION onRun()

/**
* FUNCTION: create( ctx, el )
*	Creates a new JavaScript editor instance.
*
* @param {DOMElement} ctx - `this` context
* @param {DOMElement} el - DOM element in which to create the editor
* @returns {Editor} Editor instance
*/
function create( ctx, el ) {
	var editor, session;

	editor = ace.edit( el );
	editor.setFontSize( 16 );
	editor.setBehavioursEnabled( true );
	editor.setHighlightActiveLine( true );
	editor.setShowPrintMargin( false );

	session = editor.getSession();

	// TODO: mode should be dynamic.
	session.setMode( 'ace/mode/javascript' );

	// TODO: settings should be configurable.
	session.setTabSize( 4 );
	session.setUseSoftTabs( false );
	session.setUseWrapMode( true );

	// TODO: validate that this is what is wanted.
	editor.setValue( ctx.body );

	// TODO: shift-enter
	// TODO: extract to separate file
	// TODO: callbacks need to be carefully considered in terms of communicating back up to the `note` element.
	editor.commands.addCommand({
		'name': 'run',
		'bindKey': {
			'win': 'Ctrl-Enter',
			'mac': 'Command-Enter'
		},
		'exec': onRun.bind( ctx )
	});
	return editor;
} // end FUNCTION create()


// ATTACHED //

/**
* FUNCTION: attached()
*	Event listener for when an element is inserted in the DOM.
*/
function attached() {
	/* jslint validthis:true */
	create( this, this.$.editor );
} // end FUNCTION attached()


// EXPORTS //

module.exports = attached;

