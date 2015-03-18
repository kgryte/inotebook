/**
*
*	FUNCTION: bodyChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a note body.
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

var isString = require( 'validate.io-string' ),
	md = require( 'markdown-it' )();


// BODY CHANGED //

/**
* FUNCTION: bodyChanged( oldVal, newVal )
*	Event handler for changes to a note body.
*
* @param {String} oldVal - old value
* @param {String} newVal - new value
*/
function bodyChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var output,
		err,
		fcn,
		val,
		flg,
		el;
	if ( !isString( newVal ) ) {
		err = new TypeError( 'body::invalid assignment. Must be a string. Value: `' + newVal + '`.' );
		this.fire( 'err', err );
		this.body = oldVal;
		return;
	}
	output = this.$.output;
	if ( this.mode === 'javascript' ) {
		// TODO: this is where the magic should occur when parsing the AST and generating the new code to be evaluated.

		val = newVal;

		if ( /print/.test( val ) ) {
			val = newVal.replace( /print\(\s*(.*)\s*\)/, 'return print( $1 );' );
		}
		if ( /load/.test( val ) ) {
			val = val.replace( /load\(\s*\'(.*)\'\s*\)\;?/, '\'$1\';' );
			// val = val.replace( /load\(\s*\'(.*)\'\s*\)\;?(?:\r|\n)(.*)/, 'load( \'$1\', function( err, data ){\n\tif( err ) {\n\t\tthrow new Error( err );\n\t}\n\t$2\n}' );
		}
		if ( /plot/.test( val ) ) {
			flg = true;
			val = val.replace( /plot\(\s(.*)\s\)/, 'return $1;' );
			// val = val.replace( /plot\(\s(.*)\s\)/, 'plot( $1, clbk );' );
		}
		fcn = new Function( val );
		val = fcn();

		if ( !flg ) {
			el = output.querySelector( '.print' );
			if ( !el ) {
				el = document.createElement( 'polymer-print' );
				el.classList.add( 'print' );
				output.appendChild( el );
			}
			el.setAttribute( 'body', val );
		} else {
			el = output.querySelector( '.figure' );
			if ( !el ) {
				el = document.createElement( 'polymer-figure' );
				el.classList.add( 'figure' );
				output.appendChild( el );
			}
			// HACK
			// FIXME
			/* global load */
			load( val, function onData( data ) {
				try {
					data = JSON.parse( data );
				} catch ( err ) {
					throw new Error( 'unable to parse JSON.' );
				}
				el.data = data;
			});
		}
	}
	else if ( this.mode === 'markdown' ) {
		val = md.render( newVal );

		// TODO: hide the editor
		// TODO: bind a double-clk callback which toggles editor/rendered markdown visibility

		this.hideEditor = true;

		el = output.querySelector( '.markdown' );
		if ( !el ) {
			el = document.createElement( 'polymer-github-markdown' );
			el.classList.add( 'markdown' );
			output.appendChild( el );
		}
		el.setAttribute( 'body', val );
	}
	this.fire( 'change', {
		'attr': 'body',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION bodyChanged()


// EXPORTS //

module.exports = bodyChanged;
