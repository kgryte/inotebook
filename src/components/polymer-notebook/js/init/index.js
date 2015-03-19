/**
*
*	FUNCTION: init
*
*
*	DESCRIPTION:
*		- Performs element initialization.
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

/* global document */
'use strict';

/**
* FUNCTION: init()
*	Initialization.
*
* @returns {Object} context
*/
function init() {
	/* jslint validthis:true */
	var el;

	// Create a new topical element to access the application publish-subscribe service:
	el = document.createElement( 'polymer-topical' );
	this._topical = el.topical;

	// Create a new uuid element for generating unique identifiers:
	el = document.createElement( 'polymer-uuid' );
	this._uuid = el.uuid;

	// Add and subscribe to topics:
	this._topical
		.add( 'create.note.markdown' )
		.add( 'create.note.javascript' )
		.add( 'create.notebook' );

	this._topical
		.subscribe( 'create.note.markdown', this.createMarkdown.bind( this ) )
		.subscribe( 'create.note.javascript', this.createJavaScript.bind( this ) )
		.subscribe( 'create.notebook', this.createNotebook.bind( this ) );

	// FIXME
	this.notes = [
		{
			'uid': this._uuid.v4(),
			'mode': 'markdown',
			'name': 'Note 1: Introduction',
			'body': 'iNotebook\n===\n> This is an iNotebook for interactive computing.\n\n### Overview\n\niNotebooks provide an interactive environment for computation, data analysis, and data visualization. The basic unit of an iNotebook is a __note__.\n\nA note can serve a variety of purposes:\n\n*\t__documentation__: placing concepts and computation within context. Documentation can be external facing (formal how-to guides, tutorials, reports, and manuals) or a simple means to jot down your thoughts and questions.\n*\t__computation__: performing analysis and applying algorithms to data.\n*\t__visualization__: encoding computational output in visually compelling and informative ways.\n\n### Getting Started\n\nNotes come in different flavors (*modes*): __Markdown__ and __JavaScript__. All notes, regardless of mode, are executed using `Ctrl-Enter` (PC) or `Cmd-Enter` (Mac).\n\n#### Markdown\n\nMarkdown notes (such as this note) support standard Markdown formatting. Code snippets are syntax highlighted.\n\n``` javascript\nfunction beep( a, b ) {\n\treturn a+b;\n}\n```\n\n#### JavaScript\n\niNotebooks use JavaScript as their core computation language. All notes within a notebook share a common variable workspace. Hence, variables declared in one note can be referenced, modified, and rendered in other notes within the same notebook.'
		},
		{
			'uid': this._uuid.v4(),
			'mode': 'javascript',
			'name': 'Note 2: Some sample code...',
			'body': 'var arr, mu;\narr = [ 1,2,3,4,5,null,\'\' ];\nmu = nanmean( arr );\nprint( mu );'
		},
		{
			'uid': this._uuid.v4(),
			'mode': 'javascript',
			'name': 'Note 3: Creating figures...',
			'body': 'var data = load( \'./examples/data/timeseries.json\' );\nplot( data );'
		}
	];

	return this;
} // end FUNCTION init()


// EXPORTS //

module.exports = init;
