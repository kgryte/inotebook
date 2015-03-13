

'use strict';

// MODULES //

var CodeMirror = require( 'codemirror' );


// MODES //

require( 'codemirror/mode/javascript/javascript.js' );
require( 'codemirror/mode/shell/shell.js' );
require( 'codemirror/mode/http/http.js' );


// KEYMAPS //

require( 'codemirror/keymap/sublime.js' );


// ADDONS //

// Defines an option autoCloseBrackets that will auto-close brackets and quotes when typed:
require( 'codemirror/addon/edit/closeBrackets.js' );

// Defines an option matchBrackets which, when set to true, causes matching brackets to be highlighted whenever the cursor is next to them:
require( 'codemirror/addon/edit/matchBrackets' );

// Addon for commenting and uncommenting code:
require( 'codemirror/addon/comment/comment.js' );

// Defines a styleActiveLine option that, when enabled, gives the wrapper of the active line the class `CodeMirror-activeline`, and adds a background with the class `CodeMirror-activeline-background:
require( 'codemirror/addon/selection/active-line.js' );

// Adds a placeholder option that can be used to make text appear in the editor when it is empty and not focused:
require( 'codemirror/addon/display/placeholder.js' );

// Defines an interface component for showing lint warnings:
require( 'codemirror/addon/lint/lint.js' );
require( 'codemirror/addon/lint/javascript-lint.js' );
// require( 'codemirror/addon/lint/json-lint.js' );


// CONFIGURATION //

var config = require( './codemirror-config.js' );


// SCRIPT //

var textArea = document.querySelector( '.cell' );

CodeMirror.fromTextArea( textArea, config );
