'use strict';

// VARIABLES //

var levels = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal'
];


// VALIDATOR //

/**
* FUNCTION: validate( args )
*	Validates command-line arguments.
*
* @param {Object} args - command-line arguments
* @returns {Object} validated application options
*/
function validate( args ) {
	var opts = {},
		level,
		port;

	// Server port...
	if ( args.hasOwnProperty( 'port' ) ) {
		port = parseInt( args.port, 10 );
		if ( port !== port || port < 0 ) {
			throw new Error( 'Invalid option. Port must be a nonnegative number. Value: `' + port + '`.' );
		}
		opts.port = port;
	}
	// Application log level...
	if ( args.hasOwnProperty( 'loglevel' ) ) {
		level = args.loglevel;
		level = parseFloat( level );
		if ( level !== level ) {
			level = args.loglevel;
			if ( levels.indexOf( level ) === -1 ) {
				throw new Error( 'Invalid option. Unrecognized log level. Value: `' + args.loglevel + '`.' );
			}
		}
		if ( !opts.hasOwnProperty( 'logger' ) ) {
			opts.logger = {};
		}
		opts.logger.level = level;
	}
	return opts;
} // end FUNCTION validate()


// EXPORTS //

module.exports = validate;
