/**
*
*	MIDDLEWARE: monitor
*
*
*	DESCRIPTION:
*		- Middleware to monitor application performance.
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

var createMonitor = require( 'connect-middleware-monitor' );


// PLUGINS //

var sysPlugin = require( 'monitor-plugin-os' ),
	procPlugin = require( 'monitor-plugin-process' ),
	resPlugin = require( './plugins/response_stats.js' );


// MONITOR //

var monitor = createMonitor(
	sysPlugin,
	procPlugin,
	resPlugin
);


// EXPORTS //

module.exports = monitor;
