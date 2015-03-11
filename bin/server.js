#!/usr/bin/env node
/**
*
*	SERVER: nodebook
*
*
*	DESCRIPTION:
*		- Executable which runs the application.
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

var pkginfo = require( 'pkginfo' );


// PROCESS //

process.title = pkginfo.read( require.main ).package.name;


// APP //

var app = require( './../app' )();
