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

// ATTACHED //

/**
* FUNCTION: attached()
*	Event listener for when an element is inserted in the DOM.
*/
function attached() {
	/* jslint validthis:true */

	// FIXME
	this.notes = [
		{
			'uid': 1,
			'mode': 'markdown',
			'body': '## Heading\n> This is a quote.\n\n### Heading\n\nThis is a paragraph.\n\n``` javascript\nfunction beep( a, b ) {\n\treturn a+b;\n}\n```'
		},
		{
			'uid': 2,
			'mode': 'javascript',
			'body': 'var arr, mu;\narr = [ 1,2,3,4,5,null,\'\' ];\nmu = nanmean( arr );\nprint( mu );'
		},
		{
			'uid': 3,
			'mode': 'javascript',
			'body': 'var data = load( \'./examples/data/timeseries.json\' );\nplot( data );'
		}
	];
} // end FUNCTION attached()


// EXPORTS //

module.exports = attached;

