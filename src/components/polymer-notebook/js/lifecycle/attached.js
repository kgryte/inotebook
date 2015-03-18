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
			'name': 'Note 1: Introduction',
			'body': 'iNotebook\n===\n> This is an iNotebook for interactive computing.\n\n### Overview\n\niNotebooks provide an interactive environment for computation, data analysis, and data visualization. The basic unit of an iNotebook is a __note__.\n\nA note can serve a variety of purposes:\n\n*\t__documentation__: placing concepts and computation within context. Documentation can be external facing (formal how-to guides, tutorials, reports, and manuals) or a simple means to jot down your thoughts and questions.\n*\t__computation__: performing analysis and applying algorithms to data.\n*\t__visualization__: encoding computational output in visually compelling and informative ways.\n\n### Getting Started\n\nNotes come in different flavors (*modes*): __Markdown__ and __JavaScript__. All notes, regardless of mode, are executed using `Ctrl-Enter` (PC) or `Cmd-Enter` (Mac).\n\n#### Markdown\n\nMarkdown notes (such as this note) support standard Markdown formatting. Code snippets are syntax highlighted.\n\n``` javascript\nfunction beep( a, b ) {\n\treturn a+b;\n}\n```\n\n#### JavaScript\n\niNotebooks use JavaScript as their core computation language. All notes within a notebook share a common variable workspace. Hence, variables declared in one note can be referenced, modified, and rendered in other notes within the same notebook.'
		},
		{
			'uid': 2,
			'mode': 'javascript',
			'name': 'Note 2: Some sample code...',
			'body': 'var arr, mu;\narr = [ 1,2,3,4,5,null,\'\' ];\nmu = nanmean( arr );\nprint( mu );'
		},
		{
			'uid': 3,
			'mode': 'javascript',
			'name': 'Note 3: Creating figures...',
			'body': 'var data = load( \'./examples/data/timeseries.json\' );\nplot( data );'
		}
	];
} // end FUNCTION attached()


// EXPORTS //

module.exports = attached;

