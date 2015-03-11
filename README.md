TBD
===

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependencies][dependencies-image]][dependencies-url]

> (...tbd)


1. [Overview](#overview)
1. [Install](#installation)
1. [Run](#run)
1. [Tests](#tests)
	*	[Unit](#unit)
		-	[Server](#unit-server)
		-	[Client](#unit-client)
	*	[Coverage](#coverage)
		-	[Server](#coverage-server)
		-	[Client](#coverage-client)
1. [Contributing](#contributing)
	*	[Style Guide](#style-guide)
		-	[JavaScript](#contributing-javascript)
1. [License](#license)


---
## Overview

The application uses [Node.js](http://nodejs.org), a server-side JavaScript engine, and [Polymer](https://www.polymer-project.org/docs/polymer/polymer.html), a framework for creating [web components](http://www.w3.org/TR/components-intro/).


## Installation

``` bash
$ git clone https://github.com/kgryte/nodebook.git
```

Before running the application, install development dependencies

``` bash
$ make install
```

which installs [node modules](https://www.npmjs.org/) and [bower components](http://bower.io/).



## Run

To start the application server

``` bash
$ npm start
```

or, alternatively, from the top-level application directory

``` bash
$ node ./bin/server.js
```

To view the application in your local web browser, navigate to

```
http://127.0.0.1:7337
```


---
## Examples

...*tbd*.


---
## Tests

### Unit

To run units tests for both server- and client-side code,

``` bash
$ make test
```

All new feature development should have corresponding unit tests to validate correct functionality.


<a name="unit-server"></a>
#### Server

Server-side unit tests use the [Mocha](http://mochajs.org) test framework with [Chai](http://chaijs.com) assertions. To run the tests, execute the following command from the top-level application directory:

``` bash
$ make test-server
```

<a name="unit-client"></a>
#### Client

Unit tests are run via [web component tester](https://github.com/Polymer/web-component-tester), which in turn uses the [Mocha](http://mochajs.org/) test framework with [Chai](http://chaijs.com) assertions. To run the tests, execute the following command from the top-level application directory:

``` bash
$ make test-ui
```


### Test Coverage

This repository uses [Istanbul](https://github.com/gotwarlost/istanbul) as its code coverage tool. To generate a test coverage report, execute the following command from the top-level application directory:

``` bash
$ make test-cov
```

Istanbul creates a `./reports/coverage` directory. To access HTML reports,

``` bash
$ make view-cov
```

<a name="coverage-server"></a>
#### Server

To generate a test coverage report exclusively for server-side tests,

``` bash
$ make test-server-cov
```

Istanbul creates a `./reports/coverage/server` directory. To access an HTML version of the report,

``` bash
$ make view-server-cov
```

<a name="coverage-client"></a>
#### Client

To generate a test coverage report exclusively for client-side tests,

``` bash
$ make test-ui-cov
```

Istanbul creates a `./reports/coverage/ui` directory. To access an HTML version of the report,

``` bash
$ make view-ui-cov
```


---
## Contributing

#### Style Guide

<a name="contributing-javascript"></a>
##### JavaScript

All JavaScript development, both client- and server-side, should follow the [style guide](https://github.com/kgryte/javascript-style-guide).


<a name="contributing-css"></a>
##### CSS

...*tbd*.



---
## License

[MIT license](http://opensource.org/licenses/MIT). 


## Copyright

Copyright &copy; 2015. Athan Reines.


[screenshot-image]: https://github.com/kgryte/nodebook/.png
[screenshot-url]: https://github.com/kgryte/nodebook

[npm-image]: http://img.shields.io/npm/v/.svg
[npm-url]: https://npmjs.org/package/

[travis-image]: http://img.shields.io/travis/kgryte/nodebook/master.svg
[travis-url]: https://travis-ci.org/kgryte/nodebook

[coveralls-image]: https://img.shields.io/coveralls/kgryte/nodebook/master.svg
[coveralls-url]: https://coveralls.io/r/kgryte/nodebook?branch=master

[dependencies-image]: http://img.shields.io/david/kgryte/nodebook.svg
[dependencies-url]: https://david-dm.org/kgryte/nodebook

[dev-dependencies-image]: http://img.shields.io/david/dev/kgryte/nodebook.svg
[dev-dependencies-url]: https://david-dm.org/dev/kgryte/nodebook

[github-issues-image]: http://img.shields.io/github/issues/kgryte/nodebook.svg
[github-issues-url]: https://github.com/kgryte/nodebook/issues
