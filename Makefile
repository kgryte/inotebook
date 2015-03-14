
#############
# VARIABLES #

# Component Name:
NAME ?= nodebook

# Output filename:
OUT ?= ./public/index.html

# Set the node.js environment to test:
NODE_ENV ?= test


# NOTES #

NOTES ?= 'TODO|FIXME|WARNING|HACK|NOTE'


# DOCS #

# DOCS ?= ./docs/index.html


# BOWER #

BOWER ?= ./node_modules/.bin/bower


# BROWSERIFY #

BROWSERIFY ?= ./node_modules/.bin/browserify
BROWSERIFY_BUILD_IN ?= ./build/components/polymer-nav-bar/js/polymer.js
BROWSERIFY_BUILD_OUT ?= ./build/components/polymer-nav-bar/js/script.js
BROWSERIFY_TEST_IN ?= ./build/js/polymer.js
BROWSERIFY_TEST_OUT ?= ./build/js/script.js


# VULCANIZE #

VULCANIZE ?= ./node_modules/.bin/vulcanize
VULCANIZE_CONF ?= ./etc/vulcanize.conf.json
VULCANIZE_BUILD_IN ?= ./build/index.html
VULCANIZE_BUILD_OUT ?= ./public/index.html


# MOCHA #

MOCHA ?= ./node_modules/.bin/mocha
_MOCHA ?= ./node_modules/.bin/_mocha
MOCHA_REPORTER ?= spec


# ISTANBUL #

# TODO: distinguish between server and UI
ISTANBUL ?= ./node_modules/.bin/istanbul
ISTANBUL_OUT ?= ./reports/coverage
ISTANBUL_REPORT ?= lcov
ISTANBUL_LCOV_INFO_PATH ?= $(ISTANBUL_OUT)/lcov.info
ISTANBUL_HTML_REPORT_PATH ?= $(ISTANBUL_OUT)/lcov-report/index.html


# COVERALLS #

COVERALLS ?= ./node_modules/.bin/coveralls


# WEB COMPONENT TESTER #

WCT ?= ./node_modules/.bin/wct
# TODO: move WCT config file to /etc once issue https://github.com/Polymer/web-component-tester/issues/98 is resolved
WCT_CONF ?= ./wct.conf.js
WCT_SRC ?= ./src
WCT_TMP ?= ./build
WCT_VAR ?= 'window.parent.WCT.share.__coverage__'


# JSHINT #

JSHINT ?= ./node_modules/.bin/jshint
JSHINT_REPORTER ?= ./node_modules/jshint-stylish/stylish.js



# FILES #

# Source files:
SOURCES ?= app/*.js app/**/*.js app/**/**/*.js app/**/**/**/*.js app/**/**/**/**/*.js src/*.js src/**/*.js

# Test files:
TESTS ?= test/app/**/*.js test/app/**/**/*.js test/app/**/**/**/*.js test/app/**/**/**/**/*.js

# TODO: add component test files!!!!



###########
# TARGETS #


# NOTES #

.PHONY: notes

notes:
	grep -Ern $(NOTES) $(SOURCES) $(TESTS)


# DOCS #

# .PHONY: view-docs

# view-docs:
# 	open $(DOCS)


# UNIT TESTS #

.PHONY: test
.PHONY: test-server test-ui
.PHONY: test-wct test-browserify test-tmp

test: test-server test-ui

# Server:
test-server: node_modules
	NODE_ENV=$(NODE_ENV) \
	NODE_PATH=$(NODE_PATH_TEST) \
	$(MOCHA) \
		--reporter $(MOCHA_REPORTER) \
		$(TESTS)

# UI:
test-ui: test-wct

test-tmp: clean-test
	mkdir $(WCT_TMP)
	cp -a $(WCT_SRC)/. $(WCT_TMP)

test-browserify: node_modules
	$(BROWSERIFY) \
		$(BROWSERIFY_TEST_IN) \
		-o $(BROWSERIFY_TEST_OUT)

test-wct: node_modules test-tmp test-browserify
	$(WCT) \
		--plugin local



# CODE COVERAGE #

.PHONY: test-cov
.PHONY: test-server-cov test-ui-cov
.PHONY: test-instrument
.PHONY: test-istanbul-wct
.PHONY: test-istanbul-instrument

test-cov: test-server-cov test-ui-cov

# Server:
test-server-cov: test-istanbul-mocha

test-istanbul-mocha: node_modules
	NODE_ENV=$(NODE_ENV) \
	NODE_PATH=$(NODE_PATH_TEST) \
	$(ISTANBUL) cover \
		--dir $(ISTANBUL_OUT) \
		--report $(ISTANBUL_REPORT) \
	$(_MOCHA) -- \
		--reporter $(MOCHA_REPORTER) \
		$(TESTS)

# UI:
test-ui-cov: test-istanbul-wct

test-instrument: test-istanbul-instrument

test-istanbul-instrument: node_modules
	$(ISTANBUL) instrument \
		$(WCT_SRC) \
		-o $(WCT_TMP) \
		--variable $(WCT_VAR)

test-istanbul-wct: node_modules test-tmp test-instrument test-browserify
	$(WCT) \
		--plugin local



# COVERAGE REPORT #

.PHONY: view-cov
.PHONY: view-server-cov view-ui-cov
.PHONY: view-istanbul-report

view-cov: view-server-cov view-ui-cov

# Server:
view-server-cov: view-istanbul-report

# TODO: separate server and UI coverage paths

# UI:
view-ui-cov: view-istanbul-report

view-istanbul-report:
	open $(ISTANBUL_HTML_REPORT_PATH)



# REPORTING #

.PHONY: coveralls

# TODO: cat together the server and UI coverage
coveralls: node_modules test-cov
	cat $(ISTANBUL_LCOV_INFO_PATH) | $(COVERALLS) && rm -rf $(ISTANBUL_OUT)



# LINT #

.PHONY: lint lint-jshint

lint: lint-jshint

lint-jshint: node_modules
	$(JSHINT) \
		--reporter $(JSHINT_REPORTER) \
		./



# INSTALL #

.PHONY: install
.PHONY: install-node install-bower
.PHONY: install-browserify install-vulcanize
.PHONY: install-browserify-logger install-browserify-topical

install: install-node install-bower install-browserify install-vulcanize

install-node:
	npm install

install-bower: node_modules
	$(BOWER) install


# TODO: remove these and consolidate with browserify target below...

# Browserify:
install-browserify: install-browserify-logger install-browserify-topical

install-browserify-logger: install-browserify-bunyan

install-browserify-bunyan: node_modules
	$(BROWSERIFY) \
		./node_modules/bunyan/lib/bunyan.js \
		-s bunyan \
		-o $(BROWSERIFY_OUT)/bunyan.js

install-browserify-topical: node_modules
	$(BROWSERIFY) \
		./node_modules/topical/lib/index.js \
		-s topical \
		-o $(BROWSERIFY_OUT)/topical.js


# Vulcanize:
install-vulcanize: node_modules
	$(VULCANIZE) \
		$(VULCANIZE_IN) \
		-o $(VULCANIZE_OUT) \
		--inline



# BUILD #

.PHONY: build
.PHONY: build-tmp

build: node_modules build-tmp browserify vulcanize

build-tmp: clean-build
	mkdir build
	cp -a $(WCT_SRC)/. build


# BROWSERIFY #

.PHONY: browserify

xbrowserify: node_modules
	$(BROWSERIFY) \
		$(BROWSERIFY_BUILD_IN) \
		-o $(BROWSERIFY_BUILD_OUT)

browserify: node_modules
	$(BROWSERIFY) \
		./build/components/polymer-nav-bar/js/polymer.js \
		-o ./build/components/polymer-nav-bar/js/script.js
	$(BROWSERIFY) \
		./build/components/polymer-editor/js/polymer.js \
		-o ./build/components/polymer-editor/js/script.js
	$(BROWSERIFY) \
		./build/components/polymer-note/js/polymer.js \
		-o ./build/components/polymer-note/js/script.js
	$(BROWSERIFY) \
		./build/components/polymer-notebook/js/polymer.js \
		-o ./build/components/polymer-notebook/js/script.js
	$(BROWSERIFY) \
		./build/components/polymer-print/js/polymer.js \
		-o ./build/components/polymer-print/js/script.js
	$(BROWSERIFY) \
		./build/js/script.js \
		-o ./build/js/build.js


# VULCANIZE #

.PHONY: vulcanize

vulcanize: node_modules
	$(VULCANIZE) \
		$(VULCANIZE_BUILD_IN) \
		--config $(VULCANIZE_CONF) \
		-o $(VULCANIZE_BUILD_OUT) \
		--inline \
		--no-strip-excludes


# CLEAN #

.PHONY: clean
.PHONY: clean-build clean-node clean-bower clean-test

clean: clean-build clean-node clean-bower clean-test

clean-build:
	rm -rf build
	rm -f $(OUT)

clean-test:
	rm -rf $(WCT_TMP)

clean-node:
	rm -rf node_modules

clean-bower:
	rm -rf bower
