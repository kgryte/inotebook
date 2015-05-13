
#############
# VARIABLES #

# Component Name:
NAME ?= inotebook

# Output filename:
OUT ?= ./public/index.html

# Component directory:
DIR ?= ./build/components

# Components:
COMPONENTS ?= $(DIR)/polymer-editor \
	$(DIR)/polymer-figure \
	$(DIR)/polymer-footer \
	$(DIR)/polymer-github-markdown \
	$(DIR)/polymer-nav-bar \
	$(DIR)/polymer-note \
	$(DIR)/polymer-notebook \
	$(DIR)/polymer-print \
	$(DIR)/polymer-topical

# Set the node.js environment to test:
NODE_ENV ?= test

# Kernel name:
KERNEL ?= $(shell uname -s)

ifeq ($(KERNEL), Darwin)
	OPEN ?= open
else
	OPEN ?= xdg-open
endif


# NOTES #

NOTES ?= 'TODO|FIXME|WARNING|HACK|NOTE'


# DOCS #

# DOCS ?= ./docs/index.html


# BOWER #

BOWER ?= ./node_modules/.bin/bower
BOWER_COMPONENTS ?= ./src/bower


# BROWSERIFY #

BROWSERIFY ?= ./node_modules/.bin/browserify
BROWSERIFY_BUILD_IN ?= ./build/js/script.js
BROWSERIFY_BUILD_OUT ?= ./build/js/build.js


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
# 	$(OPEN) $(DOCS)


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

# FIXME
test-browserify: node_modules $(COMPONENTS) build-browserify-all
	$(BROWSERIFY) \
		$(BROWSERIFY_BUILD_IN) \
		-o $(BROWSERIFY_BUILD_OUT)

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
	$(OPEN) $(ISTANBUL_HTML_REPORT_PATH)



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

install: install-node install-bower

install-node:
	npm install

install-bower: node_modules
	$(BOWER) install



# BUILD #

.PHONY: build
.PHONY: build-tmp

build: node_modules $(BOWER_COMPONENTS) build-tmp build-browserify build-vulcanize

build-tmp: clean-build
	mkdir build
	cp -a $(WCT_SRC)/. build


# BROWSERIFY #

.PHONY: build-browserify
.PHONY: build-browserify-all

build-browserify: node_modules $(COMPONENTS) build-browserify-all
	$(BROWSERIFY) \
		$(BROWSERIFY_BUILD_IN) \
		-o $(BROWSERIFY_BUILD_OUT)

build-browserify-all: ; $(foreach dir, $(COMPONENTS), $(BROWSERIFY) $(dir)/js/polymer.js -o $(dir)/js/script.js &&) :


# VULCANIZE #

.PHONY: build-vulcanize

build-vulcanize: node_modules $(COMPONENTS)
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
	rm -rf $(BOWER_COMPONENTS)
