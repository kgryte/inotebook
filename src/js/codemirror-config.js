'use strict';

// MODULES //

var CodeMirror = require( 'codemirror' );


// EXPORTS //

module.exports = {
	'value': '',

	// The syntax highlighting mode to use:
	'mode': {
		'name': 'javascript',
		// 'json': true
	},

	// Theme by which to style the editor:
	'theme': 'default',

	// How many spaces a block (whatever that means in the edited language) should be indented:
	'indentUnit': 4,

	// Whether to use the context-sensitive indentation that the mode provides (or just indent the same as the line before):
	'smartIndent': true,

	// The width of a tab character:
	'tabSize': 4,

	// Whether CodeMirror should scroll or wrap for long lines. Defaults to false (scroll).
	'lineWrapping': true,

	// Whether to show line numbers to the left of the editor:
	'lineNumbers': true,

	// Number from which to start counting lines:
	'firstLineNumber': 1,

	// Amount of lines that are rendered above and below the part of the document that's currently scrolled into view:
	'viewportMargin': Number.POSITIVE_INFINITY,

	// What key map should the editor use:
	'keyMap': 'sublime',

	// Extra key bindings for the editor, alongside the ones defined by keyMap:
	'extraKeys': {
		'Cmd-Enter': function onKey( cm ) {
			var code = cm.doc.getValue();
			code = code.replace( /print\((.*)\)/, 'return print($1)' );

			var fcn = new Function( code );

			var val = fcn();

			// console.log( 'the answer is ' + val );

			var el = document.querySelector( '.print' );

			el.innerHTML = val;
		} // end FUNCTION onKey()
	},

	// Source for linting:
	'lint': true,

	// Whether to highlight the active line:
	'styleActiveLine': true,

	// Placeholder text when the editor is empty or not focused:
	'placeholder': 'Code goes here...',

	// Highlight matching brackets when the cursor is next to one:
	'matchBrackets': true,

	// Auto-close brackets and quotes:
	'autoCloseBrackets': true,

	// Array of class names for adding additional gutters:
	'gutters': [
		'CodeMirror-lint-markers'
	],

};
