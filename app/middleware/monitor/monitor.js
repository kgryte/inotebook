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
