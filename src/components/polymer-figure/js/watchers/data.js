/**
*
*	FUNCTION: dataChanged
*
*
*	DESCRIPTION:
*		- Event handler for changes to a data attribute.
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

/**
* FUNCTION: dataChanged( oldVal, newVal )
*	Event handler for changes to a data attribute.
*
* @param {Array|null} oldVal - old value
* @param {Array|null} newVal - new value
*/
function dataChanged( oldVal, newVal ) {
	/* jslint validthis:true */
	var el = this.$.chart;
	if ( newVal === null ) {
		el.clear();
	} else {
		el.width = el.clientWidth;
		el.yMin = 0;
		el.yMax = 1;
		el.xLabel = 'time';
		el.labels = [
			'series 1',
			'series 2',
			'series 3'
		];
		el.data = el.formatData( newVal );

		el.annotations = [
			[ 1417564926959, 'beep boop bap foo' ]
		];
	}
	this.fire( 'change', {
		'attr': 'data',
		'prev': oldVal,
		'curr': newVal
	});
} // end FUNCTION dataChanged()


// EXPORTS //

module.exports = dataChanged;
