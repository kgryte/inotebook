(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var noOptions = {};
  var nonWS = /[^\s\u00a0]/;
  var Pos = CodeMirror.Pos;

  function firstNonWS(str) {
    var found = str.search(nonWS);
    return found == -1 ? 0 : found;
  }

  CodeMirror.commands.toggleComment = function(cm) {
    var minLine = Infinity, ranges = cm.listSelections(), mode = null;
    for (var i = ranges.length - 1; i >= 0; i--) {
      var from = ranges[i].from(), to = ranges[i].to();
      if (from.line >= minLine) continue;
      if (to.line >= minLine) to = Pos(minLine, 0);
      minLine = from.line;
      if (mode == null) {
        if (cm.uncomment(from, to)) mode = "un";
        else { cm.lineComment(from, to); mode = "line"; }
      } else if (mode == "un") {
        cm.uncomment(from, to);
      } else {
        cm.lineComment(from, to);
      }
    }
  };

  CodeMirror.defineExtension("lineComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = self.getModeAt(from);
    var commentString = options.lineComment || mode.lineComment;
    if (!commentString) {
      if (options.blockCommentStart || mode.blockCommentStart) {
        options.fullLines = true;
        self.blockComment(from, to, options);
      }
      return;
    }
    var firstLine = self.getLine(from.line);
    if (firstLine == null) return;
    var end = Math.min(to.ch != 0 || to.line == from.line ? to.line + 1 : to.line, self.lastLine() + 1);
    var pad = options.padding == null ? " " : options.padding;
    var blankLines = options.commentBlankLines || from.line == to.line;

    self.operation(function() {
      if (options.indent) {
        var baseString = firstLine.slice(0, firstNonWS(firstLine));
        for (var i = from.line; i < end; ++i) {
          var line = self.getLine(i), cut = baseString.length;
          if (!blankLines && !nonWS.test(line)) continue;
          if (line.slice(0, cut) != baseString) cut = firstNonWS(line);
          self.replaceRange(baseString + commentString + pad, Pos(i, 0), Pos(i, cut));
        }
      } else {
        for (var i = from.line; i < end; ++i) {
          if (blankLines || nonWS.test(self.getLine(i)))
            self.replaceRange(commentString + pad, Pos(i, 0));
        }
      }
    });
  });

  CodeMirror.defineExtension("blockComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = self.getModeAt(from);
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) {
      if ((options.lineComment || mode.lineComment) && options.fullLines != false)
        self.lineComment(from, to, options);
      return;
    }

    var end = Math.min(to.line, self.lastLine());
    if (end != from.line && to.ch == 0 && nonWS.test(self.getLine(end))) --end;

    var pad = options.padding == null ? " " : options.padding;
    if (from.line > end) return;

    self.operation(function() {
      if (options.fullLines != false) {
        var lastLineHasText = nonWS.test(self.getLine(end));
        self.replaceRange(pad + endString, Pos(end));
        self.replaceRange(startString + pad, Pos(from.line, 0));
        var lead = options.blockCommentLead || mode.blockCommentLead;
        if (lead != null) for (var i = from.line + 1; i <= end; ++i)
          if (i != end || lastLineHasText)
            self.replaceRange(lead + pad, Pos(i, 0));
      } else {
        self.replaceRange(endString, to);
        self.replaceRange(startString, from);
      }
    });
  });

  CodeMirror.defineExtension("uncomment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = self.getModeAt(from);
    var end = Math.min(to.ch != 0 || to.line == from.line ? to.line : to.line - 1, self.lastLine()), start = Math.min(from.line, end);

    // Try finding line comments
    var lineString = options.lineComment || mode.lineComment, lines = [];
    var pad = options.padding == null ? " " : options.padding, didSomething;
    lineComment: {
      if (!lineString) break lineComment;
      for (var i = start; i <= end; ++i) {
        var line = self.getLine(i);
        var found = line.indexOf(lineString);
        if (found > -1 && !/comment/.test(self.getTokenTypeAt(Pos(i, found + 1)))) found = -1;
        if (found == -1 && (i != end || i == start) && nonWS.test(line)) break lineComment;
        if (found > -1 && nonWS.test(line.slice(0, found))) break lineComment;
        lines.push(line);
      }
      self.operation(function() {
        for (var i = start; i <= end; ++i) {
          var line = lines[i - start];
          var pos = line.indexOf(lineString), endPos = pos + lineString.length;
          if (pos < 0) continue;
          if (line.slice(endPos, endPos + pad.length) == pad) endPos += pad.length;
          didSomething = true;
          self.replaceRange("", Pos(i, pos), Pos(i, endPos));
        }
      });
      if (didSomething) return true;
    }

    // Try block comments
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) return false;
    var lead = options.blockCommentLead || mode.blockCommentLead;
    var startLine = self.getLine(start), endLine = end == start ? startLine : self.getLine(end);
    var open = startLine.indexOf(startString), close = endLine.lastIndexOf(endString);
    if (close == -1 && start != end) {
      endLine = self.getLine(--end);
      close = endLine.lastIndexOf(endString);
    }
    if (open == -1 || close == -1 ||
        !/comment/.test(self.getTokenTypeAt(Pos(start, open + 1))) ||
        !/comment/.test(self.getTokenTypeAt(Pos(end, close + 1))))
      return false;

    // Avoid killing block comments completely outside the selection.
    // Positions of the last startString before the start of the selection, and the first endString after it.
    var lastStart = startLine.lastIndexOf(startString, from.ch);
    var firstEnd = lastStart == -1 ? -1 : startLine.slice(0, from.ch).indexOf(endString, lastStart + startString.length);
    if (lastStart != -1 && firstEnd != -1 && firstEnd + endString.length != from.ch) return false;
    // Positions of the first endString after the end of the selection, and the last startString before it.
    firstEnd = endLine.indexOf(endString, to.ch);
    var almostLastStart = endLine.slice(to.ch).lastIndexOf(startString, firstEnd - to.ch);
    lastStart = (firstEnd == -1 || almostLastStart == -1) ? -1 : to.ch + almostLastStart;
    if (firstEnd != -1 && lastStart != -1 && lastStart != to.ch) return false;

    self.operation(function() {
      self.replaceRange("", Pos(end, close - (pad && endLine.slice(close - pad.length, close) == pad ? pad.length : 0)),
                        Pos(end, close + endString.length));
      var openEnd = open + startString.length;
      if (pad && startLine.slice(openEnd, openEnd + pad.length) == pad) openEnd += pad.length;
      self.replaceRange("", Pos(start, open), Pos(start, openEnd));
      if (lead) for (var i = start + 1; i <= end; ++i) {
        var line = self.getLine(i), found = line.indexOf(lead);
        if (found == -1 || nonWS.test(line.slice(0, found))) continue;
        var foundEnd = found + lead.length;
        if (pad && line.slice(foundEnd, foundEnd + pad.length) == pad) foundEnd += pad.length;
        self.replaceRange("", Pos(i, found), Pos(i, foundEnd));
      }
    });
    return true;
  });
});

},{"../../lib/codemirror":11}],2:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  CodeMirror.defineOption("placeholder", "", function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      cm.on("blur", onBlur);
      cm.on("change", onChange);
      onChange(cm);
    } else if (!val && prev) {
      cm.off("blur", onBlur);
      cm.off("change", onChange);
      clearPlaceholder(cm);
      var wrapper = cm.getWrapperElement();
      wrapper.className = wrapper.className.replace(" CodeMirror-empty", "");
    }

    if (val && !cm.hasFocus()) onBlur(cm);
  });

  function clearPlaceholder(cm) {
    if (cm.state.placeholder) {
      cm.state.placeholder.parentNode.removeChild(cm.state.placeholder);
      cm.state.placeholder = null;
    }
  }
  function setPlaceholder(cm) {
    clearPlaceholder(cm);
    var elt = cm.state.placeholder = document.createElement("pre");
    elt.style.cssText = "height: 0; overflow: visible";
    elt.className = "CodeMirror-placeholder";
    elt.appendChild(document.createTextNode(cm.getOption("placeholder")));
    cm.display.lineSpace.insertBefore(elt, cm.display.lineSpace.firstChild);
  }

  function onBlur(cm) {
    if (isEmpty(cm)) setPlaceholder(cm);
  }
  function onChange(cm) {
    var wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
    wrapper.className = wrapper.className.replace(" CodeMirror-empty", "") + (empty ? " CodeMirror-empty" : "");

    if (empty) setPlaceholder(cm);
    else clearPlaceholder(cm);
  }

  function isEmpty(cm) {
    return (cm.lineCount() === 1) && (cm.getLine(0) === "");
  }
});

},{"../../lib/codemirror":11}],3:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var DEFAULT_BRACKETS = "()[]{}''\"\"";
  var DEFAULT_TRIPLES = "'\"";
  var DEFAULT_EXPLODE_ON_ENTER = "[]{}";
  var SPACE_CHAR_REGEX = /\s/;

  var Pos = CodeMirror.Pos;

  CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
    if (old != CodeMirror.Init && old)
      cm.removeKeyMap("autoCloseBrackets");
    if (!val) return;
    var pairs = DEFAULT_BRACKETS, triples = DEFAULT_TRIPLES, explode = DEFAULT_EXPLODE_ON_ENTER;
    if (typeof val == "string") pairs = val;
    else if (typeof val == "object") {
      if (val.pairs != null) pairs = val.pairs;
      if (val.triples != null) triples = val.triples;
      if (val.explode != null) explode = val.explode;
    }
    var map = buildKeymap(pairs, triples);
    if (explode) map.Enter = buildExplodeHandler(explode);
    cm.addKeyMap(map);
  });

  function charsAround(cm, pos) {
    var str = cm.getRange(Pos(pos.line, pos.ch - 1),
                          Pos(pos.line, pos.ch + 1));
    return str.length == 2 ? str : null;
  }

  // Project the token type that will exists after the given char is
  // typed, and use it to determine whether it would cause the start
  // of a string token.
  function enteringString(cm, pos, ch) {
    var line = cm.getLine(pos.line);
    var token = cm.getTokenAt(pos);
    if (/\bstring2?\b/.test(token.type)) return false;
    var stream = new CodeMirror.StringStream(line.slice(0, pos.ch) + ch + line.slice(pos.ch), 4);
    stream.pos = stream.start = token.start;
    for (;;) {
      var type1 = cm.getMode().token(stream, token.state);
      if (stream.pos >= pos.ch + 1) return /\bstring2?\b/.test(type1);
      stream.start = stream.pos;
    }
  }

  function buildKeymap(pairs, triples) {
    var map = {
      name : "autoCloseBrackets",
      Backspace: function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;
        var ranges = cm.listSelections();
        for (var i = 0; i < ranges.length; i++) {
          if (!ranges[i].empty()) return CodeMirror.Pass;
          var around = charsAround(cm, ranges[i].head);
          if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
        }
        for (var i = ranges.length - 1; i >= 0; i--) {
          var cur = ranges[i].head;
          cm.replaceRange("", Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1));
        }
      }
    };
    var closingBrackets = "";
    for (var i = 0; i < pairs.length; i += 2) (function(left, right) {
      closingBrackets += right;
      map["'" + left + "'"] = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;
        var ranges = cm.listSelections(), type, next;
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i], cur = range.head, curType;
          var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
          if (!range.empty()) {
            curType = "surround";
          } else if (left == right && next == right) {
            if (cm.getRange(cur, Pos(cur.line, cur.ch + 3)) == left + left + left)
              curType = "skipThree";
            else
              curType = "skip";
          } else if (left == right && cur.ch > 1 && triples.indexOf(left) >= 0 &&
                     cm.getRange(Pos(cur.line, cur.ch - 2), cur) == left + left &&
                     (cur.ch <= 2 || cm.getRange(Pos(cur.line, cur.ch - 3), Pos(cur.line, cur.ch - 2)) != left)) {
            curType = "addFour";
          } else if (left == '"' || left == "'") {
            if (!CodeMirror.isWordChar(next) && enteringString(cm, cur, left)) curType = "both";
            else return CodeMirror.Pass;
          } else if (cm.getLine(cur.line).length == cur.ch || closingBrackets.indexOf(next) >= 0 || SPACE_CHAR_REGEX.test(next)) {
            curType = "both";
          } else {
            return CodeMirror.Pass;
          }
          if (!type) type = curType;
          else if (type != curType) return CodeMirror.Pass;
        }

        cm.operation(function() {
          if (type == "skip") {
            cm.execCommand("goCharRight");
          } else if (type == "skipThree") {
            for (var i = 0; i < 3; i++)
              cm.execCommand("goCharRight");
          } else if (type == "surround") {
            var sels = cm.getSelections();
            for (var i = 0; i < sels.length; i++)
              sels[i] = left + sels[i] + right;
            cm.replaceSelections(sels, "around");
          } else if (type == "both") {
            cm.replaceSelection(left + right, null);
            cm.execCommand("goCharLeft");
          } else if (type == "addFour") {
            cm.replaceSelection(left + left + left + left, "before");
            cm.execCommand("goCharRight");
          }
        });
      };
      if (left != right) map["'" + right + "'"] = function(cm) {
        var ranges = cm.listSelections();
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i];
          if (!range.empty() ||
              cm.getRange(range.head, Pos(range.head.line, range.head.ch + 1)) != right)
            return CodeMirror.Pass;
        }
        cm.execCommand("goCharRight");
      };
    })(pairs.charAt(i), pairs.charAt(i + 1));
    return map;
  }

  function buildExplodeHandler(pairs) {
    return function(cm) {
      if (cm.getOption("disableInput")) return CodeMirror.Pass;
      var ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        if (!ranges[i].empty()) return CodeMirror.Pass;
        var around = charsAround(cm, ranges[i].head);
        if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
      }
      cm.operation(function() {
        cm.replaceSelection("\n\n", null);
        cm.execCommand("goCharLeft");
        ranges = cm.listSelections();
        for (var i = 0; i < ranges.length; i++) {
          var line = ranges[i].head.line;
          cm.indentLine(line, null, true);
          cm.indentLine(line + 1, null, true);
        }
      });
    };
  }
});

},{"../../lib/codemirror":11}],4:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

},{"../../lib/codemirror":11}],5:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"../../lib/codemirror":11,"dup":4}],6:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  // declare global: JSHINT

  var bogus = [ "Dangerous comment" ];

  var warnings = [ [ "Expected '{'",
                     "Statement body should be inside '{ }' braces." ] ];

  var errors = [ "Missing semicolon", "Extra comma", "Missing property name",
                 "Unmatched ", " and instead saw", " is not defined",
                 "Unclosed string", "Stopping, unable to continue" ];

  function validator(text, options) {
    if (!window.JSHINT) return [];
    JSHINT(text, options);
    var errors = JSHINT.data().errors, result = [];
    if (errors) parseErrors(errors, result);
    return result;
  }

  CodeMirror.registerHelper("lint", "javascript", validator);

  function cleanup(error) {
    // All problems are warnings by default
    fixWith(error, warnings, "warning", true);
    fixWith(error, errors, "error");

    return isBogus(error) ? null : error;
  }

  function fixWith(error, fixes, severity, force) {
    var description, fix, find, replace, found;

    description = error.description;

    for ( var i = 0; i < fixes.length; i++) {
      fix = fixes[i];
      find = (typeof fix === "string" ? fix : fix[0]);
      replace = (typeof fix === "string" ? null : fix[1]);
      found = description.indexOf(find) !== -1;

      if (force || found) {
        error.severity = severity;
      }
      if (found && replace) {
        error.description = replace;
      }
    }
  }

  function isBogus(error) {
    var description = error.description;
    for ( var i = 0; i < bogus.length; i++) {
      if (description.indexOf(bogus[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function parseErrors(errors, output) {
    for ( var i = 0; i < errors.length; i++) {
      var error = errors[i];
      if (error) {
        var linetabpositions, index;

        linetabpositions = [];

        // This next block is to fix a problem in jshint. Jshint
        // replaces
        // all tabs with spaces then performs some checks. The error
        // positions (character/space) are then reported incorrectly,
        // not taking the replacement step into account. Here we look
        // at the evidence line and try to adjust the character position
        // to the correct value.
        if (error.evidence) {
          // Tab positions are computed once per line and cached
          var tabpositions = linetabpositions[error.line];
          if (!tabpositions) {
            var evidence = error.evidence;
            tabpositions = [];
            // ugggh phantomjs does not like this
            // forEachChar(evidence, function(item, index) {
            Array.prototype.forEach.call(evidence, function(item,
                                                            index) {
              if (item === '\t') {
                // First col is 1 (not 0) to match error
                // positions
                tabpositions.push(index + 1);
              }
            });
            linetabpositions[error.line] = tabpositions;
          }
          if (tabpositions.length > 0) {
            var pos = error.character;
            tabpositions.forEach(function(tabposition) {
              if (pos > tabposition) pos -= 1;
            });
            error.character = pos;
          }
        }

        var start = error.character - 1, end = start + 1;
        if (error.evidence) {
          index = error.evidence.substring(start).search(/.\b/);
          if (index > -1) {
            end += index;
          }
        }

        // Convert to format expected by validation service
        error.description = error.reason;// + "(jshint)";
        error.start = error.character;
        error.end = end;
        error = cleanup(error);

        if (error)
          output.push({message: error.description,
                       severity: error.severity,
                       from: CodeMirror.Pos(error.line - 1, start),
                       to: CodeMirror.Pos(error.line - 1, end)});
      }
    }
  }
});

},{"../../lib/codemirror":11}],7:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var GUTTER_ID = "CodeMirror-lint-markers";

  function showTooltip(e, content) {
    var tt = document.createElement("div");
    tt.className = "CodeMirror-lint-tooltip";
    tt.appendChild(content.cloneNode(true));
    document.body.appendChild(tt);

    function position(e) {
      if (!tt.parentNode) return CodeMirror.off(document, "mousemove", position);
      tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + "px";
      tt.style.left = (e.clientX + 5) + "px";
    }
    CodeMirror.on(document, "mousemove", position);
    position(e);
    if (tt.style.opacity != null) tt.style.opacity = 1;
    return tt;
  }
  function rm(elt) {
    if (elt.parentNode) elt.parentNode.removeChild(elt);
  }
  function hideTooltip(tt) {
    if (!tt.parentNode) return;
    if (tt.style.opacity == null) rm(tt);
    tt.style.opacity = 0;
    setTimeout(function() { rm(tt); }, 600);
  }

  function showTooltipFor(e, content, node) {
    var tooltip = showTooltip(e, content);
    function hide() {
      CodeMirror.off(node, "mouseout", hide);
      if (tooltip) { hideTooltip(tooltip); tooltip = null; }
    }
    var poll = setInterval(function() {
      if (tooltip) for (var n = node;; n = n.parentNode) {
        if (n && n.nodeType == 11) n = n.host;
        if (n == document.body) return;
        if (!n) { hide(); break; }
      }
      if (!tooltip) return clearInterval(poll);
    }, 400);
    CodeMirror.on(node, "mouseout", hide);
  }

  function LintState(cm, options, hasGutter) {
    this.marked = [];
    this.options = options;
    this.timeout = null;
    this.hasGutter = hasGutter;
    this.onMouseOver = function(e) { onMouseOver(cm, e); };
  }

  function parseOptions(cm, options) {
    if (options instanceof Function) return {getAnnotations: options};
    if (!options || options === true) options = {};
    if (!options.getAnnotations) options.getAnnotations = cm.getHelper(CodeMirror.Pos(0, 0), "lint");
    if (!options.getAnnotations) throw new Error("Required option 'getAnnotations' missing (lint addon)");
    return options;
  }

  function clearMarks(cm) {
    var state = cm.state.lint;
    if (state.hasGutter) cm.clearGutter(GUTTER_ID);
    for (var i = 0; i < state.marked.length; ++i)
      state.marked[i].clear();
    state.marked.length = 0;
  }

  function makeMarker(labels, severity, multiple, tooltips) {
    var marker = document.createElement("div"), inner = marker;
    marker.className = "CodeMirror-lint-marker-" + severity;
    if (multiple) {
      inner = marker.appendChild(document.createElement("div"));
      inner.className = "CodeMirror-lint-marker-multiple";
    }

    if (tooltips != false) CodeMirror.on(inner, "mouseover", function(e) {
      showTooltipFor(e, labels, inner);
    });

    return marker;
  }

  function getMaxSeverity(a, b) {
    if (a == "error") return a;
    else return b;
  }

  function groupByLine(annotations) {
    var lines = [];
    for (var i = 0; i < annotations.length; ++i) {
      var ann = annotations[i], line = ann.from.line;
      (lines[line] || (lines[line] = [])).push(ann);
    }
    return lines;
  }

  function annotationTooltip(ann) {
    var severity = ann.severity;
    if (!severity) severity = "error";
    var tip = document.createElement("div");
    tip.className = "CodeMirror-lint-message-" + severity;
    tip.appendChild(document.createTextNode(ann.message));
    return tip;
  }

  function startLinting(cm) {
    var state = cm.state.lint, options = state.options;
    var passOptions = options.options || options; // Support deprecated passing of `options` property in options
    if (options.async || options.getAnnotations.async)
      options.getAnnotations(cm.getValue(), updateLinting, passOptions, cm);
    else
      updateLinting(cm, options.getAnnotations(cm.getValue(), passOptions, cm));
  }

  function updateLinting(cm, annotationsNotSorted) {
    clearMarks(cm);
    var state = cm.state.lint, options = state.options;

    var annotations = groupByLine(annotationsNotSorted);

    for (var line = 0; line < annotations.length; ++line) {
      var anns = annotations[line];
      if (!anns) continue;

      var maxSeverity = null;
      var tipLabel = state.hasGutter && document.createDocumentFragment();

      for (var i = 0; i < anns.length; ++i) {
        var ann = anns[i];
        var severity = ann.severity;
        if (!severity) severity = "error";
        maxSeverity = getMaxSeverity(maxSeverity, severity);

        if (options.formatAnnotation) ann = options.formatAnnotation(ann);
        if (state.hasGutter) tipLabel.appendChild(annotationTooltip(ann));

        if (ann.to) state.marked.push(cm.markText(ann.from, ann.to, {
          className: "CodeMirror-lint-mark-" + severity,
          __annotation: ann
        }));
      }

      if (state.hasGutter)
        cm.setGutterMarker(line, GUTTER_ID, makeMarker(tipLabel, maxSeverity, anns.length > 1,
                                                       state.options.tooltips));
    }
    if (options.onUpdateLinting) options.onUpdateLinting(annotationsNotSorted, annotations, cm);
  }

  function onChange(cm) {
    var state = cm.state.lint;
    clearTimeout(state.timeout);
    state.timeout = setTimeout(function(){startLinting(cm);}, state.options.delay || 500);
  }

  function popupSpanTooltip(ann, e) {
    var target = e.target || e.srcElement;
    showTooltipFor(e, annotationTooltip(ann), target);
  }

  function onMouseOver(cm, e) {
    var target = e.target || e.srcElement;
    if (!/\bCodeMirror-lint-mark-/.test(target.className)) return;
    var box = target.getBoundingClientRect(), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
    var spans = cm.findMarksAt(cm.coordsChar({left: x, top: y}, "client"));
    for (var i = 0; i < spans.length; ++i) {
      var ann = spans[i].__annotation;
      if (ann) return popupSpanTooltip(ann, e);
    }
  }

  CodeMirror.defineOption("lint", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      clearMarks(cm);
      cm.off("change", onChange);
      CodeMirror.off(cm.getWrapperElement(), "mouseover", cm.state.lint.onMouseOver);
      delete cm.state.lint;
    }

    if (val) {
      var gutters = cm.getOption("gutters"), hasLintGutter = false;
      for (var i = 0; i < gutters.length; ++i) if (gutters[i] == GUTTER_ID) hasLintGutter = true;
      var state = cm.state.lint = new LintState(cm, parseOptions(cm, val), hasLintGutter);
      cm.on("change", onChange);
      if (state.options.tooltips != false)
        CodeMirror.on(cm.getWrapperElement(), "mouseover", state.onMouseOver);

      startLinting(cm);
    }
  });
});

},{"../../lib/codemirror":11}],8:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var Pos = CodeMirror.Pos;

  function SearchCursor(doc, query, pos, caseFold) {
    this.atOccurrence = false; this.doc = doc;
    if (caseFold == null && typeof query == "string") caseFold = false;

    pos = pos ? doc.clipPos(pos) : Pos(0, 0);
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") { // Regexp match
      if (!query.global) query = new RegExp(query.source, query.ignoreCase ? "ig" : "g");
      this.matches = function(reverse, pos) {
        if (reverse) {
          query.lastIndex = 0;
          var line = doc.getLine(pos.line).slice(0, pos.ch), cutOff = 0, match, start;
          for (;;) {
            query.lastIndex = cutOff;
            var newMatch = query.exec(line);
            if (!newMatch) break;
            match = newMatch;
            start = match.index;
            cutOff = match.index + (match[0].length || 1);
            if (cutOff == line.length) break;
          }
          var matchLen = (match && match[0].length) || 0;
          if (!matchLen) {
            if (start == 0 && line.length == 0) {match = undefined;}
            else if (start != doc.getLine(pos.line).length) {
              matchLen++;
            }
          }
        } else {
          query.lastIndex = pos.ch;
          var line = doc.getLine(pos.line), match = query.exec(line);
          var matchLen = (match && match[0].length) || 0;
          var start = match && match.index;
          if (start + matchLen != line.length && !matchLen) matchLen = 1;
        }
        if (match && matchLen)
          return {from: Pos(pos.line, start),
                  to: Pos(pos.line, start + matchLen),
                  match: match};
      };
    } else { // String query
      var origQuery = query;
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1) {
        if (!query.length) {
          // Empty string would match anything and never progress, so
          // we define it to match nothing instead.
          this.matches = function() {};
        } else {
          this.matches = function(reverse, pos) {
            if (reverse) {
              var orig = doc.getLine(pos.line).slice(0, pos.ch), line = fold(orig);
              var match = line.lastIndexOf(query);
              if (match > -1) {
                match = adjustPos(orig, line, match);
                return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
              }
             } else {
               var orig = doc.getLine(pos.line).slice(pos.ch), line = fold(orig);
               var match = line.indexOf(query);
               if (match > -1) {
                 match = adjustPos(orig, line, match) + pos.ch;
                 return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
               }
            }
          };
        }
      } else {
        var origTarget = origQuery.split("\n");
        this.matches = function(reverse, pos) {
          var last = target.length - 1;
          if (reverse) {
            if (pos.line - (target.length - 1) < doc.firstLine()) return;
            if (fold(doc.getLine(pos.line).slice(0, origTarget[last].length)) != target[target.length - 1]) return;
            var to = Pos(pos.line, origTarget[last].length);
            for (var ln = pos.line - 1, i = last - 1; i >= 1; --i, --ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            var line = doc.getLine(ln), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            return {from: Pos(ln, cut), to: to};
          } else {
            if (pos.line + (target.length - 1) > doc.lastLine()) return;
            var line = doc.getLine(pos.line), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            var from = Pos(pos.line, cut);
            for (var ln = pos.line + 1, i = 1; i < last; ++i, ++ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            if (fold(doc.getLine(ln).slice(0, origTarget[last].length)) != target[last]) return;
            return {from: from, to: Pos(ln, origTarget[last].length)};
          }
        };
      }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.doc.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = Pos(line, 0);
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = Pos(pos.line-1, this.doc.getLine(pos.line-1).length);
        }
        else {
          var maxLine = this.doc.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = Pos(pos.line + 1, 0);
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText) {
      if (!this.atOccurrence) return;
      var lines = CodeMirror.splitLines(newText);
      this.doc.replaceRange(lines, this.pos.from, this.pos.to);
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
    }
  };

  // Maps a position in a case-folded line back to a position in the original line
  // (compensating for codepoints increasing in number during folding)
  function adjustPos(orig, folded, pos) {
    if (orig.length == folded.length) return pos;
    for (var pos1 = Math.min(pos, orig.length);;) {
      var len1 = orig.slice(0, pos1).toLowerCase().length;
      if (len1 < pos) ++pos1;
      else if (len1 > pos) --pos1;
      else return pos1;
    }
  }

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold);
  });
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });

  CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
    var ranges = [], next;
    var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold);
    while (next = cur.findNext()) {
      if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break;
      ranges.push({anchor: cur.from(), head: cur.to()});
    }
    if (ranges.length)
      this.setSelections(ranges, 0);
  });
});

},{"../../lib/codemirror":11}],9:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Because sometimes you need to style the cursor's line.
//
// Adds an option 'styleActiveLine' which, when enabled, gives the
// active line's wrapping <div> the CSS class "CodeMirror-activeline",
// and gives its background <div> the class "CodeMirror-activeline-background".

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";

  CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      cm.state.activeLines = [];
      updateActiveLines(cm, cm.listSelections());
      cm.on("beforeSelectionChange", selectionChange);
    } else if (!val && prev) {
      cm.off("beforeSelectionChange", selectionChange);
      clearActiveLines(cm);
      delete cm.state.activeLines;
    }
  });

  function clearActiveLines(cm) {
    for (var i = 0; i < cm.state.activeLines.length; i++) {
      cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
    }
  }

  function sameArray(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++)
      if (a[i] != b[i]) return false;
    return true;
  }

  function updateActiveLines(cm, ranges) {
    var active = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (!range.empty()) continue;
      var line = cm.getLineHandleVisualStart(range.head.line);
      if (active[active.length - 1] != line) active.push(line);
    }
    if (sameArray(cm.state.activeLines, active)) return;
    cm.operation(function() {
      clearActiveLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], "wrap", WRAP_CLASS);
        cm.addLineClass(active[i], "background", BACK_CLASS);
      }
      cm.state.activeLines = active;
    });
  }

  function selectionChange(cm, sel) {
    updateActiveLines(cm, sel.ranges);
  }
});

},{"../../lib/codemirror":11}],10:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// A rough approximation of Sublime Text's keybindings
// Depends on addon/search/searchcursor.js and optionally addon/dialog/dialogs.js

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../lib/codemirror"), require("../addon/search/searchcursor"), require("../addon/edit/matchbrackets"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../lib/codemirror", "../addon/search/searchcursor", "../addon/edit/matchbrackets"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var map = CodeMirror.keyMap.sublime = {fallthrough: "default"};
  var cmds = CodeMirror.commands;
  var Pos = CodeMirror.Pos;
  var mac = CodeMirror.keyMap["default"] == CodeMirror.keyMap.macDefault;
  var ctrl = mac ? "Cmd-" : "Ctrl-";

  // This is not exactly Sublime's algorithm. I couldn't make heads or tails of that.
  function findPosSubword(doc, start, dir) {
    if (dir < 0 && start.ch == 0) return doc.clipPos(Pos(start.line - 1));
    var line = doc.getLine(start.line);
    if (dir > 0 && start.ch >= line.length) return doc.clipPos(Pos(start.line + 1, 0));
    var state = "start", type;
    for (var pos = start.ch, e = dir < 0 ? 0 : line.length, i = 0; pos != e; pos += dir, i++) {
      var next = line.charAt(dir < 0 ? pos - 1 : pos);
      var cat = next != "_" && CodeMirror.isWordChar(next) ? "w" : "o";
      if (cat == "w" && next.toUpperCase() == next) cat = "W";
      if (state == "start") {
        if (cat != "o") { state = "in"; type = cat; }
      } else if (state == "in") {
        if (type != cat) {
          if (type == "w" && cat == "W" && dir < 0) pos--;
          if (type == "W" && cat == "w" && dir > 0) { type = "w"; continue; }
          break;
        }
      }
    }
    return Pos(start.line, pos);
  }

  function moveSubword(cm, dir) {
    cm.extendSelectionsBy(function(range) {
      if (cm.display.shift || cm.doc.extend || range.empty())
        return findPosSubword(cm.doc, range.head, dir);
      else
        return dir < 0 ? range.from() : range.to();
    });
  }

  cmds[map["Alt-Left"] = "goSubwordLeft"] = function(cm) { moveSubword(cm, -1); };
  cmds[map["Alt-Right"] = "goSubwordRight"] = function(cm) { moveSubword(cm, 1); };

  cmds[map[ctrl + "Up"] = "scrollLineUp"] = function(cm) {
    var info = cm.getScrollInfo();
    if (!cm.somethingSelected()) {
      var visibleBottomLine = cm.lineAtHeight(info.top + info.clientHeight, "local");
      if (cm.getCursor().line >= visibleBottomLine)
        cm.execCommand("goLineUp");
    }
    cm.scrollTo(null, info.top - cm.defaultTextHeight());
  };
  cmds[map[ctrl + "Down"] = "scrollLineDown"] = function(cm) {
    var info = cm.getScrollInfo();
    if (!cm.somethingSelected()) {
      var visibleTopLine = cm.lineAtHeight(info.top, "local")+1;
      if (cm.getCursor().line <= visibleTopLine)
        cm.execCommand("goLineDown");
    }
    cm.scrollTo(null, info.top + cm.defaultTextHeight());
  };

  cmds[map["Shift-" + ctrl + "L"] = "splitSelectionByLine"] = function(cm) {
    var ranges = cm.listSelections(), lineRanges = [];
    for (var i = 0; i < ranges.length; i++) {
      var from = ranges[i].from(), to = ranges[i].to();
      for (var line = from.line; line <= to.line; ++line)
        if (!(to.line > from.line && line == to.line && to.ch == 0))
          lineRanges.push({anchor: line == from.line ? from : Pos(line, 0),
                           head: line == to.line ? to : Pos(line)});
    }
    cm.setSelections(lineRanges, 0);
  };

  map["Shift-Tab"] = "indentLess";

  cmds[map["Esc"] = "singleSelectionTop"] = function(cm) {
    var range = cm.listSelections()[0];
    cm.setSelection(range.anchor, range.head, {scroll: false});
  };

  cmds[map[ctrl + "L"] = "selectLine"] = function(cm) {
    var ranges = cm.listSelections(), extended = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      extended.push({anchor: Pos(range.from().line, 0),
                     head: Pos(range.to().line + 1, 0)});
    }
    cm.setSelections(extended);
  };

  map["Shift-" + ctrl + "K"] = "deleteLine";

  function insertLine(cm, above) {
    cm.operation(function() {
      var len = cm.listSelections().length, newSelection = [], last = -1;
      for (var i = 0; i < len; i++) {
        var head = cm.listSelections()[i].head;
        if (head.line <= last) continue;
        var at = Pos(head.line + (above ? 0 : 1), 0);
        cm.replaceRange("\n", at, null, "+insertLine");
        cm.indentLine(at.line, null, true);
        newSelection.push({head: at, anchor: at});
        last = head.line + 1;
      }
      cm.setSelections(newSelection);
    });
  }

  cmds[map[ctrl + "Enter"] = "insertLineAfter"] = function(cm) { insertLine(cm, false); };

  cmds[map["Shift-" + ctrl + "Enter"] = "insertLineBefore"] = function(cm) { insertLine(cm, true); };

  function wordAt(cm, pos) {
    var start = pos.ch, end = start, line = cm.getLine(pos.line);
    while (start && CodeMirror.isWordChar(line.charAt(start - 1))) --start;
    while (end < line.length && CodeMirror.isWordChar(line.charAt(end))) ++end;
    return {from: Pos(pos.line, start), to: Pos(pos.line, end), word: line.slice(start, end)};
  }

  cmds[map[ctrl + "D"] = "selectNextOccurrence"] = function(cm) {
    var from = cm.getCursor("from"), to = cm.getCursor("to");
    var fullWord = cm.state.sublimeFindFullWord == cm.doc.sel;
    if (CodeMirror.cmpPos(from, to) == 0) {
      var word = wordAt(cm, from);
      if (!word.word) return;
      cm.setSelection(word.from, word.to);
      fullWord = true;
    } else {
      var text = cm.getRange(from, to);
      var query = fullWord ? new RegExp("\\b" + text + "\\b") : text;
      var cur = cm.getSearchCursor(query, to);
      if (cur.findNext()) {
        cm.addSelection(cur.from(), cur.to());
      } else {
        cur = cm.getSearchCursor(query, Pos(cm.firstLine(), 0));
        if (cur.findNext())
          cm.addSelection(cur.from(), cur.to());
      }
    }
    if (fullWord)
      cm.state.sublimeFindFullWord = cm.doc.sel;
  };

  var mirror = "(){}[]";
  function selectBetweenBrackets(cm) {
    var pos = cm.getCursor(), opening = cm.scanForBracket(pos, -1);
    if (!opening) return;
    for (;;) {
      var closing = cm.scanForBracket(pos, 1);
      if (!closing) return;
      if (closing.ch == mirror.charAt(mirror.indexOf(opening.ch) + 1)) {
        cm.setSelection(Pos(opening.pos.line, opening.pos.ch + 1), closing.pos, false);
        return true;
      }
      pos = Pos(closing.pos.line, closing.pos.ch + 1);
    }
  }

  cmds[map["Shift-" + ctrl + "Space"] = "selectScope"] = function(cm) {
    selectBetweenBrackets(cm) || cm.execCommand("selectAll");
  };
  cmds[map["Shift-" + ctrl + "M"] = "selectBetweenBrackets"] = function(cm) {
    if (!selectBetweenBrackets(cm)) return CodeMirror.Pass;
  };

  cmds[map[ctrl + "M"] = "goToBracket"] = function(cm) {
    cm.extendSelectionsBy(function(range) {
      var next = cm.scanForBracket(range.head, 1);
      if (next && CodeMirror.cmpPos(next.pos, range.head) != 0) return next.pos;
      var prev = cm.scanForBracket(range.head, -1);
      return prev && Pos(prev.pos.line, prev.pos.ch + 1) || range.head;
    });
  };

  var swapLineCombo = mac ? "Cmd-Ctrl-" : "Shift-Ctrl-";

  cmds[map[swapLineCombo + "Up"] = "swapLineUp"] = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.firstLine() - 1, newSels = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], from = range.from().line - 1, to = range.to().line;
      newSels.push({anchor: Pos(range.anchor.line - 1, range.anchor.ch),
                    head: Pos(range.head.line - 1, range.head.ch)});
      if (range.to().ch == 0 && !range.empty()) --to;
      if (from > at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
    cm.operation(function() {
      for (var i = 0; i < linesToMove.length; i += 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        cm.replaceRange("", Pos(from, 0), Pos(from + 1, 0), "+swapLine");
        if (to > cm.lastLine())
          cm.replaceRange("\n" + line, Pos(cm.lastLine()), null, "+swapLine");
        else
          cm.replaceRange(line + "\n", Pos(to, 0), null, "+swapLine");
      }
      cm.setSelections(newSels);
      cm.scrollIntoView();
    });
  };

  cmds[map[swapLineCombo + "Down"] = "swapLineDown"] = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.lastLine() + 1;
    for (var i = ranges.length - 1; i >= 0; i--) {
      var range = ranges[i], from = range.to().line + 1, to = range.from().line;
      if (range.to().ch == 0 && !range.empty()) from--;
      if (from < at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
    cm.operation(function() {
      for (var i = linesToMove.length - 2; i >= 0; i -= 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        if (from == cm.lastLine())
          cm.replaceRange("", Pos(from - 1), Pos(from), "+swapLine");
        else
          cm.replaceRange("", Pos(from, 0), Pos(from + 1, 0), "+swapLine");
        cm.replaceRange(line + "\n", Pos(to, 0), null, "+swapLine");
      }
      cm.scrollIntoView();
    });
  };

  map[ctrl + "/"] = "toggleComment";

  cmds[map[ctrl + "J"] = "joinLines"] = function(cm) {
    var ranges = cm.listSelections(), joined = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], from = range.from();
      var start = from.line, end = range.to().line;
      while (i < ranges.length - 1 && ranges[i + 1].from().line == end)
        end = ranges[++i].to().line;
      joined.push({start: start, end: end, anchor: !range.empty() && from});
    }
    cm.operation(function() {
      var offset = 0, ranges = [];
      for (var i = 0; i < joined.length; i++) {
        var obj = joined[i];
        var anchor = obj.anchor && Pos(obj.anchor.line - offset, obj.anchor.ch), head;
        for (var line = obj.start; line <= obj.end; line++) {
          var actual = line - offset;
          if (line == obj.end) head = Pos(actual, cm.getLine(actual).length + 1);
          if (actual < cm.lastLine()) {
            cm.replaceRange(" ", Pos(actual), Pos(actual + 1, /^\s*/.exec(cm.getLine(actual + 1))[0].length));
            ++offset;
          }
        }
        ranges.push({anchor: anchor || head, head: head});
      }
      cm.setSelections(ranges, 0);
    });
  };

  cmds[map["Shift-" + ctrl + "D"] = "duplicateLine"] = function(cm) {
    cm.operation(function() {
      var rangeCount = cm.listSelections().length;
      for (var i = 0; i < rangeCount; i++) {
        var range = cm.listSelections()[i];
        if (range.empty())
          cm.replaceRange(cm.getLine(range.head.line) + "\n", Pos(range.head.line, 0));
        else
          cm.replaceRange(cm.getRange(range.from(), range.to()), range.from());
      }
      cm.scrollIntoView();
    });
  };

  map[ctrl + "T"] = "transposeChars";

  function sortLines(cm, caseSensitive) {
    var ranges = cm.listSelections(), toSort = [], selected;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (range.empty()) continue;
      var from = range.from().line, to = range.to().line;
      while (i < ranges.length - 1 && ranges[i + 1].from().line == to)
        to = range[++i].to().line;
      toSort.push(from, to);
    }
    if (toSort.length) selected = true;
    else toSort.push(cm.firstLine(), cm.lastLine());

    cm.operation(function() {
      var ranges = [];
      for (var i = 0; i < toSort.length; i += 2) {
        var from = toSort[i], to = toSort[i + 1];
        var start = Pos(from, 0), end = Pos(to);
        var lines = cm.getRange(start, end, false);
        if (caseSensitive)
          lines.sort();
        else
          lines.sort(function(a, b) {
            var au = a.toUpperCase(), bu = b.toUpperCase();
            if (au != bu) { a = au; b = bu; }
            return a < b ? -1 : a == b ? 0 : 1;
          });
        cm.replaceRange(lines, start, end);
        if (selected) ranges.push({anchor: start, head: end});
      }
      if (selected) cm.setSelections(ranges, 0);
    });
  }

  cmds[map["F9"] = "sortLines"] = function(cm) { sortLines(cm, true); };
  cmds[map[ctrl + "F9"] = "sortLinesInsensitive"] = function(cm) { sortLines(cm, false); };

  cmds[map["F2"] = "nextBookmark"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) while (marks.length) {
      var current = marks.shift();
      var found = current.find();
      if (found) {
        marks.push(current);
        return cm.setSelection(found.from, found.to);
      }
    }
  };

  cmds[map["Shift-F2"] = "prevBookmark"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) while (marks.length) {
      marks.unshift(marks.pop());
      var found = marks[marks.length - 1].find();
      if (!found)
        marks.pop();
      else
        return cm.setSelection(found.from, found.to);
    }
  };

  cmds[map[ctrl + "F2"] = "toggleBookmark"] = function(cm) {
    var ranges = cm.listSelections();
    var marks = cm.state.sublimeBookmarks || (cm.state.sublimeBookmarks = []);
    for (var i = 0; i < ranges.length; i++) {
      var from = ranges[i].from(), to = ranges[i].to();
      var found = cm.findMarks(from, to);
      for (var j = 0; j < found.length; j++) {
        if (found[j].sublimeBookmark) {
          found[j].clear();
          for (var k = 0; k < marks.length; k++)
            if (marks[k] == found[j])
              marks.splice(k--, 1);
          break;
        }
      }
      if (j == found.length)
        marks.push(cm.markText(from, to, {sublimeBookmark: true, clearWhenEmpty: false}));
    }
  };

  cmds[map["Shift-" + ctrl + "F2"] = "clearBookmarks"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) for (var i = 0; i < marks.length; i++) marks[i].clear();
    marks.length = 0;
  };

  cmds[map["Alt-F2"] = "selectBookmarks"] = function(cm) {
    var marks = cm.state.sublimeBookmarks, ranges = [];
    if (marks) for (var i = 0; i < marks.length; i++) {
      var found = marks[i].find();
      if (!found)
        marks.splice(i--, 0);
      else
        ranges.push({anchor: found.from, head: found.to});
    }
    if (ranges.length)
      cm.setSelections(ranges, 0);
  };

  map["Alt-Q"] = "wrapLines";

  var cK = ctrl + "K ";

  function modifyWordOrSelection(cm, mod) {
    cm.operation(function() {
      var ranges = cm.listSelections(), indices = [], replacements = [];
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.empty()) { indices.push(i); replacements.push(""); }
        else replacements.push(mod(cm.getRange(range.from(), range.to())));
      }
      cm.replaceSelections(replacements, "around", "case");
      for (var i = indices.length - 1, at; i >= 0; i--) {
        var range = ranges[indices[i]];
        if (at && CodeMirror.cmpPos(range.head, at) > 0) continue;
        var word = wordAt(cm, range.head);
        at = word.from;
        cm.replaceRange(mod(word.word), word.from, word.to);
      }
    });
  }

  map[cK + ctrl + "Backspace"] = "delLineLeft";

  cmds[map[cK + ctrl + "K"] = "delLineRight"] = function(cm) {
    cm.operation(function() {
      var ranges = cm.listSelections();
      for (var i = ranges.length - 1; i >= 0; i--)
        cm.replaceRange("", ranges[i].anchor, Pos(ranges[i].to().line), "+delete");
      cm.scrollIntoView();
    });
  };

  cmds[map[cK + ctrl + "U"] = "upcaseAtCursor"] = function(cm) {
    modifyWordOrSelection(cm, function(str) { return str.toUpperCase(); });
  };
  cmds[map[cK + ctrl + "L"] = "downcaseAtCursor"] = function(cm) {
    modifyWordOrSelection(cm, function(str) { return str.toLowerCase(); });
  };

  cmds[map[cK + ctrl + "Space"] = "setSublimeMark"] = function(cm) {
    if (cm.state.sublimeMark) cm.state.sublimeMark.clear();
    cm.state.sublimeMark = cm.setBookmark(cm.getCursor());
  };
  cmds[map[cK + ctrl + "A"] = "selectToSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) cm.setSelection(cm.getCursor(), found);
  };
  cmds[map[cK + ctrl + "W"] = "deleteToSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) {
      var from = cm.getCursor(), to = found;
      if (CodeMirror.cmpPos(from, to) > 0) { var tmp = to; to = from; from = tmp; }
      cm.state.sublimeKilled = cm.getRange(from, to);
      cm.replaceRange("", from, to);
    }
  };
  cmds[map[cK + ctrl + "X"] = "swapWithSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) {
      cm.state.sublimeMark.clear();
      cm.state.sublimeMark = cm.setBookmark(cm.getCursor());
      cm.setCursor(found);
    }
  };
  cmds[map[cK + ctrl + "Y"] = "sublimeYank"] = function(cm) {
    if (cm.state.sublimeKilled != null)
      cm.replaceSelection(cm.state.sublimeKilled, null, "paste");
  };

  map[cK + ctrl + "G"] = "clearBookmarks";
  cmds[map[cK + ctrl + "C"] = "showInCenter"] = function(cm) {
    var pos = cm.cursorCoords(null, "local");
    cm.scrollTo(null, (pos.top + pos.bottom) / 2 - cm.getScrollInfo().clientHeight / 2);
  };

  cmds[map["Shift-Alt-Up"] = "selectLinesUpward"] = function(cm) {
    cm.operation(function() {
      var ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.head.line > cm.firstLine())
          cm.addSelection(Pos(range.head.line - 1, range.head.ch));
      }
    });
  };
  cmds[map["Shift-Alt-Down"] = "selectLinesDownward"] = function(cm) {
    cm.operation(function() {
      var ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.head.line < cm.lastLine())
          cm.addSelection(Pos(range.head.line + 1, range.head.ch));
      }
    });
  };

  function getTarget(cm) {
    var from = cm.getCursor("from"), to = cm.getCursor("to");
    if (CodeMirror.cmpPos(from, to) == 0) {
      var word = wordAt(cm, from);
      if (!word.word) return;
      from = word.from;
      to = word.to;
    }
    return {from: from, to: to, query: cm.getRange(from, to), word: word};
  }

  function findAndGoTo(cm, forward) {
    var target = getTarget(cm);
    if (!target) return;
    var query = target.query;
    var cur = cm.getSearchCursor(query, forward ? target.to : target.from);

    if (forward ? cur.findNext() : cur.findPrevious()) {
      cm.setSelection(cur.from(), cur.to());
    } else {
      cur = cm.getSearchCursor(query, forward ? Pos(cm.firstLine(), 0)
                                              : cm.clipPos(Pos(cm.lastLine())));
      if (forward ? cur.findNext() : cur.findPrevious())
        cm.setSelection(cur.from(), cur.to());
      else if (target.word)
        cm.setSelection(target.from, target.to);
    }
  };
  cmds[map[ctrl + "F3"] = "findUnder"] = function(cm) { findAndGoTo(cm, true); };
  cmds[map["Shift-" + ctrl + "F3"] = "findUnderPrevious"] = function(cm) { findAndGoTo(cm,false); };
  cmds[map["Alt-F3"] = "findAllUnder"] = function(cm) {
    var target = getTarget(cm);
    if (!target) return;
    var cur = cm.getSearchCursor(target.query);
    var matches = [];
    var primaryIndex = -1;
    while (cur.findNext()) {
      matches.push({anchor: cur.from(), head: cur.to()});
      if (cur.from().line <= target.from.line && cur.from().ch <= target.from.ch)
        primaryIndex++;
    }
    cm.setSelections(matches, primaryIndex);
  };

  map["Shift-" + ctrl + "["] = "fold";
  map["Shift-" + ctrl + "]"] = "unfold";
  map[cK + ctrl + "0"] = map[cK + ctrl + "j"] = "unfoldAll";

  map[ctrl + "I"] = "findIncremental";
  map["Shift-" + ctrl + "I"] = "findIncrementalReverse";
  map[ctrl + "H"] = "replace";
  map["F3"] = "findNext";
  map["Shift-F3"] = "findPrev";

  CodeMirror.normalizeKeyMap(map);
});

},{"../addon/edit/matchbrackets":5,"../addon/search/searchcursor":8,"../lib/codemirror":11}],11:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod();
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod);
  else // Plain browser env
    this.CodeMirror = mod();
})(function() {
  "use strict";

  // BROWSER SNIFFING

  // Kludges for bugs and behavior differences that can't be feature
  // detected are enabled based on userAgent etc sniffing.

  var gecko = /gecko\/\d/i.test(navigator.userAgent);
  var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  var ie = ie_upto10 || ie_11up;
  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1]);
  var webkit = /WebKit\//.test(navigator.userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
  var chrome = /Chrome\//.test(navigator.userAgent);
  var presto = /Opera\//.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
  var phantom = /PhantomJS/.test(navigator.userAgent);

  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var windows = /win/i.test(navigator.platform);

  var presto_version = presto && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
  if (presto_version) presto_version = Number(presto_version[1]);
  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
  var captureRightClick = gecko || (ie && ie_version >= 9);

  // Optimize some code when these features are not used.
  var sawReadOnlySpans = false, sawCollapsedSpans = false;

  // EDITOR CONSTRUCTOR

  // A CodeMirror instance represents an editor. This is the object
  // that user code is usually dealing with.

  function CodeMirror(place, options) {
    if (!(this instanceof CodeMirror)) return new CodeMirror(place, options);

    this.options = options = options ? copyObj(options) : {};
    // Determine effective options based on given values and defaults.
    copyObj(defaults, options, false);
    setGuttersForLineNumbers(options);

    var doc = options.value;
    if (typeof doc == "string") doc = new Doc(doc, options.mode);
    this.doc = doc;

    var input = new CodeMirror.inputStyles[options.inputStyle](this);
    var display = this.display = new Display(place, doc, input);
    display.wrapper.CodeMirror = this;
    updateGutters(this);
    themeChanged(this);
    if (options.lineWrapping)
      this.display.wrapper.className += " CodeMirror-wrap";
    if (options.autofocus && !mobile) display.input.focus();
    initScrollbars(this);

    this.state = {
      keyMaps: [],  // stores maps added by addKeyMap
      overlays: [], // highlighting overlays, as added by addOverlay
      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
      overwrite: false, focused: false,
      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
      pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
      draggingText: false,
      highlight: new Delayed(), // stores highlight worker timeout
      keySeq: null  // Unfinished key sequence
    };

    var cm = this;

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie && ie_version < 11) setTimeout(function() { cm.display.input.reset(true); }, 20);

    registerEventHandlers(this);
    ensureGlobalHandlers();

    startOperation(this);
    this.curOp.forceUpdate = true;
    attachDoc(this, doc);

    if ((options.autofocus && !mobile) || cm.hasFocus())
      setTimeout(bind(onFocus, this), 20);
    else
      onBlur(this);

    for (var opt in optionHandlers) if (optionHandlers.hasOwnProperty(opt))
      optionHandlers[opt](this, options[opt], Init);
    maybeUpdateLineNumberWidth(this);
    if (options.finishInit) options.finishInit(this);
    for (var i = 0; i < initHooks.length; ++i) initHooks[i](this);
    endOperation(this);
    // Suppress optimizelegibility in Webkit, since it breaks text
    // measuring on line wrapping boundaries.
    if (webkit && options.lineWrapping &&
        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
      display.lineDiv.style.textRendering = "auto";
  }

  // DISPLAY CONSTRUCTOR

  // The display handles the DOM integration, both for input reading
  // and content drawing. It holds references to DOM nodes and
  // display-related state.

  function Display(place, doc, input) {
    var d = this;
    this.input = input;

    // Covers bottom-right square when both scrollbars are present.
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
    d.scrollbarFiller.setAttribute("cm-not-content", "true");
    // Covers bottom of gutter when coverGutterNextToScrollbar is on
    // and h scrollbar is present.
    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
    d.gutterFiller.setAttribute("cm-not-content", "true");
    // Will contain the actual code, positioned to cover the viewport.
    d.lineDiv = elt("div", null, "CodeMirror-code");
    // Elements are added to these to represent selection and cursors.
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
    // A visibility: hidden element used to find the size of things.
    d.measure = elt("div", null, "CodeMirror-measure");
    // When lines outside of the viewport are measured, they are drawn in this.
    d.lineMeasure = elt("div", null, "CodeMirror-measure");
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = elt("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                      null, "position: relative; outline: none");
    // Moved around its parent to cover visible view.
    d.mover = elt("div", [elt("div", [d.lineSpace], "CodeMirror-lines")], null, "position: relative");
    // Set to the height of the document, allowing scrolling.
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
    d.sizerWidth = null;
    // Behavior of elts with overflow: auto and padding is
    // inconsistent across browsers. This is used to ensure the
    // scrollable area is big enough.
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
    // Will contain the gutters, if any.
    d.gutters = elt("div", null, "CodeMirror-gutters");
    d.lineGutter = null;
    // Actual scrollable element.
    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
    d.scroller.setAttribute("tabIndex", "-1");
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
    if (!webkit && !(gecko && mobile)) d.scroller.draggable = true;

    if (place) {
      if (place.appendChild) place.appendChild(d.wrapper);
      else place(d.wrapper);
    }

    // Current rendered range (may be bigger than the view window).
    d.viewFrom = d.viewTo = doc.first;
    d.reportedViewFrom = d.reportedViewTo = doc.first;
    // Information about the rendered lines.
    d.view = [];
    d.renderedView = null;
    // Holds info about a single rendered line when it was rendered
    // for measurement, while not in view.
    d.externalMeasured = null;
    // Empty space (in pixels) above the view
    d.viewOffset = 0;
    d.lastWrapHeight = d.lastWrapWidth = 0;
    d.updateLineNumbers = null;

    d.nativeBarWidth = d.barHeight = d.barWidth = 0;
    d.scrollbarsClipped = false;

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // Set to true when a non-horizontal-scrolling line widget is
    // added. As an optimization, line widget aligning is skipped when
    // this is false.
    d.alignWidgets = false;

    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

    // True when shift is held down.
    d.shift = false;

    // Used to track whether anything happened since the context menu
    // was opened.
    d.selForContextMenu = null;

    d.activeTouch = null;

    input.init(d);
  }

  // STATE UPDATES

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
    resetModeState(cm);
  }

  function resetModeState(cm) {
    cm.doc.iter(function(line) {
      if (line.stateAfter) line.stateAfter = null;
      if (line.styles) line.styles = null;
    });
    cm.doc.frontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp) regChange(cm);
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      addClass(cm.display.wrapper, "CodeMirror-wrap");
      cm.display.sizer.style.minWidth = "";
      cm.display.sizerWidth = null;
    } else {
      rmClass(cm.display.wrapper, "CodeMirror-wrap");
      findMaxLine(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function(){updateScrollbars(cm);}, 100);
  }

  // Returns a function that estimates the height of a line, to use as
  // first approximation until the line becomes visible (and is thus
  // properly measurable).
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function(line) {
      if (lineIsHidden(cm.doc, line)) return 0;

      var widgetsHeight = 0;
      if (line.widgets) for (var i = 0; i < line.widgets.length; i++) {
        if (line.widgets[i].height) widgetsHeight += line.widgets[i].height;
      }

      if (wrapping)
        return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th;
      else
        return widgetsHeight + th;
    };
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function(line) {
      var estHeight = est(line);
      if (estHeight != line.height) updateLineHeight(line, estHeight);
    });
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    clearCaches(cm);
  }

  function guttersChanged(cm) {
    updateGutters(cm);
    regChange(cm);
    setTimeout(function(){alignHorizontally(cm);}, 20);
  }

  // Rebuild the gutter elements, ensure the margin to the left of the
  // code matches their width.
  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters;
    removeChildren(gutters);
    for (var i = 0; i < specs.length; ++i) {
      var gutterClass = specs[i];
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
      if (gutterClass == "CodeMirror-linenumbers") {
        cm.display.lineGutter = gElt;
        gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
      }
    }
    gutters.style.display = i ? "" : "none";
    updateGutterSpace(cm);
  }

  function updateGutterSpace(cm) {
    var width = cm.display.gutters.offsetWidth;
    cm.display.sizer.style.marginLeft = width + "px";
  }

  // Compute the character length of a line, taking into account
  // collapsed ranges (see markText) that might hide parts, and join
  // other lines onto it.
  function lineLength(line) {
    if (line.height == 0) return 0;
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find(0, true);
      cur = found.from.line;
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found = merged.find(0, true);
      len -= cur.text.length - found.from.ch;
      cur = found.to.line;
      len += cur.text.length - found.to.ch;
    }
    return len;
  }

  // Find the longest line in the document.
  function findMaxLine(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function(line) {
      var len = lineLength(line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }

  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = indexOf(options.gutters, "CodeMirror-linenumbers");
    if (found == -1 && options.lineNumbers) {
      options.gutters = options.gutters.concat(["CodeMirror-linenumbers"]);
    } else if (found > -1 && !options.lineNumbers) {
      options.gutters = options.gutters.slice(0);
      options.gutters.splice(found, 1);
    }
  }

  // SCROLLBARS

  // Prepare DOM reads needed to update the scrollbars. Done in one
  // shot to minimize update/measure roundtrips.
  function measureForScrollbars(cm) {
    var d = cm.display, gutterW = d.gutters.offsetWidth;
    var docH = Math.round(cm.doc.height + paddingVert(cm.display));
    return {
      clientHeight: d.scroller.clientHeight,
      viewHeight: d.wrapper.clientHeight,
      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
      viewWidth: d.wrapper.clientWidth,
      barLeft: cm.options.fixedGutter ? gutterW : 0,
      docHeight: docH,
      scrollHeight: docH + scrollGap(cm) + d.barHeight,
      nativeBarWidth: d.nativeBarWidth,
      gutterWidth: gutterW
    };
  }

  function NativeScrollbars(place, scroll, cm) {
    this.cm = cm;
    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
    place(vert); place(horiz);

    on(vert, "scroll", function() {
      if (vert.clientHeight) scroll(vert.scrollTop, "vertical");
    });
    on(horiz, "scroll", function() {
      if (horiz.clientWidth) scroll(horiz.scrollLeft, "horizontal");
    });

    this.checkedOverlay = false;
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    if (ie && ie_version < 8) this.horiz.style.minHeight = this.vert.style.minWidth = "18px";
  }

  NativeScrollbars.prototype = copyObj({
    update: function(measure) {
      var needsH = measure.scrollWidth > measure.clientWidth + 1;
      var needsV = measure.scrollHeight > measure.clientHeight + 1;
      var sWidth = measure.nativeBarWidth;

      if (needsV) {
        this.vert.style.display = "block";
        this.vert.style.bottom = needsH ? sWidth + "px" : "0";
        var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
        // A bug in IE8 can cause this value to be negative, so guard it.
        this.vert.firstChild.style.height =
          Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
      } else {
        this.vert.style.display = "";
        this.vert.firstChild.style.height = "0";
      }

      if (needsH) {
        this.horiz.style.display = "block";
        this.horiz.style.right = needsV ? sWidth + "px" : "0";
        this.horiz.style.left = measure.barLeft + "px";
        var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
        this.horiz.firstChild.style.width =
          (measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
      } else {
        this.horiz.style.display = "";
        this.horiz.firstChild.style.width = "0";
      }

      if (!this.checkedOverlay && measure.clientHeight > 0) {
        if (sWidth == 0) this.overlayHack();
        this.checkedOverlay = true;
      }

      return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0};
    },
    setScrollLeft: function(pos) {
      if (this.horiz.scrollLeft != pos) this.horiz.scrollLeft = pos;
    },
    setScrollTop: function(pos) {
      if (this.vert.scrollTop != pos) this.vert.scrollTop = pos;
    },
    overlayHack: function() {
      var w = mac && !mac_geMountainLion ? "12px" : "18px";
      this.horiz.style.minHeight = this.vert.style.minWidth = w;
      var self = this;
      var barMouseDown = function(e) {
        if (e_target(e) != self.vert && e_target(e) != self.horiz)
          operation(self.cm, onMouseDown)(e);
      };
      on(this.vert, "mousedown", barMouseDown);
      on(this.horiz, "mousedown", barMouseDown);
    },
    clear: function() {
      var parent = this.horiz.parentNode;
      parent.removeChild(this.horiz);
      parent.removeChild(this.vert);
    }
  }, NativeScrollbars.prototype);

  function NullScrollbars() {}

  NullScrollbars.prototype = copyObj({
    update: function() { return {bottom: 0, right: 0}; },
    setScrollLeft: function() {},
    setScrollTop: function() {},
    clear: function() {}
  }, NullScrollbars.prototype);

  CodeMirror.scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

  function initScrollbars(cm) {
    if (cm.display.scrollbars) {
      cm.display.scrollbars.clear();
      if (cm.display.scrollbars.addClass)
        rmClass(cm.display.wrapper, cm.display.scrollbars.addClass);
    }

    cm.display.scrollbars = new CodeMirror.scrollbarModel[cm.options.scrollbarStyle](function(node) {
      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
      // Prevent clicks in the scrollbars from killing focus
      on(node, "mousedown", function() {
        if (cm.state.focused) setTimeout(function() { cm.display.input.focus(); }, 0);
      });
      node.setAttribute("cm-not-content", "true");
    }, function(pos, axis) {
      if (axis == "horizontal") setScrollLeft(cm, pos);
      else setScrollTop(cm, pos);
    }, cm);
    if (cm.display.scrollbars.addClass)
      addClass(cm.display.wrapper, cm.display.scrollbars.addClass);
  }

  function updateScrollbars(cm, measure) {
    if (!measure) measure = measureForScrollbars(cm);
    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
    updateScrollbarsInner(cm, measure);
    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
        updateHeightsInViewport(cm);
      updateScrollbarsInner(cm, measureForScrollbars(cm));
      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
    }
  }

  // Re-synchronize the fake scrollbars with the actual size of the
  // content.
  function updateScrollbarsInner(cm, measure) {
    var d = cm.display;
    var sizes = d.scrollbars.update(measure);

    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";

    if (sizes.right && sizes.bottom) {
      d.scrollbarFiller.style.display = "block";
      d.scrollbarFiller.style.height = sizes.bottom + "px";
      d.scrollbarFiller.style.width = sizes.right + "px";
    } else d.scrollbarFiller.style.display = "";
    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = "block";
      d.gutterFiller.style.height = sizes.bottom + "px";
      d.gutterFiller.style.width = measure.gutterWidth + "px";
    } else d.gutterFiller.style.display = "";
  }

  // Compute the lines that are visible in a given viewport (defaults
  // the the current scroll position). viewport may contain top,
  // height, and ensure (see op.scrollToPos) properties.
  function visibleLines(display, doc, viewport) {
    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
    top = Math.floor(top - paddingTop(display));
    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
    // forces those lines into the viewport (if possible).
    if (viewport && viewport.ensure) {
      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
      if (ensureFrom < from) {
        from = ensureFrom;
        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
        to = ensureTo;
      }
    }
    return {from: from, to: Math.max(to, from + 1)};
  }

  // LINE NUMBERS

  // Re-align line numbers and gutter marks to compensate for
  // horizontal scrolling.
  function alignHorizontally(cm) {
    var display = cm.display, view = display.view;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) return;
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, left = comp + "px";
    for (var i = 0; i < view.length; i++) if (!view[i].hidden) {
      if (cm.options.fixedGutter && view[i].gutter)
        view[i].gutter.style.left = left;
      var align = view[i].alignable;
      if (align) for (var j = 0; j < align.length; j++)
        align[j].style.left = left;
    }
    if (cm.options.fixedGutter)
      display.gutters.style.left = (comp + gutterW) + "px";
  }

  // Used to ensure that the line number gutter is still the right
  // size for the current document size. Returns true when an update
  // is needed.
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) return false;
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = "";
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding);
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + "px";
      updateGutterSpace(cm);
      return true;
    }
    return false;
  }

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber));
  }

  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
  // but using getBoundingClientRect to get a sub-pixel-accurate
  // result.
  function compensateForHScroll(display) {
    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left;
  }

  // DISPLAY DRAWING

  function DisplayUpdate(cm, viewport, force) {
    var display = cm.display;

    this.viewport = viewport;
    // Store some values that we'll need later (but don't want to force a relayout for)
    this.visible = visibleLines(display, cm.doc, viewport);
    this.editorIsHidden = !display.wrapper.offsetWidth;
    this.wrapperHeight = display.wrapper.clientHeight;
    this.wrapperWidth = display.wrapper.clientWidth;
    this.oldDisplayWidth = displayWidth(cm);
    this.force = force;
    this.dims = getDimensions(cm);
    this.events = [];
  }

  DisplayUpdate.prototype.signal = function(emitter, type) {
    if (hasHandler(emitter, type))
      this.events.push(arguments);
  };
  DisplayUpdate.prototype.finish = function() {
    for (var i = 0; i < this.events.length; i++)
      signal.apply(null, this.events[i]);
  };

  function maybeClipScrollbars(cm) {
    var display = cm.display;
    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
      display.heightForcer.style.height = scrollGap(cm) + "px";
      display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
      display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
      display.scrollbarsClipped = true;
    }
  }

  // Does the actual updating of the line display. Bails out
  // (returning false) when there is nothing to be done and forced is
  // false.
  function updateDisplayIfNeeded(cm, update) {
    var display = cm.display, doc = cm.doc;

    if (update.editorIsHidden) {
      resetView(cm);
      return false;
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (!update.force &&
        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
        display.renderedView == display.view && countDirtyView(cm) == 0)
      return false;

    if (maybeUpdateLineNumberWidth(cm)) {
      resetView(cm);
      update.dims = getDimensions(cm);
    }

    // Compute a suitable new viewport (from & to)
    var end = doc.first + doc.size;
    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
    if (display.viewFrom < from && from - display.viewFrom < 20) from = Math.max(doc.first, display.viewFrom);
    if (display.viewTo > to && display.viewTo - to < 20) to = Math.min(end, display.viewTo);
    if (sawCollapsedSpans) {
      from = visualLineNo(cm.doc, from);
      to = visualLineEndNo(cm.doc, to);
    }

    var different = from != display.viewFrom || to != display.viewTo ||
      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
    adjustView(cm, from, to);

    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
    // Position the mover div to align with the current scroll position
    cm.display.mover.style.top = display.viewOffset + "px";

    var toUpdate = countDirtyView(cm);
    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
      return false;

    // For big changes, we hide the enclosing element during the
    // update, since that speeds up the operations on most browsers.
    var focused = activeElt();
    if (toUpdate > 4) display.lineDiv.style.display = "none";
    patchDisplay(cm, display.updateLineNumbers, update.dims);
    if (toUpdate > 4) display.lineDiv.style.display = "";
    display.renderedView = display.view;
    // There might have been a widget with a focused element that got
    // hidden or updated, if so re-focus it.
    if (focused && activeElt() != focused && focused.offsetHeight) focused.focus();

    // Prevent selection and cursors from interfering with the scroll
    // width and height.
    removeChildren(display.cursorDiv);
    removeChildren(display.selectionDiv);
    display.gutters.style.height = 0;

    if (different) {
      display.lastWrapHeight = update.wrapperHeight;
      display.lastWrapWidth = update.wrapperWidth;
      startWorker(cm, 400);
    }

    display.updateLineNumbers = null;

    return true;
  }

  function postUpdateDisplay(cm, update) {
    var force = update.force, viewport = update.viewport;
    for (var first = true;; first = false) {
      if (first && cm.options.lineWrapping && update.oldDisplayWidth != displayWidth(cm)) {
        force = true;
      } else {
        force = false;
        // Clip forced viewport to actual scrollable area.
        if (viewport && viewport.top != null)
          viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)};
        // Updated line heights might result in the drawn area not
        // actually covering the viewport. Keep looping until it does.
        update.visible = visibleLines(cm.display, cm.doc, viewport);
        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
          break;
      }
      if (!updateDisplayIfNeeded(cm, update)) break;
      updateHeightsInViewport(cm);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
    }

    update.signal(cm, "update", cm);
    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
    }
  }

  function updateDisplaySimple(cm, viewport) {
    var update = new DisplayUpdate(cm, viewport);
    if (updateDisplayIfNeeded(cm, update)) {
      updateHeightsInViewport(cm);
      postUpdateDisplay(cm, update);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
      update.finish();
    }
  }

  function setDocumentHeight(cm, measure) {
    cm.display.sizer.style.minHeight = measure.docHeight + "px";
    var total = measure.docHeight + cm.display.barHeight;
    cm.display.heightForcer.style.top = total + "px";
    cm.display.gutters.style.height = Math.max(total + scrollGap(cm), measure.clientHeight) + "px";
  }

  // Read the actual heights of the rendered lines, and update their
  // stored heights to match.
  function updateHeightsInViewport(cm) {
    var display = cm.display;
    var prevBottom = display.lineDiv.offsetTop;
    for (var i = 0; i < display.view.length; i++) {
      var cur = display.view[i], height;
      if (cur.hidden) continue;
      if (ie && ie_version < 8) {
        var bot = cur.node.offsetTop + cur.node.offsetHeight;
        height = bot - prevBottom;
        prevBottom = bot;
      } else {
        var box = cur.node.getBoundingClientRect();
        height = box.bottom - box.top;
      }
      var diff = cur.line.height - height;
      if (height < 2) height = textHeight(display);
      if (diff > .001 || diff < -.001) {
        updateLineHeight(cur.line, height);
        updateWidgetHeight(cur.line);
        if (cur.rest) for (var j = 0; j < cur.rest.length; j++)
          updateWidgetHeight(cur.rest[j]);
      }
    }
  }

  // Read and store the height of line widgets associated with the
  // given line.
  function updateWidgetHeight(line) {
    if (line.widgets) for (var i = 0; i < line.widgets.length; ++i)
      line.widgets[i].height = line.widgets[i].node.offsetHeight;
  }

  // Do a bulk-read of the DOM positions and sizes needed to draw the
  // view, so that we don't interleave reading and writing to the DOM.
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    var gutterLeft = d.gutters.clientLeft;
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
      width[cm.options.gutters[i]] = n.clientWidth;
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth};
  }

  // Sync the actual display DOM structure with display.view, removing
  // nodes for lines that are no longer in view, and creating the ones
  // that are not there yet, and updating the ones that are out of
  // date.
  function patchDisplay(cm, updateNumbersFrom, dims) {
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    var container = display.lineDiv, cur = container.firstChild;

    function rm(node) {
      var next = node.nextSibling;
      // Works around a throw-scroll bug in OS X Webkit
      if (webkit && mac && cm.display.currentWheelTarget == node)
        node.style.display = "none";
      else
        node.parentNode.removeChild(node);
      return next;
    }

    var view = display.view, lineN = display.viewFrom;
    // Loop over the elements in the view, syncing cur (the DOM nodes
    // in display.lineDiv) with the view as we go.
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (lineView.hidden) {
      } else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
        var node = buildLineElement(cm, lineView, lineN, dims);
        container.insertBefore(node, cur);
      } else { // Already drawn
        while (cur != lineView.node) cur = rm(cur);
        var updateNumber = lineNumbers && updateNumbersFrom != null &&
          updateNumbersFrom <= lineN && lineView.lineNumber;
        if (lineView.changes) {
          if (indexOf(lineView.changes, "gutter") > -1) updateNumber = false;
          updateLineForChanges(cm, lineView, lineN, dims);
        }
        if (updateNumber) {
          removeChildren(lineView.lineNumber);
          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
        }
        cur = lineView.node.nextSibling;
      }
      lineN += lineView.size;
    }
    while (cur) cur = rm(cur);
  }

  // When an aspect of a line changes, a string is added to
  // lineView.changes. This updates the relevant part of the line's
  // DOM structure.
  function updateLineForChanges(cm, lineView, lineN, dims) {
    for (var j = 0; j < lineView.changes.length; j++) {
      var type = lineView.changes[j];
      if (type == "text") updateLineText(cm, lineView);
      else if (type == "gutter") updateLineGutter(cm, lineView, lineN, dims);
      else if (type == "class") updateLineClasses(lineView);
      else if (type == "widget") updateLineWidgets(cm, lineView, dims);
    }
    lineView.changes = null;
  }

  // Lines with gutter elements, widgets or a background class need to
  // be wrapped, and have the extra elements added to the wrapper div
  function ensureLineWrapped(lineView) {
    if (lineView.node == lineView.text) {
      lineView.node = elt("div", null, null, "position: relative");
      if (lineView.text.parentNode)
        lineView.text.parentNode.replaceChild(lineView.node, lineView.text);
      lineView.node.appendChild(lineView.text);
      if (ie && ie_version < 8) lineView.node.style.zIndex = 2;
    }
    return lineView.node;
  }

  function updateLineBackground(lineView) {
    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
    if (cls) cls += " CodeMirror-linebackground";
    if (lineView.background) {
      if (cls) lineView.background.className = cls;
      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
    } else if (cls) {
      var wrap = ensureLineWrapped(lineView);
      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
    }
  }

  // Wrapper around buildLineContent which will reuse the structure
  // in display.externalMeasured when possible.
  function getLineContent(cm, lineView) {
    var ext = cm.display.externalMeasured;
    if (ext && ext.line == lineView.line) {
      cm.display.externalMeasured = null;
      lineView.measure = ext.measure;
      return ext.built;
    }
    return buildLineContent(cm, lineView);
  }

  // Redraw the line's text. Interacts with the background and text
  // classes because the mode may output tokens that influence these
  // classes.
  function updateLineText(cm, lineView) {
    var cls = lineView.text.className;
    var built = getLineContent(cm, lineView);
    if (lineView.text == lineView.node) lineView.node = built.pre;
    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
    lineView.text = built.pre;
    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
      lineView.bgClass = built.bgClass;
      lineView.textClass = built.textClass;
      updateLineClasses(lineView);
    } else if (cls) {
      lineView.text.className = cls;
    }
  }

  function updateLineClasses(lineView) {
    updateLineBackground(lineView);
    if (lineView.line.wrapClass)
      ensureLineWrapped(lineView).className = lineView.line.wrapClass;
    else if (lineView.node != lineView.text)
      lineView.node.className = "";
    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
    lineView.text.className = textClass || "";
  }

  function updateLineGutter(cm, lineView, lineN, dims) {
    if (lineView.gutter) {
      lineView.node.removeChild(lineView.gutter);
      lineView.gutter = null;
    }
    var markers = lineView.line.gutterMarkers;
    if (cm.options.lineNumbers || markers) {
      var wrap = ensureLineWrapped(lineView);
      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", "left: " +
                                             (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) +
                                             "px; width: " + dims.gutterTotalWidth + "px");
      cm.display.input.setUneditable(gutterWrap);
      wrap.insertBefore(gutterWrap, lineView.text);
      if (lineView.line.gutterClass)
        gutterWrap.className += " " + lineView.line.gutterClass;
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        lineView.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineN),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: "
              + cm.display.lineNumInnerWidth + "px"));
      if (markers) for (var k = 0; k < cm.options.gutters.length; ++k) {
        var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
        if (found)
          gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt", "left: " +
                                     dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
      }
    }
  }

  function updateLineWidgets(cm, lineView, dims) {
    if (lineView.alignable) lineView.alignable = null;
    for (var node = lineView.node.firstChild, next; node; node = next) {
      var next = node.nextSibling;
      if (node.className == "CodeMirror-linewidget")
        lineView.node.removeChild(node);
    }
    insertLineWidgets(cm, lineView, dims);
  }

  // Build a line's DOM representation from scratch
  function buildLineElement(cm, lineView, lineN, dims) {
    var built = getLineContent(cm, lineView);
    lineView.text = lineView.node = built.pre;
    if (built.bgClass) lineView.bgClass = built.bgClass;
    if (built.textClass) lineView.textClass = built.textClass;

    updateLineClasses(lineView);
    updateLineGutter(cm, lineView, lineN, dims);
    insertLineWidgets(cm, lineView, dims);
    return lineView.node;
  }

  // A lineView may contain multiple logical lines (when merged by
  // collapsed spans). The widgets for all of them need to be drawn.
  function insertLineWidgets(cm, lineView, dims) {
    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
    if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
      insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false);
  }

  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
    if (!line.widgets) return;
    var wrap = ensureLineWrapped(lineView);
    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
      if (!widget.handleMouseEvents) node.setAttribute("cm-ignore-events", "true");
      positionLineWidget(widget, node, lineView, dims);
      cm.display.input.setUneditable(node);
      if (allowAbove && widget.above)
        wrap.insertBefore(node, lineView.gutter || lineView.text);
      else
        wrap.appendChild(node);
      signalLater(widget, "redraw");
    }
  }

  function positionLineWidget(widget, node, lineView, dims) {
    if (widget.noHScroll) {
      (lineView.alignable || (lineView.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + "px";
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + "px";
      }
      node.style.width = width + "px";
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = "relative";
      if (!widget.noHScroll) node.style.marginLeft = -dims.gutterTotalWidth + "px";
    }
  }

  // POSITION OBJECT

  // A Pos instance represents a position within the text.
  var Pos = CodeMirror.Pos = function(line, ch) {
    if (!(this instanceof Pos)) return new Pos(line, ch);
    this.line = line; this.ch = ch;
  };

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  var cmp = CodeMirror.cmpPos = function(a, b) { return a.line - b.line || a.ch - b.ch; };

  function copyPos(x) {return Pos(x.line, x.ch);}
  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a; }
  function minPos(a, b) { return cmp(a, b) < 0 ? a : b; }

  // INPUT HANDLING

  function ensureFocus(cm) {
    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
  }

  function isReadOnly(cm) {
    return cm.options.readOnly || cm.doc.cantEdit;
  }

  // This will be set to an array of strings when copying, so that,
  // when pasting, we know what kind of selections the copied text
  // was made out of.
  var lastCopied = null;

  function applyTextInput(cm, inserted, deleted, sel) {
    var doc = cm.doc;
    cm.display.shift = false;
    if (!sel) sel = doc.sel;

    var textLines = splitLines(inserted), multiPaste = null;
    // When pasing N lines into N selections, insert one line per selection
    if (cm.state.pasteIncoming && sel.ranges.length > 1) {
      if (lastCopied && lastCopied.join("\n") == inserted)
        multiPaste = sel.ranges.length % lastCopied.length == 0 && map(lastCopied, splitLines);
      else if (textLines.length == sel.ranges.length)
        multiPaste = map(textLines, function(l) { return [l]; });
    }

    // Normal behavior is to insert the new text into every selection
    for (var i = sel.ranges.length - 1; i >= 0; i--) {
      var range = sel.ranges[i];
      var from = range.from(), to = range.to();
      if (range.empty()) {
        if (deleted && deleted > 0) // Handle deletion
          from = Pos(from.line, from.ch - deleted);
        else if (cm.state.overwrite && !cm.state.pasteIncoming) // Handle overwrite
          to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length));
      }
      var updateInput = cm.curOp.updateInput;
      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i % multiPaste.length] : textLines,
                         origin: cm.state.pasteIncoming ? "paste" : cm.state.cutIncoming ? "cut" : "+input"};
      makeChange(cm.doc, changeEvent);
      signalLater(cm, "inputRead", cm, changeEvent);
      // When an 'electric' character is inserted, immediately trigger a reindent
      if (inserted && !cm.state.pasteIncoming && cm.options.electricChars &&
          cm.options.smartIndent && range.head.ch < 100 &&
          (!i || sel.ranges[i - 1].head.line != range.head.line)) {
        var mode = cm.getModeAt(range.head);
        var end = changeEnd(changeEvent);
        if (mode.electricChars) {
          for (var j = 0; j < mode.electricChars.length; j++)
            if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
              indentLine(cm, end.line, "smart");
              break;
            }
        } else if (mode.electricInput) {
          if (mode.electricInput.test(getLine(doc, end.line).text.slice(0, end.ch)))
            indentLine(cm, end.line, "smart");
        }
      }
    }
    ensureCursorVisible(cm);
    cm.curOp.updateInput = updateInput;
    cm.curOp.typing = true;
    cm.state.pasteIncoming = cm.state.cutIncoming = false;
  }

  function copyableRanges(cm) {
    var text = [], ranges = [];
    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
      var line = cm.doc.sel.ranges[i].head.line;
      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
      ranges.push(lineRange);
      text.push(cm.getRange(lineRange.anchor, lineRange.head));
    }
    return {text: text, ranges: ranges};
  }

  function disableBrowserMagic(field) {
    field.setAttribute("autocorrect", "off");
    field.setAttribute("autocapitalize", "off");
    field.setAttribute("spellcheck", "false");
  }

  // TEXTAREA INPUT STYLE

  function TextareaInput(cm) {
    this.cm = cm;
    // See input.poll and input.reset
    this.prevInput = "";

    // Flag that indicates whether we expect input to appear real soon
    // now (after some event like 'keypress' or 'input') and are
    // polling intensively.
    this.pollingFast = false;
    // Self-resetting timeout for the poller
    this.polling = new Delayed();
    // Tracks when input.reset has punted to just putting a short
    // string into the textarea instead of the full selection.
    this.inaccurateSelection = false;
    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
    this.hasSelection = false;
  };

  function hiddenTextarea() {
    var te = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none");
    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
    // The textarea is kept positioned near the cursor to prevent the
    // fact that it'll be scrolled into view on input from scrolling
    // our fake cursor out of view. On webkit, when wrap=off, paste is
    // very slow. So make the area wide instead.
    if (webkit) te.style.width = "1000px";
    else te.setAttribute("wrap", "off");
    // If border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) te.style.border = "1px solid black";
    disableBrowserMagic(te);
    return div;
  }

  TextareaInput.prototype = copyObj({
    init: function(display) {
      var input = this, cm = this.cm;

      // Wraps and hides input textarea
      var div = this.wrapper = hiddenTextarea();
      // The semihidden textarea that is focused when the editor is
      // focused, and receives input.
      var te = this.textarea = div.firstChild;
      display.wrapper.insertBefore(div, display.wrapper.firstChild);

      // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
      if (ios) te.style.width = "0px";

      on(te, "input", function() {
        if (ie && ie_version >= 9 && input.hasSelection) input.hasSelection = null;
        input.poll();
      });

      on(te, "paste", function() {
        // Workaround for webkit bug https://bugs.webkit.org/show_bug.cgi?id=90206
        // Add a char to the end of textarea before paste occur so that
        // selection doesn't span to the end of textarea.
        if (webkit && !cm.state.fakedLastChar && !(new Date - cm.state.lastMiddleDown < 200)) {
          var start = te.selectionStart, end = te.selectionEnd;
          te.value += "$";
          // The selection end needs to be set before the start, otherwise there
          // can be an intermediate non-empty selection between the two, which
          // can override the middle-click paste buffer on linux and cause the
          // wrong thing to get pasted.
          te.selectionEnd = end;
          te.selectionStart = start;
          cm.state.fakedLastChar = true;
        }
        cm.state.pasteIncoming = true;
        input.fastPoll();
      });

      function prepareCopyCut(e) {
        if (cm.somethingSelected()) {
          lastCopied = cm.getSelections();
          if (input.inaccurateSelection) {
            input.prevInput = "";
            input.inaccurateSelection = false;
            te.value = lastCopied.join("\n");
            selectInput(te);
          }
        } else {
          var ranges = copyableRanges(cm);
          lastCopied = ranges.text;
          if (e.type == "cut") {
            cm.setSelections(ranges.ranges, null, sel_dontScroll);
          } else {
            input.prevInput = "";
            te.value = ranges.text.join("\n");
            selectInput(te);
          }
        }
        if (e.type == "cut") cm.state.cutIncoming = true;
      }
      on(te, "cut", prepareCopyCut);
      on(te, "copy", prepareCopyCut);

      on(display.scroller, "paste", function(e) {
        if (eventInWidget(display, e)) return;
        cm.state.pasteIncoming = true;
        input.focus();
      });

      // Prevent normal selection in the editor (we handle our own)
      on(display.lineSpace, "selectstart", function(e) {
        if (!eventInWidget(display, e)) e_preventDefault(e);
      });
    },

    prepareSelection: function() {
      // Redraw the selection and/or cursor
      var cm = this.cm, display = cm.display, doc = cm.doc;
      var result = prepareSelection(cm);

      // Move the hidden textarea near the cursor to prevent scrolling artifacts
      if (cm.options.moveInputWithCursor) {
        var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
        var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
        result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                            headPos.top + lineOff.top - wrapOff.top));
        result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                             headPos.left + lineOff.left - wrapOff.left));
      }

      return result;
    },

    showSelection: function(drawn) {
      var cm = this.cm, display = cm.display;
      removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
      removeChildrenAndAdd(display.selectionDiv, drawn.selection);
      if (drawn.teTop != null) {
        this.wrapper.style.top = drawn.teTop + "px";
        this.wrapper.style.left = drawn.teLeft + "px";
      }
    },

    // Reset the input to correspond to the selection (or to be empty,
    // when not typing and nothing is selected)
    reset: function(typing) {
      if (this.contextMenuPending) return;
      var minimal, selected, cm = this.cm, doc = cm.doc;
      if (cm.somethingSelected()) {
        this.prevInput = "";
        var range = doc.sel.primary();
        minimal = hasCopyEvent &&
          (range.to().line - range.from().line > 100 || (selected = cm.getSelection()).length > 1000);
        var content = minimal ? "-" : selected || cm.getSelection();
        this.textarea.value = content;
        if (cm.state.focused) selectInput(this.textarea);
        if (ie && ie_version >= 9) this.hasSelection = content;
      } else if (!typing) {
        this.prevInput = this.textarea.value = "";
        if (ie && ie_version >= 9) this.hasSelection = null;
      }
      this.inaccurateSelection = minimal;
    },

    getField: function() { return this.textarea; },

    supportsTouch: function() { return false; },

    focus: function() {
      if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
        try { this.textarea.focus(); }
        catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
      }
    },

    blur: function() { this.textarea.blur(); },

    resetPosition: function() {
      this.wrapper.style.top = this.wrapper.style.left = 0;
    },

    receivedFocus: function() { this.slowPoll(); },

    // Poll for input changes, using the normal rate of polling. This
    // runs as long as the editor is focused.
    slowPoll: function() {
      var input = this;
      if (input.pollingFast) return;
      input.polling.set(this.cm.options.pollInterval, function() {
        input.poll();
        if (input.cm.state.focused) input.slowPoll();
      });
    },

    // When an event has just come in that is likely to add or change
    // something in the input textarea, we poll faster, to ensure that
    // the change appears on the screen quickly.
    fastPoll: function() {
      var missed = false, input = this;
      input.pollingFast = true;
      function p() {
        var changed = input.poll();
        if (!changed && !missed) {missed = true; input.polling.set(60, p);}
        else {input.pollingFast = false; input.slowPoll();}
      }
      input.polling.set(20, p);
    },

    // Read input from the textarea, and update the document to match.
    // When something is selected, it is present in the textarea, and
    // selected (unless it is huge, in which case a placeholder is
    // used). When nothing is selected, the cursor sits after previously
    // seen text (can be empty), which is stored in prevInput (we must
    // not reset the textarea when typing, because that breaks IME).
    poll: function() {
      var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
      // Since this is called a *lot*, try to bail out as cheaply as
      // possible when it is clear that nothing happened. hasSelection
      // will be the case when there is a lot of text in the textarea,
      // in which case reading its value would be expensive.
      if (!cm.state.focused || (hasSelection(input) && !prevInput) ||
          isReadOnly(cm) || cm.options.disableInput || cm.state.keySeq)
        return false;
      // See paste handler for more on the fakedLastChar kludge
      if (cm.state.pasteIncoming && cm.state.fakedLastChar) {
        input.value = input.value.substring(0, input.value.length - 1);
        cm.state.fakedLastChar = false;
      }
      var text = input.value;
      // If nothing changed, bail.
      if (text == prevInput && !cm.somethingSelected()) return false;
      // Work around nonsensical selection resetting in IE9/10, and
      // inexplicable appearance of private area unicode characters on
      // some key combos in Mac (#2689).
      if (ie && ie_version >= 9 && this.hasSelection === text ||
          mac && /[\uf700-\uf7ff]/.test(text)) {
        cm.display.input.reset();
        return false;
      }

      if (text.charCodeAt(0) == 0x200b && cm.doc.sel == cm.display.selForContextMenu && !prevInput)
        prevInput = "\u200b";
      // Find the part of the input that is actually new
      var same = 0, l = Math.min(prevInput.length, text.length);
      while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) ++same;

      var self = this;
      runInOp(cm, function() {
        applyTextInput(cm, text.slice(same), prevInput.length - same);

        // Don't leave long text in the textarea, since it makes further polling slow
        if (text.length > 1000 || text.indexOf("\n") > -1) input.value = self.prevInput = "";
        else self.prevInput = text;
      });
      return true;
    },

    ensurePolled: function() {
      if (this.pollingFast && this.poll()) this.pollingFast = false;
    },

    onKeyPress: function() {
      if (ie && ie_version >= 9) this.hasSelection = null;
      this.fastPoll();
    },

    onContextMenu: function(e) {
      var input = this, cm = input.cm, display = cm.display, te = input.textarea;
      var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
      if (!pos || presto) return; // Opera is difficult.

      // Reset the current text selection only if the click is done outside of the selection
      // and 'resetSelectionOnContextMenu' option is true.
      var reset = cm.options.resetSelectionOnContextMenu;
      if (reset && cm.doc.sel.contains(pos) == -1)
        operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll);

      var oldCSS = te.style.cssText;
      input.wrapper.style.position = "absolute";
      te.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) +
        "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: " +
        (ie ? "rgba(255, 255, 255, .05)" : "transparent") +
        "; outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
      if (webkit) var oldScrollY = window.scrollY; // Work around Chrome issue (#2712)
      display.input.focus();
      if (webkit) window.scrollTo(null, oldScrollY);
      display.input.reset();
      // Adds "Select all" to context menu in FF
      if (!cm.somethingSelected()) te.value = input.prevInput = " ";
      input.contextMenuPending = true;
      display.selForContextMenu = cm.doc.sel;
      clearTimeout(display.detectingSelectAll);

      // Select-all will be greyed out if there's nothing to select, so
      // this adds a zero-width space so that we can later check whether
      // it got selected.
      function prepareSelectAllHack() {
        if (te.selectionStart != null) {
          var selected = cm.somethingSelected();
          var extval = te.value = "\u200b" + (selected ? te.value : "");
          input.prevInput = selected ? "" : "\u200b";
          te.selectionStart = 1; te.selectionEnd = extval.length;
          // Re-set this, in case some other handler touched the
          // selection in the meantime.
          display.selForContextMenu = cm.doc.sel;
        }
      }
      function rehide() {
        input.contextMenuPending = false;
        input.wrapper.style.position = "relative";
        te.style.cssText = oldCSS;
        if (ie && ie_version < 9) display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos);

        // Try to detect the user choosing select-all
        if (te.selectionStart != null) {
          if (!ie || (ie && ie_version < 9)) prepareSelectAllHack();
          var i = 0, poll = function() {
            if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0)
              operation(cm, commands.selectAll)(cm);
            else if (i++ < 10) display.detectingSelectAll = setTimeout(poll, 500);
            else display.input.reset();
          };
          display.detectingSelectAll = setTimeout(poll, 200);
        }
      }

      if (ie && ie_version >= 9) prepareSelectAllHack();
      if (captureRightClick) {
        e_stop(e);
        var mouseup = function() {
          off(window, "mouseup", mouseup);
          setTimeout(rehide, 20);
        };
        on(window, "mouseup", mouseup);
      } else {
        setTimeout(rehide, 50);
      }
    },

    setUneditable: nothing,

    needsContentAttribute: false
  }, TextareaInput.prototype);

  // CONTENTEDITABLE INPUT STYLE

  function ContentEditableInput(cm) {
    this.cm = cm;
    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
    this.polling = new Delayed();
  }

  ContentEditableInput.prototype = copyObj({
    init: function(display) {
      var input = this, cm = input.cm;
      var div = input.div = display.lineDiv;
      div.contentEditable = "true";
      disableBrowserMagic(div);

      on(div, "paste", function(e) {
        var pasted = e.clipboardData && e.clipboardData.getData("text/plain");
        if (pasted) {
          e.preventDefault();
          cm.replaceSelection(pasted, null, "paste");
        }
      });

      on(div, "compositionstart", function(e) {
        var data = e.data;
        input.composing = {sel: cm.doc.sel, data: data, startData: data};
        if (!data) return;
        var prim = cm.doc.sel.primary();
        var line = cm.getLine(prim.head.line);
        var found = line.indexOf(data, Math.max(0, prim.head.ch - data.length));
        if (found > -1 && found <= prim.head.ch)
          input.composing.sel = simpleSelection(Pos(prim.head.line, found),
                                                Pos(prim.head.line, found + data.length));
      });
      on(div, "compositionupdate", function(e) {
        input.composing.data = e.data;
      });
      on(div, "compositionend", function(e) {
        var ours = input.composing;
        if (!ours) return;
        if (e.data != ours.startData && !/\u200b/.test(e.data))
          ours.data = e.data;
        // Need a small delay to prevent other code (input event,
        // selection polling) from doing damage when fired right after
        // compositionend.
        setTimeout(function() {
          if (!ours.handled)
            input.applyComposition(ours);
          if (input.composing == ours)
            input.composing = null;
        }, 50);
      });

      on(div, "touchstart", function() {
        input.forceCompositionEnd();
      });

      on(div, "input", function() {
        if (input.composing) return;
        if (!input.pollContent())
          runInOp(input.cm, function() {regChange(cm);});
      });

      function onCopyCut(e) {
        if (cm.somethingSelected()) {
          lastCopied = cm.getSelections();
          if (e.type == "cut") cm.replaceSelection("", null, "cut");
        } else {
          var ranges = copyableRanges(cm);
          lastCopied = ranges.text;
          if (e.type == "cut") {
            cm.operation(function() {
              cm.setSelections(ranges.ranges, 0, sel_dontScroll);
              cm.replaceSelection("", null, "cut");
            });
          }
        }
        // iOS exposes the clipboard API, but seems to discard content inserted into it
        if (e.clipboardData && !ios) {
          e.preventDefault();
          e.clipboardData.clearData();
          e.clipboardData.setData("text/plain", lastCopied.join("\n"));
        } else {
          // Old-fashioned briefly-focus-a-textarea hack
          var kludge = hiddenTextarea(), te = kludge.firstChild;
          cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
          te.value = lastCopied.join("\n");
          var hadFocus = document.activeElement;
          selectInput(te);
          setTimeout(function() {
            cm.display.lineSpace.removeChild(kludge);
            hadFocus.focus();
          }, 50);
        }
      }
      on(div, "copy", onCopyCut);
      on(div, "cut", onCopyCut);
    },

    prepareSelection: function() {
      var result = prepareSelection(this.cm, false);
      result.focus = this.cm.state.focused;
      return result;
    },

    showSelection: function(info) {
      if (!info || !this.cm.display.view.length) return;
      if (info.focus) this.showPrimarySelection();
      this.showMultipleSelections(info);
    },

    showPrimarySelection: function() {
      var sel = window.getSelection(), prim = this.cm.doc.sel.primary();
      var curAnchor = domToPos(this.cm, sel.anchorNode, sel.anchorOffset);
      var curFocus = domToPos(this.cm, sel.focusNode, sel.focusOffset);
      if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
          cmp(minPos(curAnchor, curFocus), prim.from()) == 0 &&
          cmp(maxPos(curAnchor, curFocus), prim.to()) == 0)
        return;

      var start = posToDOM(this.cm, prim.from());
      var end = posToDOM(this.cm, prim.to());
      if (!start && !end) return;

      var view = this.cm.display.view;
      var old = sel.rangeCount && sel.getRangeAt(0);
      if (!start) {
        start = {node: view[0].measure.map[2], offset: 0};
      } else if (!end) { // FIXME dangerously hacky
        var measure = view[view.length - 1].measure;
        var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
        end = {node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3]};
      }

      try { var rng = range(start.node, start.offset, end.offset, end.node); }
      catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
      if (rng) {
        sel.removeAllRanges();
        sel.addRange(rng);
        if (old && sel.anchorNode == null) sel.addRange(old);
      }
      this.rememberSelection();
    },

    showMultipleSelections: function(info) {
      removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
      removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
    },

    rememberSelection: function() {
      var sel = window.getSelection();
      this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
      this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
    },

    selectionInEditor: function() {
      var sel = window.getSelection();
      if (!sel.rangeCount) return false;
      var node = sel.getRangeAt(0).commonAncestorContainer;
      return contains(this.div, node);
    },

    focus: function() {
      if (this.cm.options.readOnly != "nocursor") this.div.focus();
    },
    blur: function() { this.div.blur(); },
    getField: function() { return this.div; },

    supportsTouch: function() { return true; },

    receivedFocus: function() {
      var input = this;
      if (this.selectionInEditor())
        this.pollSelection();
      else
        runInOp(this.cm, function() { input.cm.curOp.selectionChanged = true; });

      function poll() {
        if (input.cm.state.focused) {
          input.pollSelection();
          input.polling.set(input.cm.options.pollInterval, poll);
        }
      }
      this.polling.set(this.cm.options.pollInterval, poll);
    },

    pollSelection: function() {
      if (this.composing) return;

      var sel = window.getSelection(), cm = this.cm;
      if (sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
          sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset) {
        this.rememberSelection();
        var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
        var head = domToPos(cm, sel.focusNode, sel.focusOffset);
        if (anchor && head) runInOp(cm, function() {
          setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
          if (anchor.bad || head.bad) cm.curOp.selectionChanged = true;
        });
      }
    },

    pollContent: function() {
      var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
      var from = sel.from(), to = sel.to();
      if (from.line < display.viewFrom || to.line > display.viewTo - 1) return false;

      var fromIndex;
      if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
        var fromLine = lineNo(display.view[0].line);
        var fromNode = display.view[0].node;
      } else {
        var fromLine = lineNo(display.view[fromIndex].line);
        var fromNode = display.view[fromIndex - 1].node.nextSibling;
      }
      var toIndex = findViewIndex(cm, to.line);
      if (toIndex == display.view.length - 1) {
        var toLine = display.viewTo - 1;
        var toNode = display.view[toIndex].node;
      } else {
        var toLine = lineNo(display.view[toIndex + 1].line) - 1;
        var toNode = display.view[toIndex + 1].node.previousSibling;
      }

      var newText = splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
      var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
      while (newText.length > 1 && oldText.length > 1) {
        if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
        else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
        else break;
      }

      var cutFront = 0, cutEnd = 0;
      var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
      while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
        ++cutFront;
      var newBot = lst(newText), oldBot = lst(oldText);
      var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                               oldBot.length - (oldText.length == 1 ? cutFront : 0));
      while (cutEnd < maxCutEnd &&
             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
        ++cutEnd;

      newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd);
      newText[0] = newText[0].slice(cutFront);

      var chFrom = Pos(fromLine, cutFront);
      var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
      if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
        replaceRange(cm.doc, newText, chFrom, chTo, "+input");
        return true;
      }
    },

    ensurePolled: function() {
      this.forceCompositionEnd();
    },
    reset: function() {
      this.forceCompositionEnd();
    },
    forceCompositionEnd: function() {
      if (!this.composing || this.composing.handled) return;
      this.applyComposition(this.composing);
      this.composing.handled = true;
      this.div.blur();
      this.div.focus();
    },
    applyComposition: function(composing) {
      if (composing.data && composing.data != composing.startData)
        operation(this.cm, applyTextInput)(this.cm, composing.data, 0, composing.sel);
    },

    setUneditable: function(node) {
      node.setAttribute("contenteditable", "false");
    },

    onKeyPress: function(e) {
      e.preventDefault();
      operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0);
    },

    onContextMenu: nothing,
    resetPosition: nothing,

    needsContentAttribute: true
  }, ContentEditableInput.prototype);

  function posToDOM(cm, pos) {
    var view = findViewForLine(cm, pos.line);
    if (!view || view.hidden) return null;
    var line = getLine(cm.doc, pos.line);
    var info = mapFromLineView(view, line, pos.line);

    var order = getOrder(line), side = "left";
    if (order) {
      var partPos = getBidiPartAt(order, pos.ch);
      side = partPos % 2 ? "right" : "left";
    }
    var result = nodeAndOffsetInLineMap(info.map, pos.ch, "left");
    result.offset = result.collapse == "right" ? result.end : result.start;
    return result;
  }

  function badPos(pos, bad) { if (bad) pos.bad = true; return pos; }

  function domToPos(cm, node, offset) {
    var lineNode;
    if (node == cm.display.lineDiv) {
      lineNode = cm.display.lineDiv.childNodes[offset];
      if (!lineNode) return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true);
      node = null; offset = 0;
    } else {
      for (lineNode = node;; lineNode = lineNode.parentNode) {
        if (!lineNode || lineNode == cm.display.lineDiv) return null;
        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) break;
      }
    }
    for (var i = 0; i < cm.display.view.length; i++) {
      var lineView = cm.display.view[i];
      if (lineView.node == lineNode)
        return locateNodeInLineView(lineView, node, offset);
    }
  }

  function locateNodeInLineView(lineView, node, offset) {
    var wrapper = lineView.text.firstChild, bad = false;
    if (!node || !contains(wrapper, node)) return badPos(Pos(lineNo(lineView.line), 0), true);
    if (node == wrapper) {
      bad = true;
      node = wrapper.childNodes[offset];
      offset = 0;
      if (!node) {
        var line = lineView.rest ? lst(lineView.rest) : lineView.line;
        return badPos(Pos(lineNo(line), line.text.length), bad);
      }
    }

    var textNode = node.nodeType == 3 ? node : null, topNode = node;
    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
      textNode = node.firstChild;
      if (offset) offset = textNode.nodeValue.length;
    }
    while (topNode.parentNode != wrapper) topNode = topNode.parentNode;
    var measure = lineView.measure, maps = measure.maps;

    function find(textNode, topNode, offset) {
      for (var i = -1; i < (maps ? maps.length : 0); i++) {
        var map = i < 0 ? measure.map : maps[i];
        for (var j = 0; j < map.length; j += 3) {
          var curNode = map[j + 2];
          if (curNode == textNode || curNode == topNode) {
            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
            var ch = map[j] + offset;
            if (offset < 0 || curNode != textNode) ch = map[j + (offset ? 1 : 0)];
            return Pos(line, ch);
          }
        }
      }
    }
    var found = find(textNode, topNode, offset);
    if (found) return badPos(found, bad);

    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
      found = find(after, after.firstChild, 0);
      if (found)
        return badPos(Pos(found.line, found.ch - dist), bad);
      else
        dist += after.textContent.length;
    }
    for (var before = topNode.previousSibling, dist = offset; before; before = before.previousSibling) {
      found = find(before, before.firstChild, -1);
      if (found)
        return badPos(Pos(found.line, found.ch + dist), bad);
      else
        dist += after.textContent.length;
    }
  }

  function domTextBetween(cm, from, to, fromLine, toLine) {
    var text = "", closing = false;
    function recognizeMarker(id) { return function(marker) { return marker.id == id; }; }
    function walk(node) {
      if (node.nodeType == 1) {
        var cmText = node.getAttribute("cm-text");
        if (cmText != null) {
          if (cmText == "") cmText = node.textContent.replace(/\u200b/g, "");
          text += cmText;
          return;
        }
        var markerID = node.getAttribute("cm-marker"), range;
        if (markerID) {
          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
          if (found.length && (range = found[0].find()))
            text += getBetween(cm.doc, range.from, range.to).join("\n");
          return;
        }
        if (node.getAttribute("contenteditable") == "false") return;
        for (var i = 0; i < node.childNodes.length; i++)
          walk(node.childNodes[i]);
        if (/^(pre|div|p)$/i.test(node.nodeName))
          closing = true;
      } else if (node.nodeType == 3) {
        var val = node.nodeValue;
        if (!val) return;
        if (closing) {
          text += "\n";
          closing = false;
        }
        text += val;
      }
    }
    for (;;) {
      walk(from);
      if (from == to) break;
      from = from.nextSibling;
    }
    return text;
  }

  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

  // SELECTION / CURSOR

  // Selection objects are immutable. A new one is created every time
  // the selection changes. A selection is one or more non-overlapping
  // (and non-touching) ranges, sorted, and an integer that indicates
  // which one is the primary selection (the one that's scrolled into
  // view, that getCursor returns, etc).
  function Selection(ranges, primIndex) {
    this.ranges = ranges;
    this.primIndex = primIndex;
  }

  Selection.prototype = {
    primary: function() { return this.ranges[this.primIndex]; },
    equals: function(other) {
      if (other == this) return true;
      if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
      for (var i = 0; i < this.ranges.length; i++) {
        var here = this.ranges[i], there = other.ranges[i];
        if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) return false;
      }
      return true;
    },
    deepCopy: function() {
      for (var out = [], i = 0; i < this.ranges.length; i++)
        out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
      return new Selection(out, this.primIndex);
    },
    somethingSelected: function() {
      for (var i = 0; i < this.ranges.length; i++)
        if (!this.ranges[i].empty()) return true;
      return false;
    },
    contains: function(pos, end) {
      if (!end) end = pos;
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
          return i;
      }
      return -1;
    }
  };

  function Range(anchor, head) {
    this.anchor = anchor; this.head = head;
  }

  Range.prototype = {
    from: function() { return minPos(this.anchor, this.head); },
    to: function() { return maxPos(this.anchor, this.head); },
    empty: function() {
      return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
    }
  };

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).
  function normalizeSelection(ranges, primIndex) {
    var prim = ranges[primIndex];
    ranges.sort(function(a, b) { return cmp(a.from(), b.from()); });
    primIndex = indexOf(ranges, prim);
    for (var i = 1; i < ranges.length; i++) {
      var cur = ranges[i], prev = ranges[i - 1];
      if (cmp(prev.to(), cur.from()) >= 0) {
        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
        if (i <= primIndex) --primIndex;
        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
      }
    }
    return new Selection(ranges, primIndex);
  }

  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0);
  }

  // Most of the external API clips given positions to make sure they
  // actually exist within the document.
  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) return Pos(doc.first, 0);
    var last = doc.first + doc.size - 1;
    if (pos.line > last) return Pos(last, getLine(doc, last).text.length);
    return clipToLen(pos, getLine(doc, pos.line).text.length);
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) return Pos(pos.line, linelen);
    else if (ch < 0) return Pos(pos.line, 0);
    else return pos;
  }
  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size;}
  function clipPosArray(doc, array) {
    for (var out = [], i = 0; i < array.length; i++) out[i] = clipPos(doc, array[i]);
    return out;
  }

  // SELECTION UPDATES

  // The 'scroll' parameter given to many of these indicated whether
  // the new cursor position should be scrolled into view after
  // modifying the selection.

  // If shift is held or the extend flag is set, extends a range to
  // include a given position (and optionally a second position).
  // Otherwise, simply returns the range between the given positions.
  // Used for cursor motion and such.
  function extendRange(doc, range, head, other) {
    if (doc.cm && doc.cm.display.shift || doc.extend) {
      var anchor = range.anchor;
      if (other) {
        var posBefore = cmp(head, anchor) < 0;
        if (posBefore != (cmp(other, anchor) < 0)) {
          anchor = head;
          head = other;
        } else if (posBefore != (cmp(head, other) < 0)) {
          head = other;
        }
      }
      return new Range(anchor, head);
    } else {
      return new Range(other || head, head);
    }
  }

  // Extend the primary selection range, discard the rest.
  function extendSelection(doc, head, other, options) {
    setSelection(doc, new Selection([extendRange(doc, doc.sel.primary(), head, other)], 0), options);
  }

  // Extend all selections (pos is an array of selections with length
  // equal the number of selections)
  function extendSelections(doc, heads, options) {
    for (var out = [], i = 0; i < doc.sel.ranges.length; i++)
      out[i] = extendRange(doc, doc.sel.ranges[i], heads[i], null);
    var newSel = normalizeSelection(out, doc.sel.primIndex);
    setSelection(doc, newSel, options);
  }

  // Updates a single range in the selection.
  function replaceOneSelection(doc, i, range, options) {
    var ranges = doc.sel.ranges.slice(0);
    ranges[i] = range;
    setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options);
  }

  // Reset the selection to a single range.
  function setSimpleSelection(doc, anchor, head, options) {
    setSelection(doc, simpleSelection(anchor, head), options);
  }

  // Give beforeSelectionChange handlers a change to influence a
  // selection update.
  function filterSelectionChange(doc, sel) {
    var obj = {
      ranges: sel.ranges,
      update: function(ranges) {
        this.ranges = [];
        for (var i = 0; i < ranges.length; i++)
          this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                     clipPos(doc, ranges[i].head));
      }
    };
    signal(doc, "beforeSelectionChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
    if (obj.ranges != sel.ranges) return normalizeSelection(obj.ranges, obj.ranges.length - 1);
    else return sel;
  }

  function setSelectionReplaceHistory(doc, sel, options) {
    var done = doc.history.done, last = lst(done);
    if (last && last.ranges) {
      done[done.length - 1] = sel;
      setSelectionNoUndo(doc, sel, options);
    } else {
      setSelection(doc, sel, options);
    }
  }

  // Set a new selection.
  function setSelection(doc, sel, options) {
    setSelectionNoUndo(doc, sel, options);
    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
  }

  function setSelectionNoUndo(doc, sel, options) {
    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
      sel = filterSelectionChange(doc, sel);

    var bias = options && options.bias ||
      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

    if (!(options && options.scroll === false) && doc.cm)
      ensureCursorVisible(doc.cm);
  }

  function setSelectionInner(doc, sel) {
    if (sel.equals(doc.sel)) return;

    doc.sel = sel;

    if (doc.cm) {
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true;
      signalCursorActivity(doc.cm);
    }
    signalLater(doc, "cursorActivity", doc);
  }

  // Verify that the selection does not partially select any atomic
  // marked ranges.
  function reCheckSelection(doc) {
    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false), sel_dontScroll);
  }

  // Return a selection that does not partially select any atomic
  // ranges.
  function skipAtomicInSelection(doc, sel, bias, mayClear) {
    var out;
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i];
      var newAnchor = skipAtomic(doc, range.anchor, bias, mayClear);
      var newHead = skipAtomic(doc, range.head, bias, mayClear);
      if (out || newAnchor != range.anchor || newHead != range.head) {
        if (!out) out = sel.ranges.slice(0, i);
        out[i] = new Range(newAnchor, newHead);
      }
    }
    return out ? normalizeSelection(out, sel.primIndex) : sel;
  }

  // Ensure a given position is not inside an atomic range.
  function skipAtomic(doc, pos, bias, mayClear) {
    var flipped = false, curPos = pos;
    var dir = bias || 1;
    doc.cantEdit = false;
    search: for (;;) {
      var line = getLine(doc, curPos.line);
      if (line.markedSpans) {
        for (var i = 0; i < line.markedSpans.length; ++i) {
          var sp = line.markedSpans[i], m = sp.marker;
          if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) &&
              (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
            if (mayClear) {
              signal(m, "beforeCursorEnter");
              if (m.explicitlyCleared) {
                if (!line.markedSpans) break;
                else {--i; continue;}
              }
            }
            if (!m.atomic) continue;
            var newPos = m.find(dir < 0 ? -1 : 1);
            if (cmp(newPos, curPos) == 0) {
              newPos.ch += dir;
              if (newPos.ch < 0) {
                if (newPos.line > doc.first) newPos = clipPos(doc, Pos(newPos.line - 1));
                else newPos = null;
              } else if (newPos.ch > line.text.length) {
                if (newPos.line < doc.first + doc.size - 1) newPos = Pos(newPos.line + 1, 0);
                else newPos = null;
              }
              if (!newPos) {
                if (flipped) {
                  // Driven in a corner -- no valid cursor position found at all
                  // -- try again *with* clearing, if we didn't already
                  if (!mayClear) return skipAtomic(doc, pos, bias, true);
                  // Otherwise, turn off editing until further notice, and return the start of the doc
                  doc.cantEdit = true;
                  return Pos(doc.first, 0);
                }
                flipped = true; newPos = pos; dir = -dir;
              }
            }
            curPos = newPos;
            continue search;
          }
        }
      }
      return curPos;
    }
  }

  // SELECTION DRAWING

  function updateSelection(cm) {
    cm.display.input.showSelection(cm.display.input.prepareSelection());
  }

  function prepareSelection(cm, primary) {
    var doc = cm.doc, result = {};
    var curFragment = result.cursors = document.createDocumentFragment();
    var selFragment = result.selection = document.createDocumentFragment();

    for (var i = 0; i < doc.sel.ranges.length; i++) {
      if (primary === false && i == doc.sel.primIndex) continue;
      var range = doc.sel.ranges[i];
      var collapsed = range.empty();
      if (collapsed || cm.options.showCursorWhenSelecting)
        drawSelectionCursor(cm, range, curFragment);
      if (!collapsed)
        drawSelectionRange(cm, range, selFragment);
    }
    return result;
  }

  // Draws a cursor for the given range
  function drawSelectionCursor(cm, range, output) {
    var pos = cursorCoords(cm, range.head, "div", null, null, !cm.options.singleCursorHeightPerLine);

    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
    cursor.style.left = pos.left + "px";
    cursor.style.top = pos.top + "px";
    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

    if (pos.other) {
      // Secondary cursor, shown when on a 'jump' in bi-directional text
      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
      otherCursor.style.display = "";
      otherCursor.style.left = pos.other.left + "px";
      otherCursor.style.top = pos.other.top + "px";
      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
    }
  }

  // Draws the given range as a highlighted selection
  function drawSelectionRange(cm, range, output) {
    var display = cm.display, doc = cm.doc;
    var fragment = document.createDocumentFragment();
    var padding = paddingH(cm.display), leftSide = padding.left;
    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;

    function add(left, top, width, bottom) {
      if (top < 0) top = 0;
      top = Math.round(top);
      bottom = Math.round(bottom);
      fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left +
                               "px; top: " + top + "px; width: " + (width == null ? rightSide - left : width) +
                               "px; height: " + (bottom - top) + "px"));
    }

    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length;
      var start, end;
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), "div", lineObj, bias);
      }

      iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function(from, to, dir) {
        var leftPos = coords(from, "left"), rightPos, left, right;
        if (from == to) {
          rightPos = leftPos;
          left = right = leftPos.left;
        } else {
          rightPos = coords(to - 1, "right");
          if (dir == "rtl") { var tmp = leftPos; leftPos = rightPos; rightPos = tmp; }
          left = leftPos.left;
          right = rightPos.right;
        }
        if (fromArg == null && from == 0) left = leftSide;
        if (rightPos.top - leftPos.top > 3) { // Different lines, draw top part
          add(left, leftPos.top, null, leftPos.bottom);
          left = leftSide;
          if (leftPos.bottom < rightPos.top) add(left, leftPos.bottom, null, rightPos.top);
        }
        if (toArg == null && to == lineLen) right = rightSide;
        if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left)
          start = leftPos;
        if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right)
          end = rightPos;
        if (left < leftSide + 1) left = leftSide;
        add(left, rightPos.top, right - left, rightPos.bottom);
      });
      return {start: start, end: end};
    }

    var sFrom = range.from(), sTo = range.to();
    if (sFrom.line == sTo.line) {
      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
    } else {
      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
      var singleVLine = visualLine(fromLine) == visualLine(toLine);
      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
        }
      }
      if (leftEnd.bottom < rightStart.top)
        add(leftSide, leftEnd.bottom, null, rightStart.top);
    }

    output.appendChild(fragment);
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) return;
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursorDiv.style.visibility = "";
    if (cm.options.cursorBlinkRate > 0)
      display.blinker = setInterval(function() {
        display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden";
      }, cm.options.cursorBlinkRate);
    else if (cm.options.cursorBlinkRate < 0)
      display.cursorDiv.style.visibility = "hidden";
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.mode.startState && cm.doc.frontier < cm.display.viewTo)
      cm.state.highlight.set(time, bind(highlightWorker, cm));
  }

  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.frontier < doc.first) doc.frontier = doc.first;
    if (doc.frontier >= cm.display.viewTo) return;
    var end = +new Date + cm.options.workTime;
    var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
    var changedLines = [];

    doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function(line) {
      if (doc.frontier >= cm.display.viewFrom) { // Visible
        var oldStyles = line.styles;
        var highlighted = highlightLine(cm, line, state, true);
        line.styles = highlighted.styles;
        var oldCls = line.styleClasses, newCls = highlighted.classes;
        if (newCls) line.styleClasses = newCls;
        else if (oldCls) line.styleClasses = null;
        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
        for (var i = 0; !ischange && i < oldStyles.length; ++i) ischange = oldStyles[i] != line.styles[i];
        if (ischange) changedLines.push(doc.frontier);
        line.stateAfter = copyState(doc.mode, state);
      } else {
        processLine(cm, line.text, state);
        line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
      }
      ++doc.frontier;
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay);
        return true;
      }
    });
    if (changedLines.length) runInOp(cm, function() {
      for (var i = 0; i < changedLines.length; i++)
        regLineChange(cm, changedLines[i], "text");
    });
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc;
    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
    for (var search = n; search > lim; --search) {
      if (search <= doc.first) return doc.first;
      var line = getLine(doc, search - 1);
      if (line.stateAfter && (!precise || search <= doc.frontier)) return search;
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline;
  }

  function getStateBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display;
    if (!doc.mode.startState) return true;
    var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos-1).stateAfter;
    if (!state) state = startState(doc.mode);
    else state = copyState(doc.mode, state);
    doc.iter(pos, n, function(line) {
      processLine(cm, line.text, state);
      var save = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo;
      line.stateAfter = save ? copyState(doc.mode, state) : null;
      ++pos;
    });
    if (precise) doc.frontier = pos;
    return state;
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop;}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight;}
  function paddingH(display) {
    if (display.cachedPaddingH) return display.cachedPaddingH;
    var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
    if (!isNaN(data.left) && !isNaN(data.right)) display.cachedPaddingH = data;
    return data;
  }

  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth; }
  function displayWidth(cm) {
    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth;
  }
  function displayHeight(cm) {
    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight;
  }

  // Ensure the lineView.wrapping.heights array is populated. This is
  // an array of bottom offsets for the lines that make up a drawn
  // line. When lineWrapping is on, there might be more than one
  // height.
  function ensureLineHeights(cm, lineView, rect) {
    var wrapping = cm.options.lineWrapping;
    var curWidth = wrapping && displayWidth(cm);
    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
      var heights = lineView.measure.heights = [];
      if (wrapping) {
        lineView.measure.width = curWidth;
        var rects = lineView.text.firstChild.getClientRects();
        for (var i = 0; i < rects.length - 1; i++) {
          var cur = rects[i], next = rects[i + 1];
          if (Math.abs(cur.bottom - next.bottom) > 2)
            heights.push((cur.bottom + next.top) / 2 - rect.top);
        }
      }
      heights.push(rect.bottom - rect.top);
    }
  }

  // Find a line map (mapping character offsets to text nodes) and a
  // measurement cache for the given line number. (A line view might
  // contain multiple lines when collapsed ranges are present.)
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line)
      return {map: lineView.measure.map, cache: lineView.measure.cache};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineView.rest[i] == line)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineNo(lineView.rest[i]) > lineN)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: true};
  }

  // Render a line into the hidden node display.externalMeasured. Used
  // when measurement is needed for a line that's not in the viewport.
  function updateExternalMeasurement(cm, line) {
    line = visualLine(line);
    var lineN = lineNo(line);
    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
    view.lineN = lineN;
    var built = view.built = buildLineContent(cm, view);
    view.text = built.pre;
    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
    return view;
  }

  // Get a {top, bottom, left, right} box (in line-local coordinates)
  // for a given character.
  function measureChar(cm, line, ch, bias) {
    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias);
  }

  // Find a line view that corresponds to the given line number.
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
      return cm.display.view[findViewIndex(cm, lineN)];
    var ext = cm.display.externalMeasured;
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
      return ext;
  }

  // Measurement can be split in two steps, the set-up work that
  // applies to the whole line, and the measurement of the actual
  // character. Functions like coordsChar, that need to do a lot of
  // measurements in a row, can thus ensure that the set-up work is
  // only done once.
  function prepareMeasureForLine(cm, line) {
    var lineN = lineNo(line);
    var view = findViewForLine(cm, lineN);
    if (view && !view.text)
      view = null;
    else if (view && view.changes)
      updateLineForChanges(cm, view, lineN, getDimensions(cm));
    if (!view)
      view = updateExternalMeasurement(cm, line);

    var info = mapFromLineView(view, line, lineN);
    return {
      line: line, view: view, rect: null,
      map: info.map, cache: info.cache, before: info.before,
      hasHeights: false
    };
  }

  // Given a prepared measurement object, measures the position of an
  // actual character (or fetches it from the cache).
  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
    if (prepared.before) ch = -1;
    var key = ch + (bias || ""), found;
    if (prepared.cache.hasOwnProperty(key)) {
      found = prepared.cache[key];
    } else {
      if (!prepared.rect)
        prepared.rect = prepared.view.text.getBoundingClientRect();
      if (!prepared.hasHeights) {
        ensureLineHeights(cm, prepared.view, prepared.rect);
        prepared.hasHeights = true;
      }
      found = measureCharInner(cm, prepared, ch, bias);
      if (!found.bogus) prepared.cache[key] = found;
    }
    return {left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom};
  }

  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

  function nodeAndOffsetInLineMap(map, ch, bias) {
    var node, start, end, collapse;
    // First, search the line map for the text node corresponding to,
    // or closest to, the target character.
    for (var i = 0; i < map.length; i += 3) {
      var mStart = map[i], mEnd = map[i + 1];
      if (ch < mStart) {
        start = 0; end = 1;
        collapse = "left";
      } else if (ch < mEnd) {
        start = ch - mStart;
        end = start + 1;
      } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
        end = mEnd - mStart;
        start = end - 1;
        if (ch >= mEnd) collapse = "right";
      }
      if (start != null) {
        node = map[i + 2];
        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
          collapse = bias;
        if (bias == "left" && start == 0)
          while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
            node = map[(i -= 3) + 2];
            collapse = "left";
          }
        if (bias == "right" && start == mEnd - mStart)
          while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
            node = map[(i += 3) + 2];
            collapse = "right";
          }
        break;
      }
    }
    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd};
  }

  function measureCharInner(cm, prepared, ch, bias) {
    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
    var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

    var rect;
    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
      for (var i = 0; i < 4; i++) { // Retry a maximum of 4 times when nonsense rectangles are returned
        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) --start;
        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) ++end;
        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart) {
          rect = node.parentNode.getBoundingClientRect();
        } else if (ie && cm.options.lineWrapping) {
          var rects = range(node, start, end).getClientRects();
          if (rects.length)
            rect = rects[bias == "right" ? rects.length - 1 : 0];
          else
            rect = nullRect;
        } else {
          rect = range(node, start, end).getBoundingClientRect() || nullRect;
        }
        if (rect.left || rect.right || start == 0) break;
        end = start;
        start = start - 1;
        collapse = "right";
      }
      if (ie && ie_version < 11) rect = maybeUpdateRectForZooming(cm.display.measure, rect);
    } else { // If it is a widget, simply get the box for the whole widget.
      if (start > 0) collapse = bias = "right";
      var rects;
      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
        rect = rects[bias == "right" ? rects.length - 1 : 0];
      else
        rect = node.getBoundingClientRect();
    }
    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
      var rSpan = node.parentNode.getClientRects()[0];
      if (rSpan)
        rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom};
      else
        rect = nullRect;
    }

    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
    var mid = (rtop + rbot) / 2;
    var heights = prepared.view.measure.heights;
    for (var i = 0; i < heights.length - 1; i++)
      if (mid < heights[i]) break;
    var top = i ? heights[i - 1] : 0, bot = heights[i];
    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                  top: top, bottom: bot};
    if (!rect.left && !rect.right) result.bogus = true;
    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

    return result;
  }

  // Work around problem with bounding client rects on ranges being
  // returned incorrectly when zoomed on IE10 and below.
  function maybeUpdateRectForZooming(measure, rect) {
    if (!window.screen || screen.logicalXDPI == null ||
        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
      return rect;
    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
    return {left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY};
  }

  function clearLineMeasurementCacheFor(lineView) {
    if (lineView.measure) {
      lineView.measure.cache = {};
      lineView.measure.heights = null;
      if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
        lineView.measure.caches[i] = {};
    }
  }

  function clearLineMeasurementCache(cm) {
    cm.display.externalMeasure = null;
    removeChildren(cm.display.lineMeasure);
    for (var i = 0; i < cm.display.view.length; i++)
      clearLineMeasurementCacheFor(cm.display.view[i]);
  }

  function clearCaches(cm) {
    clearLineMeasurementCache(cm);
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
    if (!cm.options.lineWrapping) cm.display.maxLineChanged = true;
    cm.display.lineNumChars = null;
  }

  function pageScrollX() { return window.pageXOffset || (document.documentElement || document.body).scrollLeft; }
  function pageScrollY() { return window.pageYOffset || (document.documentElement || document.body).scrollTop; }

  // Converts a {top, bottom, left, right} box from line-local
  // coordinates into another coordinate system. Context may be one of
  // "line", "div" (display.lineDiv), "local"/null (editor), "window",
  // or "page".
  function intoCoordSystem(cm, lineObj, rect, context) {
    if (lineObj.widgets) for (var i = 0; i < lineObj.widgets.length; ++i) if (lineObj.widgets[i].above) {
      var size = widgetHeight(lineObj.widgets[i]);
      rect.top += size; rect.bottom += size;
    }
    if (context == "line") return rect;
    if (!context) context = "local";
    var yOff = heightAtLine(lineObj);
    if (context == "local") yOff += paddingTop(cm.display);
    else yOff -= cm.display.viewOffset;
    if (context == "page" || context == "window") {
      var lOff = cm.display.lineSpace.getBoundingClientRect();
      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
      rect.left += xOff; rect.right += xOff;
    }
    rect.top += yOff; rect.bottom += yOff;
    return rect;
  }

  // Coverts a box from "div" coords to another coordinate system.
  // Context may be "window", "page", "div", or "local"/null.
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") return coords;
    var left = coords.left, top = coords.top;
    // First move into "page" coordinate system
    if (context == "page") {
      left -= pageScrollX();
      top -= pageScrollY();
    } else if (context == "local" || !context) {
      var localBox = cm.display.sizer.getBoundingClientRect();
      left += localBox.left;
      top += localBox.top;
    }

    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top};
  }

  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj) lineObj = getLine(cm.doc, pos.line);
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context);
  }

  // Returns a box for a given cursor position, which may have an
  // 'other' property containing the position of the secondary cursor
  // on a bidi boundary.
  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!preparedMeasure) preparedMeasure = prepareMeasureForLine(cm, lineObj);
    function get(ch, right) {
      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
      if (right) m.left = m.right; else m.right = m.left;
      return intoCoordSystem(cm, lineObj, m, context);
    }
    function getBidi(ch, partPos) {
      var part = order[partPos], right = part.level % 2;
      if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
        part = order[--partPos];
        ch = bidiRight(part) - (part.level % 2 ? 0 : 1);
        right = true;
      } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
        part = order[++partPos];
        ch = bidiLeft(part) - part.level % 2;
        right = false;
      }
      if (right && ch == part.to && ch > part.from) return get(ch - 1);
      return get(ch, right);
    }
    var order = getOrder(lineObj), ch = pos.ch;
    if (!order) return get(ch);
    var partPos = getBidiPartAt(order, ch);
    var val = getBidi(ch, partPos);
    if (bidiOther != null) val.other = getBidi(ch, bidiOther);
    return val;
  }

  // Used to cheaply estimate the coordinates for a position. Used for
  // intermediate scroll updates.
  function estimateCoords(cm, pos) {
    var left = 0, pos = clipPos(cm.doc, pos);
    if (!cm.options.lineWrapping) left = charWidth(cm.display) * pos.ch;
    var lineObj = getLine(cm.doc, pos.line);
    var top = heightAtLine(lineObj) + paddingTop(cm.display);
    return {left: left, right: left, top: top, bottom: top + lineObj.height};
  }

  // Positions returned by coordsChar contain some extra information.
  // xRel is the relative x position of the input coordinates compared
  // to the found position (so xRel > 0 means the coordinates are to
  // the right of the character position, for example). When outside
  // is true, that means the coordinates lie outside the line's
  // vertical range.
  function PosWithInfo(line, ch, outside, xRel) {
    var pos = Pos(line, ch);
    pos.xRel = xRel;
    if (outside) pos.outside = true;
    return pos;
  }

  // Compute the character position closest to the given coordinates.
  // Input must be lineSpace-local ("div" coordinate system).
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0) return PosWithInfo(doc.first, 0, true, -1);
    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineN > last)
      return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1);
    if (x < 0) x = 0;

    var lineObj = getLine(doc, lineN);
    for (;;) {
      var found = coordsCharInner(cm, lineObj, lineN, x, y);
      var merged = collapsedSpanAtEnd(lineObj);
      var mergedPos = merged && merged.find(0, true);
      if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
        lineN = lineNo(lineObj = mergedPos.to.line);
      else
        return found;
    }
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    var innerOff = y - heightAtLine(lineObj);
    var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
    var preparedMeasure = prepareMeasureForLine(cm, lineObj);

    function getX(ch) {
      var sp = cursorCoords(cm, Pos(lineNo, ch), "line", lineObj, preparedMeasure);
      wrongLine = true;
      if (innerOff > sp.bottom) return sp.left - adjust;
      else if (innerOff < sp.top) return sp.left + adjust;
      else wrongLine = false;
      return sp.left;
    }

    var bidi = getOrder(lineObj), dist = lineObj.text.length;
    var from = lineLeft(lineObj), to = lineRight(lineObj);
    var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;

    if (x > toX) return PosWithInfo(lineNo, to, toOutside, 1);
    // Do a binary search between these bounds.
    for (;;) {
      if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
        var ch = x < fromX || x - fromX <= toX - x ? from : to;
        var xDiff = x - (ch == from ? fromX : toX);
        while (isExtendingChar(lineObj.text.charAt(ch))) ++ch;
        var pos = PosWithInfo(lineNo, ch, ch == from ? fromOutside : toOutside,
                              xDiff < -1 ? -1 : xDiff > 1 ? 1 : 0);
        return pos;
      }
      var step = Math.ceil(dist / 2), middle = from + step;
      if (bidi) {
        middle = from;
        for (var i = 0; i < step; ++i) middle = moveVisually(lineObj, middle, 1);
      }
      var middleX = getX(middle);
      if (middleX > x) {to = middle; toX = middleX; if (toOutside = wrongLine) toX += 1000; dist = step;}
      else {from = middle; fromX = middleX; fromOutside = wrongLine; dist -= step;}
    }
  }

  var measureText;
  // Compute the default text height.
  function textHeight(display) {
    if (display.cachedTextHeight != null) return display.cachedTextHeight;
    if (measureText == null) {
      measureText = elt("pre");
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"));
        measureText.appendChild(elt("br"));
      }
      measureText.appendChild(document.createTextNode("x"));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3) display.cachedTextHeight = height;
    removeChildren(display.measure);
    return height || 1;
  }

  // Compute the default character width.
  function charWidth(display) {
    if (display.cachedCharWidth != null) return display.cachedCharWidth;
    var anchor = elt("span", "xxxxxxxxxx");
    var pre = elt("pre", [anchor]);
    removeChildrenAndAdd(display.measure, pre);
    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
    if (width > 2) display.cachedCharWidth = width;
    return width || 10;
  }

  // OPERATIONS

  // Operations are used to wrap a series of changes to the editor
  // state in such a way that each change won't have to update the
  // cursor and display (which would be awkward, slow, and
  // error-prone). Instead, display updates are batched and then all
  // combined and executed at once.

  var operationGroup = null;

  var nextOpId = 0;
  // Start a new operation.
  function startOperation(cm) {
    cm.curOp = {
      cm: cm,
      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
      startHeight: cm.doc.height, // Used to detect need to update scrollbar
      forceUpdate: false,      // Used to force a redraw
      updateInput: null,       // Whether to reset the input textarea
      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
      changeObjs: null,        // Accumulated changes, for firing change events
      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
      selectionChanged: false, // Whether the selection needs to be redrawn
      updateMaxLine: false,    // Set when the widest line needs to be determined anew
      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
      scrollToPos: null,       // Used to scroll to a specific position
      id: ++nextOpId           // Unique ID
    };
    if (operationGroup) {
      operationGroup.ops.push(cm.curOp);
    } else {
      cm.curOp.ownsGroup = operationGroup = {
        ops: [cm.curOp],
        delayedCallbacks: []
      };
    }
  }

  function fireCallbacksForOps(group) {
    // Calls delayed callbacks and cursorActivity handlers until no
    // new ones appear
    var callbacks = group.delayedCallbacks, i = 0;
    do {
      for (; i < callbacks.length; i++)
        callbacks[i]();
      for (var j = 0; j < group.ops.length; j++) {
        var op = group.ops[j];
        if (op.cursorActivityHandlers)
          while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
            op.cursorActivityHandlers[op.cursorActivityCalled++](op.cm);
      }
    } while (i < callbacks.length);
  }

  // Finish an operation, updating the display and signalling delayed events
  function endOperation(cm) {
    var op = cm.curOp, group = op.ownsGroup;
    if (!group) return;

    try { fireCallbacksForOps(group); }
    finally {
      operationGroup = null;
      for (var i = 0; i < group.ops.length; i++)
        group.ops[i].cm.curOp = null;
      endOperations(group);
    }
  }

  // The DOM updates done when an operation finishes are batched so
  // that the minimum number of relayouts are required.
  function endOperations(group) {
    var ops = group.ops;
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_finish(ops[i]);
  }

  function endOperation_R1(op) {
    var cm = op.cm, display = cm.display;
    maybeClipScrollbars(cm);
    if (op.updateMaxLine) findMaxLine(cm);

    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                         op.scrollToPos.to.line >= display.viewTo) ||
      display.maxLineChanged && cm.options.lineWrapping;
    op.update = op.mustUpdate &&
      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
  }

  function endOperation_W1(op) {
    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
  }

  function endOperation_R2(op) {
    var cm = op.cm, display = cm.display;
    if (op.updatedDisplay) updateHeightsInViewport(cm);

    op.barMeasure = measureForScrollbars(cm);

    // If the max line changed since it was last measured, measure it,
    // and ensure the document's width matches it.
    // updateDisplay_W2 will use these properties to do the actual resizing
    if (display.maxLineChanged && !cm.options.lineWrapping) {
      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
      cm.display.sizerWidth = op.adjustWidthTo;
      op.barMeasure.scrollWidth =
        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
    }

    if (op.updatedDisplay || op.selectionChanged)
      op.preparedSelection = display.input.prepareSelection();
  }

  function endOperation_W2(op) {
    var cm = op.cm;

    if (op.adjustWidthTo != null) {
      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
      if (op.maxScrollLeft < cm.doc.scrollLeft)
        setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true);
      cm.display.maxLineChanged = false;
    }

    if (op.preparedSelection)
      cm.display.input.showSelection(op.preparedSelection);
    if (op.updatedDisplay)
      setDocumentHeight(cm, op.barMeasure);
    if (op.updatedDisplay || op.startHeight != cm.doc.height)
      updateScrollbars(cm, op.barMeasure);

    if (op.selectionChanged) restartBlink(cm);

    if (cm.state.focused && op.updateInput)
      cm.display.input.reset(op.typing);
  }

  function endOperation_finish(op) {
    var cm = op.cm, display = cm.display, doc = cm.doc;

    if (op.updatedDisplay) postUpdateDisplay(cm, op.update);

    // Abort mouse wheel delta measurement, when scrolling explicitly
    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
      display.wheelStartX = display.wheelStartY = null;

    // Propagate the scroll position to the actual DOM scroller
    if (op.scrollTop != null && (display.scroller.scrollTop != op.scrollTop || op.forceScroll)) {
      doc.scrollTop = Math.max(0, Math.min(display.scroller.scrollHeight - display.scroller.clientHeight, op.scrollTop));
      display.scrollbars.setScrollTop(doc.scrollTop);
      display.scroller.scrollTop = doc.scrollTop;
    }
    if (op.scrollLeft != null && (display.scroller.scrollLeft != op.scrollLeft || op.forceScroll)) {
      doc.scrollLeft = Math.max(0, Math.min(display.scroller.scrollWidth - displayWidth(cm), op.scrollLeft));
      display.scrollbars.setScrollLeft(doc.scrollLeft);
      display.scroller.scrollLeft = doc.scrollLeft;
      alignHorizontally(cm);
    }
    // If we need to scroll a specific position into view, do so.
    if (op.scrollToPos) {
      var coords = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                     clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
      if (op.scrollToPos.isCursor && cm.state.focused) maybeScrollWindow(cm, coords);
    }

    // Fire events for markers that are hidden/unidden by editing or
    // undoing
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden) for (var i = 0; i < hidden.length; ++i)
      if (!hidden[i].lines.length) signal(hidden[i], "hide");
    if (unhidden) for (var i = 0; i < unhidden.length; ++i)
      if (unhidden[i].lines.length) signal(unhidden[i], "unhide");

    if (display.wrapper.offsetHeight)
      doc.scrollTop = cm.display.scroller.scrollTop;

    // Fire change events, and delayed event handlers
    if (op.changeObjs)
      signal(cm, "changes", cm, op.changeObjs);
    if (op.update)
      op.update.finish();
  }

  // Run the given function in an operation
  function runInOp(cm, f) {
    if (cm.curOp) return f();
    startOperation(cm);
    try { return f(); }
    finally { endOperation(cm); }
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm, f) {
    return function() {
      if (cm.curOp) return f.apply(cm, arguments);
      startOperation(cm);
      try { return f.apply(cm, arguments); }
      finally { endOperation(cm); }
    };
  }
  // Used to add methods to editor and doc instances, wrapping them in
  // operations.
  function methodOp(f) {
    return function() {
      if (this.curOp) return f.apply(this, arguments);
      startOperation(this);
      try { return f.apply(this, arguments); }
      finally { endOperation(this); }
    };
  }
  function docMethodOp(f) {
    return function() {
      var cm = this.cm;
      if (!cm || cm.curOp) return f.apply(this, arguments);
      startOperation(cm);
      try { return f.apply(this, arguments); }
      finally { endOperation(cm); }
    };
  }

  // VIEW TRACKING

  // These objects are used to represent the visible (currently drawn)
  // part of the document. A LineView may correspond to multiple
  // logical lines, if those are connected by collapsed ranges.
  function LineView(doc, line, lineN) {
    // The starting line
    this.line = line;
    // Continuing lines, if any
    this.rest = visualLineContinued(line);
    // Number of logical lines in this visual line
    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
    this.node = this.text = null;
    this.hidden = lineIsHidden(doc, line);
  }

  // Create a range of LineView objects for the given lines.
  function buildViewArray(cm, from, to) {
    var array = [], nextPos;
    for (var pos = from; pos < to; pos = nextPos) {
      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
      nextPos = pos + view.size;
      array.push(view);
    }
    return array;
  }

  // Updates the display.view data structure for a given change to the
  // document. From and to are in pre-change coordinates. Lendiff is
  // the amount of lines added or subtracted by the change. This is
  // used for changes that span multiple lines, or change the way
  // lines are divided into visual lines. regLineChange (below)
  // registers single-line changes.
  function regChange(cm, from, to, lendiff) {
    if (from == null) from = cm.doc.first;
    if (to == null) to = cm.doc.first + cm.doc.size;
    if (!lendiff) lendiff = 0;

    var display = cm.display;
    if (lendiff && to < display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers > from))
      display.updateLineNumbers = from;

    cm.curOp.viewChanged = true;

    if (from >= display.viewTo) { // Change after
      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
        resetView(cm);
    } else if (to <= display.viewFrom) { // Change before
      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
        resetView(cm);
      } else {
        display.viewFrom += lendiff;
        display.viewTo += lendiff;
      }
    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
      resetView(cm);
    } else if (from <= display.viewFrom) { // Top overlap
      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cut) {
        display.view = display.view.slice(cut.index);
        display.viewFrom = cut.lineN;
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    } else if (to >= display.viewTo) { // Bottom overlap
      var cut = viewCuttingPoint(cm, from, from, -1);
      if (cut) {
        display.view = display.view.slice(0, cut.index);
        display.viewTo = cut.lineN;
      } else {
        resetView(cm);
      }
    } else { // Gap in the middle
      var cutTop = viewCuttingPoint(cm, from, from, -1);
      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cutTop && cutBot) {
        display.view = display.view.slice(0, cutTop.index)
          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
          .concat(display.view.slice(cutBot.index));
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    }

    var ext = display.externalMeasured;
    if (ext) {
      if (to < ext.lineN)
        ext.lineN += lendiff;
      else if (from < ext.lineN + ext.size)
        display.externalMeasured = null;
    }
  }

  // Register a change to a single line. Type must be one of "text",
  // "gutter", "class", "widget"
  function regLineChange(cm, line, type) {
    cm.curOp.viewChanged = true;
    var display = cm.display, ext = cm.display.externalMeasured;
    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
      display.externalMeasured = null;

    if (line < display.viewFrom || line >= display.viewTo) return;
    var lineView = display.view[findViewIndex(cm, line)];
    if (lineView.node == null) return;
    var arr = lineView.changes || (lineView.changes = []);
    if (indexOf(arr, type) == -1) arr.push(type);
  }

  // Clear the view.
  function resetView(cm) {
    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
    cm.display.view = [];
    cm.display.viewOffset = 0;
  }

  // Find the view element corresponding to a given line. Return null
  // when the line isn't visible.
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) return null;
    n -= cm.display.viewFrom;
    if (n < 0) return null;
    var view = cm.display.view;
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size;
      if (n < 0) return i;
    }
  }

  function viewCuttingPoint(cm, oldN, newN, dir) {
    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
      return {index: index, lineN: newN};
    for (var i = 0, n = cm.display.viewFrom; i < index; i++)
      n += view[i].size;
    if (n != oldN) {
      if (dir > 0) {
        if (index == view.length - 1) return null;
        diff = (n + view[index].size) - oldN;
        index++;
      } else {
        diff = n - oldN;
      }
      oldN += diff; newN += diff;
    }
    while (visualLineNo(cm.doc, newN) != newN) {
      if (index == (dir < 0 ? 0 : view.length - 1)) return null;
      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
      index += dir;
    }
    return {index: index, lineN: newN};
  }

  // Force the view to cover a given range, adding empty view element
  // or clipping off existing ones as needed.
  function adjustView(cm, from, to) {
    var display = cm.display, view = display.view;
    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
      display.view = buildViewArray(cm, from, to);
      display.viewFrom = from;
    } else {
      if (display.viewFrom > from)
        display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view);
      else if (display.viewFrom < from)
        display.view = display.view.slice(findViewIndex(cm, from));
      display.viewFrom = from;
      if (display.viewTo < to)
        display.view = display.view.concat(buildViewArray(cm, display.viewTo, to));
      else if (display.viewTo > to)
        display.view = display.view.slice(0, findViewIndex(cm, to));
    }
    display.viewTo = to;
  }

  // Count the number of lines in the view whose DOM representation is
  // out of date (or nonexistent).
  function countDirtyView(cm) {
    var view = cm.display.view, dirty = 0;
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (!lineView.hidden && (!lineView.node || lineView.changes)) ++dirty;
    }
    return dirty;
  }

  // EVENT HANDLERS

  // Attach the necessary event handlers when initializing the editor
  function registerEventHandlers(cm) {
    var d = cm.display;
    on(d.scroller, "mousedown", operation(cm, onMouseDown));
    // Older IE's will not fire a second mousedown for a double click
    if (ie && ie_version < 11)
      on(d.scroller, "dblclick", operation(cm, function(e) {
        if (signalDOMEvent(cm, e)) return;
        var pos = posFromMouse(cm, e);
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) return;
        e_preventDefault(e);
        var word = cm.findWordAt(pos);
        extendSelection(cm.doc, word.anchor, word.head);
      }));
    else
      on(d.scroller, "dblclick", function(e) { signalDOMEvent(cm, e) || e_preventDefault(e); });
    // Some browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for these browsers.
    if (!captureRightClick) on(d.scroller, "contextmenu", function(e) {onContextMenu(cm, e);});

    // Used to suppress mouse event handling when a touch happens
    var touchFinished, prevTouch = {end: 0};
    function finishTouch() {
      if (d.activeTouch) {
        touchFinished = setTimeout(function() {d.activeTouch = null;}, 1000);
        prevTouch = d.activeTouch;
        prevTouch.end = +new Date;
      }
    };
    function isMouseLikeTouchEvent(e) {
      if (e.touches.length != 1) return false;
      var touch = e.touches[0];
      return touch.radiusX <= 1 && touch.radiusY <= 1;
    }
    function farAway(touch, other) {
      if (other.left == null) return true;
      var dx = other.left - touch.left, dy = other.top - touch.top;
      return dx * dx + dy * dy > 20 * 20;
    }
    on(d.scroller, "touchstart", function(e) {
      if (!isMouseLikeTouchEvent(e)) {
        clearTimeout(touchFinished);
        var now = +new Date;
        d.activeTouch = {start: now, moved: false,
                         prev: now - prevTouch.end <= 300 ? prevTouch : null};
        if (e.touches.length == 1) {
          d.activeTouch.left = e.touches[0].pageX;
          d.activeTouch.top = e.touches[0].pageY;
        }
      }
    });
    on(d.scroller, "touchmove", function() {
      if (d.activeTouch) d.activeTouch.moved = true;
    });
    on(d.scroller, "touchend", function(e) {
      var touch = d.activeTouch;
      if (touch && !eventInWidget(d, e) && touch.left != null &&
          !touch.moved && new Date - touch.start < 300) {
        var pos = cm.coordsChar(d.activeTouch, "page"), range;
        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
          range = new Range(pos, pos);
        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
          range = cm.findWordAt(pos);
        else // Triple tap
          range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0)));
        cm.setSelection(range.anchor, range.head);
        cm.focus();
        e_preventDefault(e);
      }
      finishTouch();
    });
    on(d.scroller, "touchcancel", finishTouch);

    // Sync scrolling between fake scrollbars and real scrollable
    // area, ensure viewport is updated when scrolling.
    on(d.scroller, "scroll", function() {
      if (d.scroller.clientHeight) {
        setScrollTop(cm, d.scroller.scrollTop);
        setScrollLeft(cm, d.scroller.scrollLeft, true);
        signal(cm, "scroll", cm);
      }
    });

    // Listen to wheel events in order to try and update the viewport on time.
    on(d.scroller, "mousewheel", function(e){onScrollWheel(cm, e);});
    on(d.scroller, "DOMMouseScroll", function(e){onScrollWheel(cm, e);});

    // Prevent wrapper from ever scrolling
    on(d.wrapper, "scroll", function() { d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

    function drag_(e) {
      if (!signalDOMEvent(cm, e)) e_stop(e);
    }
    if (cm.options.dragDrop) {
      on(d.scroller, "dragstart", function(e){onDragStart(cm, e);});
      on(d.scroller, "dragenter", drag_);
      on(d.scroller, "dragover", drag_);
      on(d.scroller, "drop", operation(cm, onDrop));
    }

    var inp = d.input.getField();
    on(inp, "keyup", function(e) { onKeyUp.call(cm, e); });
    on(inp, "keydown", operation(cm, onKeyDown));
    on(inp, "keypress", operation(cm, onKeyPress));
    on(inp, "focus", bind(onFocus, cm));
    on(inp, "blur", bind(onBlur, cm));
  }

  // Called when the window resizes
  function onResize(cm) {
    var d = cm.display;
    if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth)
      return;
    // Might be a text scaling operation, clear size caches.
    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
    d.scrollbarsClipped = false;
    cm.setSize();
  }

  // MOUSE EVENTS

  // Return true when the given mouse event happened in a widget
  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
          (n.parentNode == display.sizer && n != display.mover))
        return true;
    }
  }

  // Given a mouse event, find the corresponding position. If liberal
  // is false, it checks whether a gutter or scrollbar was clicked,
  // and returns null if it was. forRect is used by rectangular
  // selections, and tries to estimate a character position even for
  // coordinates beyond the right of the text.
  function posFromMouse(cm, e, liberal, forRect) {
    var display = cm.display;
    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") return null;

    var x, y, space = display.lineSpace.getBoundingClientRect();
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try { x = e.clientX - space.left; y = e.clientY - space.top; }
    catch (e) { return null; }
    var coords = coordsChar(cm, x, y), line;
    if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
    }
    return coords;
  }

  // A mouse down can be a single click, double click, triple click,
  // start of selection drag, start of text drag, new cursor
  // (ctrl-click), rectangle drag (alt-drag), or xwin
  // middle-click-paste. Or it might be a click on something we should
  // not interfere with, such as a scrollbar or widget.
  function onMouseDown(e) {
    var cm = this, display = cm.display;
    if (display.activeTouch && display.input.supportsTouch() || signalDOMEvent(cm, e)) return;
    display.shift = e.shiftKey;

    if (eventInWidget(display, e)) {
      if (!webkit) {
        // Briefly turn off draggability, to allow widgets to do
        // normal dragging things.
        display.scroller.draggable = false;
        setTimeout(function(){display.scroller.draggable = true;}, 100);
      }
      return;
    }
    if (clickInGutter(cm, e)) return;
    var start = posFromMouse(cm, e);
    window.focus();

    switch (e_button(e)) {
    case 1:
      if (start)
        leftButtonDown(cm, e, start);
      else if (e_target(e) == display.scroller)
        e_preventDefault(e);
      break;
    case 2:
      if (webkit) cm.state.lastMiddleDown = +new Date;
      if (start) extendSelection(cm.doc, start);
      setTimeout(function() {display.input.focus();}, 20);
      e_preventDefault(e);
      break;
    case 3:
      if (captureRightClick) onContextMenu(cm, e);
      break;
    }
  }

  var lastClick, lastDoubleClick;
  function leftButtonDown(cm, e, start) {
    if (ie) setTimeout(bind(ensureFocus, cm), 0);
    else ensureFocus(cm);

    var now = +new Date, type;
    if (lastDoubleClick && lastDoubleClick.time > now - 400 && cmp(lastDoubleClick.pos, start) == 0) {
      type = "triple";
    } else if (lastClick && lastClick.time > now - 400 && cmp(lastClick.pos, start) == 0) {
      type = "double";
      lastDoubleClick = {time: now, pos: start};
    } else {
      type = "single";
      lastClick = {time: now, pos: start};
    }

    var sel = cm.doc.sel, modifier = mac ? e.metaKey : e.ctrlKey, contained;
    if (cm.options.dragDrop && dragAndDrop && !isReadOnly(cm) &&
        type == "single" && (contained = sel.contains(start)) > -1 &&
        !sel.ranges[contained].empty())
      leftButtonStartDrag(cm, e, start, modifier);
    else
      leftButtonSelect(cm, e, start, type, modifier);
  }

  // Start a text drag. When it ends, see if any dragging actually
  // happen, and treat as a click if it didn't.
  function leftButtonStartDrag(cm, e, start, modifier) {
    var display = cm.display;
    var dragEnd = operation(cm, function(e2) {
      if (webkit) display.scroller.draggable = false;
      cm.state.draggingText = false;
      off(document, "mouseup", dragEnd);
      off(display.scroller, "drop", dragEnd);
      if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
        e_preventDefault(e2);
        if (!modifier)
          extendSelection(cm.doc, start);
        display.input.focus();
        // Work around unexplainable focus problem in IE9 (#2127)
        if (ie && ie_version == 9)
          setTimeout(function() {document.body.focus(); display.input.focus();}, 20);
      }
    });
    // Let the drag handler handle this.
    if (webkit) display.scroller.draggable = true;
    cm.state.draggingText = dragEnd;
    // IE's approach to draggable
    if (display.scroller.dragDrop) display.scroller.dragDrop();
    on(document, "mouseup", dragEnd);
    on(display.scroller, "drop", dragEnd);
  }

  // Normal selection, as opposed to text dragging.
  function leftButtonSelect(cm, e, start, type, addNew) {
    var display = cm.display, doc = cm.doc;
    e_preventDefault(e);

    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
    if (addNew && !e.shiftKey) {
      ourIndex = doc.sel.contains(start);
      if (ourIndex > -1)
        ourRange = ranges[ourIndex];
      else
        ourRange = new Range(start, start);
    } else {
      ourRange = doc.sel.primary();
    }

    if (e.altKey) {
      type = "rect";
      if (!addNew) ourRange = new Range(start, start);
      start = posFromMouse(cm, e, true, true);
      ourIndex = -1;
    } else if (type == "double") {
      var word = cm.findWordAt(start);
      if (cm.display.shift || doc.extend)
        ourRange = extendRange(doc, ourRange, word.anchor, word.head);
      else
        ourRange = word;
    } else if (type == "triple") {
      var line = new Range(Pos(start.line, 0), clipPos(doc, Pos(start.line + 1, 0)));
      if (cm.display.shift || doc.extend)
        ourRange = extendRange(doc, ourRange, line.anchor, line.head);
      else
        ourRange = line;
    } else {
      ourRange = extendRange(doc, ourRange, start);
    }

    if (!addNew) {
      ourIndex = 0;
      setSelection(doc, new Selection([ourRange], 0), sel_mouse);
      startSel = doc.sel;
    } else if (ourIndex == -1) {
      ourIndex = ranges.length;
      setSelection(doc, normalizeSelection(ranges.concat([ourRange]), ourIndex),
                   {scroll: false, origin: "*mouse"});
    } else if (ranges.length > 1 && ranges[ourIndex].empty() && type == "single") {
      setSelection(doc, normalizeSelection(ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0));
      startSel = doc.sel;
    } else {
      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
    }

    var lastPos = start;
    function extendTo(pos) {
      if (cmp(lastPos, pos) == 0) return;
      lastPos = pos;

      if (type == "rect") {
        var ranges = [], tabSize = cm.options.tabSize;
        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
             line <= end; line++) {
          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
          if (left == right)
            ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos)));
          else if (text.length > leftPos)
            ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize))));
        }
        if (!ranges.length) ranges.push(new Range(start, start));
        setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                     {origin: "*mouse", scroll: false});
        cm.scrollIntoView(pos);
      } else {
        var oldRange = ourRange;
        var anchor = oldRange.anchor, head = pos;
        if (type != "single") {
          if (type == "double")
            var range = cm.findWordAt(pos);
          else
            var range = new Range(Pos(pos.line, 0), clipPos(doc, Pos(pos.line + 1, 0)));
          if (cmp(range.anchor, anchor) > 0) {
            head = range.head;
            anchor = minPos(oldRange.from(), range.anchor);
          } else {
            head = range.anchor;
            anchor = maxPos(oldRange.to(), range.head);
          }
        }
        var ranges = startSel.ranges.slice(0);
        ranges[ourIndex] = new Range(clipPos(doc, anchor), head);
        setSelection(doc, normalizeSelection(ranges, ourIndex), sel_mouse);
      }
    }

    var editorSize = display.wrapper.getBoundingClientRect();
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0;

    function extend(e) {
      var curCount = ++counter;
      var cur = posFromMouse(cm, e, true, type == "rect");
      if (!cur) return;
      if (cmp(cur, lastPos) != 0) {
        ensureFocus(cm);
        extendTo(cur);
        var visible = visibleLines(display, doc);
        if (cur.line >= visible.to || cur.line < visible.from)
          setTimeout(operation(cm, function(){if (counter == curCount) extend(e);}), 150);
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
        if (outside) setTimeout(operation(cm, function() {
          if (counter != curCount) return;
          display.scroller.scrollTop += outside;
          extend(e);
        }), 50);
      }
    }

    function done(e) {
      counter = Infinity;
      e_preventDefault(e);
      display.input.focus();
      off(document, "mousemove", move);
      off(document, "mouseup", up);
      doc.history.lastSelOrigin = null;
    }

    var move = operation(cm, function(e) {
      if (!e_button(e)) done(e);
      else extend(e);
    });
    var up = operation(cm, done);
    on(document, "mousemove", move);
    on(document, "mouseup", up);
  }

  // Determines whether an event happened in the gutter, and fires the
  // handlers for the corresponding event.
  function gutterEvent(cm, e, type, prevent, signalfn) {
    try { var mX = e.clientX, mY = e.clientY; }
    catch(e) { return false; }
    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) return false;
    if (prevent) e_preventDefault(e);

    var display = cm.display;
    var lineBox = display.lineDiv.getBoundingClientRect();

    if (mY > lineBox.bottom || !hasHandler(cm, type)) return e_defaultPrevented(e);
    mY -= lineBox.top - display.viewOffset;

    for (var i = 0; i < cm.options.gutters.length; ++i) {
      var g = display.gutters.childNodes[i];
      if (g && g.getBoundingClientRect().right >= mX) {
        var line = lineAtHeight(cm.doc, mY);
        var gutter = cm.options.gutters[i];
        signalfn(cm, type, cm, line, gutter, e);
        return e_defaultPrevented(e);
      }
    }
  }

  function clickInGutter(cm, e) {
    return gutterEvent(cm, e, "gutterClick", true, signalLater);
  }

  // Kludge to work around strange IE behavior where it'll sometimes
  // re-fire a series of drag-related events right after the drop (#1551)
  var lastDrop = 0;

  function onDrop(e) {
    var cm = this;
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
      return;
    e_preventDefault(e);
    if (ie) lastDrop = +new Date;
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
    if (!pos || isReadOnly(cm)) return;
    // Might be a file drop, in which case we simply extract the text
    // and insert it.
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0;
      var loadFile = function(file, i) {
        var reader = new FileReader;
        reader.onload = operation(cm, function() {
          text[i] = reader.result;
          if (++read == n) {
            pos = clipPos(cm.doc, pos);
            var change = {from: pos, to: pos, text: splitLines(text.join("\n")), origin: "paste"};
            makeChange(cm.doc, change);
            setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
          }
        });
        reader.readAsText(file);
      };
      for (var i = 0; i < n; ++i) loadFile(files[i], i);
    } else { // Normal drop
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
        cm.state.draggingText(e);
        // Ensure the editor is re-focused
        setTimeout(function() {cm.display.input.focus();}, 20);
        return;
      }
      try {
        var text = e.dataTransfer.getData("Text");
        if (text) {
          if (cm.state.draggingText && !(mac ? e.metaKey : e.ctrlKey))
            var selected = cm.listSelections();
          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
          if (selected) for (var i = 0; i < selected.length; ++i)
            replaceRange(cm.doc, "", selected[i].anchor, selected[i].head, "drag");
          cm.replaceSelection(text, "around", "paste");
          cm.display.input.focus();
        }
      }
      catch(e){}
    }
  }

  function onDragStart(cm, e) {
    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return; }
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) return;

    e.dataTransfer.setData("Text", cm.getSelection());

    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage && !safari) {
      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      if (presto) {
        img.width = img.height = 1;
        cm.display.wrapper.appendChild(img);
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop;
      }
      e.dataTransfer.setDragImage(img, 0, 0);
      if (presto) img.parentNode.removeChild(img);
    }
  }

  // SCROLL EVENTS

  // Sync the scrollable area and scrollbars, ensure the viewport
  // covers the visible area.
  function setScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2) return;
    cm.doc.scrollTop = val;
    if (!gecko) updateDisplaySimple(cm, {top: val});
    if (cm.display.scroller.scrollTop != val) cm.display.scroller.scrollTop = val;
    cm.display.scrollbars.setScrollTop(val);
    if (gecko) updateDisplaySimple(cm);
    startWorker(cm, 100);
  }
  // Sync scroller and scrollbar, ensure the gutter elements are
  // aligned.
  function setScrollLeft(cm, val, isScroller) {
    if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) return;
    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
    cm.doc.scrollLeft = val;
    alignHorizontally(cm);
    if (cm.display.scroller.scrollLeft != val) cm.display.scroller.scrollLeft = val;
    cm.display.scrollbars.setScrollLeft(val);
  }

  // Since the delta values reported on mouse wheel events are
  // unstandardized between browsers and even browser versions, and
  // generally horribly unpredictable, this code starts by measuring
  // the scroll effect that the first few mouse wheel events have,
  // and, from that, detects the way it can convert deltas to pixel
  // offsets afterwards.
  //
  // The reason we want to know the amount a wheel event will scroll
  // is that it gives us a chance to update the display before the
  // actual scrolling happens, reducing flickering.

  var wheelSamples = 0, wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie) wheelPixelsPerUnit = -.53;
  else if (gecko) wheelPixelsPerUnit = 15;
  else if (chrome) wheelPixelsPerUnit = -.7;
  else if (safari) wheelPixelsPerUnit = -1/3;

  var wheelEventDelta = function(e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) dx = e.detail;
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) dy = e.detail;
    else if (dy == null) dy = e.wheelDelta;
    return {x: dx, y: dy};
  };
  CodeMirror.wheelEventPixels = function(e) {
    var delta = wheelEventDelta(e);
    delta.x *= wheelPixelsPerUnit;
    delta.y *= wheelPixelsPerUnit;
    return delta;
  };

  function onScrollWheel(cm, e) {
    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

    var display = cm.display, scroll = display.scroller;
    // Quit if there's nothing to scroll here
    if (!(dx && scroll.scrollWidth > scroll.clientWidth ||
          dy && scroll.scrollHeight > scroll.clientHeight)) return;

    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
        for (var i = 0; i < view.length; i++) {
          if (view[i].node == cur) {
            cm.display.currentWheelTarget = cur;
            break outer;
          }
        }
      }
    }

    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
      if (dy)
        setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight)));
      setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)));
      e_preventDefault(e);
      display.wheelStartX = null; // Abort measurement, if in progress
      return;
    }

    // 'Project' the visible viewport to cover the area that is being
    // scrolled into view (if we know enough to estimate it).
    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit;
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
      if (pixels < 0) top = Math.max(0, top + pixels - 50);
      else bot = Math.min(cm.doc.height, bot + pixels + 50);
      updateDisplaySimple(cm, {top: top, bottom: bot});
    }

    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
        display.wheelDX = dx; display.wheelDY = dy;
        setTimeout(function() {
          if (display.wheelStartX == null) return;
          var movedX = scroll.scrollLeft - display.wheelStartX;
          var movedY = scroll.scrollTop - display.wheelStartY;
          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
            (movedX && display.wheelDX && movedX / display.wheelDX);
          display.wheelStartX = display.wheelStartY = null;
          if (!sample) return;
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
          ++wheelSamples;
        }, 200);
      } else {
        display.wheelDX += dx; display.wheelDY += dy;
      }
    }
  }

  // KEY EVENTS

  // Run a handler that was bound to a key.
  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == "string") {
      bound = commands[bound];
      if (!bound) return false;
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    cm.display.input.ensurePolled();
    var prevShift = cm.display.shift, done = false;
    try {
      if (isReadOnly(cm)) cm.state.suppressEdits = true;
      if (dropShift) cm.display.shift = false;
      done = bound(cm) != Pass;
    } finally {
      cm.display.shift = prevShift;
      cm.state.suppressEdits = false;
    }
    return done;
  }

  function lookupKeyForEditor(cm, name, handle) {
    for (var i = 0; i < cm.state.keyMaps.length; i++) {
      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
      if (result) return result;
    }
    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
      || lookupKey(name, cm.options.keyMap, handle, cm);
  }

  var stopSeq = new Delayed;
  function dispatchKey(cm, name, e, handle) {
    var seq = cm.state.keySeq;
    if (seq) {
      if (isModifierKey(name)) return "handled";
      stopSeq.set(50, function() {
        if (cm.state.keySeq == seq) {
          cm.state.keySeq = null;
          cm.display.input.reset();
        }
      });
      name = seq + " " + name;
    }
    var result = lookupKeyForEditor(cm, name, handle);

    if (result == "multi")
      cm.state.keySeq = name;
    if (result == "handled")
      signalLater(cm, "keyHandled", cm, name, e);

    if (result == "handled" || result == "multi") {
      e_preventDefault(e);
      restartBlink(cm);
    }

    if (seq && !result && /\'$/.test(name)) {
      e_preventDefault(e);
      return true;
    }
    return !!result;
  }

  // Handle a key from the keydown event.
  function handleKeyBinding(cm, e) {
    var name = keyName(e, true);
    if (!name) return false;

    if (e.shiftKey && !cm.state.keySeq) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      return dispatchKey(cm, "Shift-" + name, e, function(b) {return doHandleBinding(cm, b, true);})
          || dispatchKey(cm, name, e, function(b) {
               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
                 return doHandleBinding(cm, b);
             });
    } else {
      return dispatchKey(cm, name, e, function(b) { return doHandleBinding(cm, b); });
    }
  }

  // Handle a key from the keypress event
  function handleCharBinding(cm, e, ch) {
    return dispatchKey(cm, "'" + ch + "'", e,
                       function(b) { return doHandleBinding(cm, b, true); });
  }

  var lastStoppedKey = null;
  function onKeyDown(e) {
    var cm = this;
    ensureFocus(cm);
    if (signalDOMEvent(cm, e)) return;
    // IE does strange things with escape.
    if (ie && ie_version < 11 && e.keyCode == 27) e.returnValue = false;
    var code = e.keyCode;
    cm.display.shift = code == 16 || e.shiftKey;
    var handled = handleKeyBinding(cm, e);
    if (presto) {
      lastStoppedKey = handled ? code : null;
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        cm.replaceSelection("", null, "cut");
    }

    // Turn mouse into crosshair when Alt is held on Mac.
    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
      showCrossHair(cm);
  }

  function showCrossHair(cm) {
    var lineDiv = cm.display.lineDiv;
    addClass(lineDiv, "CodeMirror-crosshair");

    function up(e) {
      if (e.keyCode == 18 || !e.altKey) {
        rmClass(lineDiv, "CodeMirror-crosshair");
        off(document, "keyup", up);
        off(document, "mouseover", up);
      }
    }
    on(document, "keyup", up);
    on(document, "mouseover", up);
  }

  function onKeyUp(e) {
    if (e.keyCode == 16) this.doc.sel.shift = false;
    signalDOMEvent(this, e);
  }

  function onKeyPress(e) {
    var cm = this;
    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) return;
    var keyCode = e.keyCode, charCode = e.charCode;
    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return;}
    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) return;
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
    if (handleCharBinding(cm, e, ch)) return;
    cm.display.input.onKeyPress(e);
  }

  // FOCUS/BLUR EVENTS

  function onFocus(cm) {
    if (cm.options.readOnly == "nocursor") return;
    if (!cm.state.focused) {
      signal(cm, "focus", cm);
      cm.state.focused = true;
      addClass(cm.display.wrapper, "CodeMirror-focused");
      // This test prevents this from firing when a context
      // menu is closed (since the input reset would kill the
      // select-all detection hack)
      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
        cm.display.input.reset();
        if (webkit) setTimeout(function() { cm.display.input.reset(true); }, 20); // Issue #1730
      }
      cm.display.input.receivedFocus();
    }
    restartBlink(cm);
  }
  function onBlur(cm) {
    if (cm.state.focused) {
      signal(cm, "blur", cm);
      cm.state.focused = false;
      rmClass(cm.display.wrapper, "CodeMirror-focused");
    }
    clearInterval(cm.display.blinker);
    setTimeout(function() {if (!cm.state.focused) cm.display.shift = false;}, 150);
  }

  // CONTEXT MENU HANDLING

  // To make the context menu work, we need to briefly unhide the
  // textarea (making it as unobtrusive as possible) to let the
  // right-click take effect on it.
  function onContextMenu(cm, e) {
    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) return;
    cm.display.input.onContextMenu(e);
  }

  function contextMenuInGutter(cm, e) {
    if (!hasHandler(cm, "gutterContextMenu")) return false;
    return gutterEvent(cm, e, "gutterContextMenu", false, signal);
  }

  // UPDATING

  // Compute the position of the end of a change (its 'to' property
  // refers to the pre-change end).
  var changeEnd = CodeMirror.changeEnd = function(change) {
    if (!change.text) return change.to;
    return Pos(change.from.line + change.text.length - 1,
               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
  };

  // Adjust a position to refer to the post-change position of the
  // same text, or the end of the change if the change covers it.
  function adjustForChange(pos, change) {
    if (cmp(pos, change.from) < 0) return pos;
    if (cmp(pos, change.to) <= 0) return changeEnd(change);

    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
    if (pos.line == change.to.line) ch += changeEnd(change).ch - change.to.ch;
    return Pos(line, ch);
  }

  function computeSelAfterChange(doc, change) {
    var out = [];
    for (var i = 0; i < doc.sel.ranges.length; i++) {
      var range = doc.sel.ranges[i];
      out.push(new Range(adjustForChange(range.anchor, change),
                         adjustForChange(range.head, change)));
    }
    return normalizeSelection(out, doc.sel.primIndex);
  }

  function offsetPos(pos, old, nw) {
    if (pos.line == old.line)
      return Pos(nw.line, pos.ch - old.ch + nw.ch);
    else
      return Pos(nw.line + (pos.line - old.line), pos.ch);
  }

  // Used by replaceSelections to allow moving the selection to the
  // start or around the replaced test. Hint may be "start" or "around".
  function computeReplacedSel(doc, changes, hint) {
    var out = [];
    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var from = offsetPos(change.from, oldPrev, newPrev);
      var to = offsetPos(changeEnd(change), oldPrev, newPrev);
      oldPrev = change.to;
      newPrev = to;
      if (hint == "around") {
        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
        out[i] = new Range(inv ? to : from, inv ? from : to);
      } else {
        out[i] = new Range(from, from);
      }
    }
    return new Selection(out, doc.sel.primIndex);
  }

  // Allow "beforeChange" event handlers to influence a change
  function filterChange(doc, change, update) {
    var obj = {
      canceled: false,
      from: change.from,
      to: change.to,
      text: change.text,
      origin: change.origin,
      cancel: function() { this.canceled = true; }
    };
    if (update) obj.update = function(from, to, text, origin) {
      if (from) this.from = clipPos(doc, from);
      if (to) this.to = clipPos(doc, to);
      if (text) this.text = text;
      if (origin !== undefined) this.origin = origin;
    };
    signal(doc, "beforeChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeChange", doc.cm, obj);

    if (obj.canceled) return null;
    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin};
  }

  // Apply a change to a document, and add it to the document's
  // history, and propagating it to all linked documents.
  function makeChange(doc, change, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp) return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly);
      if (doc.cm.state.suppressEdits) return;
    }

    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
      change = filterChange(doc, change, true);
      if (!change) return;
    }

    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
    if (split) {
      for (var i = split.length - 1; i >= 0; --i)
        makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text});
    } else {
      makeChangeInner(doc, change);
    }
  }

  function makeChangeInner(doc, change) {
    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) return;
    var selAfter = computeSelAfterChange(doc, change);
    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
    var rebased = [];

    linkedDocs(doc, function(doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
    });
  }

  // Revert a change stored in a document's history.
  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
    if (doc.cm && doc.cm.state.suppressEdits) return;

    var hist = doc.history, event, selAfter = doc.sel;
    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

    // Verify that there is a useable event (so that ctrl-z won't
    // needlessly clear selection events)
    for (var i = 0; i < source.length; i++) {
      event = source[i];
      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
        break;
    }
    if (i == source.length) return;
    hist.lastOrigin = hist.lastSelOrigin = null;

    for (;;) {
      event = source.pop();
      if (event.ranges) {
        pushSelectionToHistory(event, dest);
        if (allowSelectionOnly && !event.equals(doc.sel)) {
          setSelection(doc, event, {clearRedo: false});
          return;
        }
        selAfter = event;
      }
      else break;
    }

    // Build up a reverse change object to add to the opposite history
    // stack (redo when undoing, and vice versa).
    var antiChanges = [];
    pushSelectionToHistory(selAfter, dest);
    dest.push({changes: antiChanges, generation: hist.generation});
    hist.generation = event.generation || ++hist.maxGeneration;

    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

    for (var i = event.changes.length - 1; i >= 0; --i) {
      var change = event.changes[i];
      change.origin = type;
      if (filter && !filterChange(doc, change, false)) {
        source.length = 0;
        return;
      }

      antiChanges.push(historyChangeFromChange(doc, change));

      var after = i ? computeSelAfterChange(doc, change) : lst(source);
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
      if (!i && doc.cm) doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)});
      var rebased = [];

      // Propagate to the linked documents
      linkedDocs(doc, function(doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
      });
    }
  }

  // Sub-views need their line numbers shifted when text is added
  // above or below them in the parent document.
  function shiftDoc(doc, distance) {
    if (distance == 0) return;
    doc.first += distance;
    doc.sel = new Selection(map(doc.sel.ranges, function(range) {
      return new Range(Pos(range.anchor.line + distance, range.anchor.ch),
                       Pos(range.head.line + distance, range.head.ch));
    }), doc.sel.primIndex);
    if (doc.cm) {
      regChange(doc.cm, doc.first, doc.first - distance, distance);
      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
        regLineChange(doc.cm, l, "gutter");
    }
  }

  // More lower-level change function, handling only a single document
  // (not linked ones).
  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);

    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
      return;
    }
    if (change.from.line > doc.lastLine()) return;

    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line);
      shiftDoc(doc, shift);
      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin};
    }
    var last = doc.lastLine();
    if (change.to.line > last) {
      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin};
    }

    change.removed = getBetween(doc, change.from, change.to);

    if (!selAfter) selAfter = computeSelAfterChange(doc, change);
    if (doc.cm) makeChangeSingleDocInEditor(doc.cm, change, spans);
    else updateDoc(doc, change, spans);
    setSelectionNoUndo(doc, selAfter, sel_dontScroll);
  }

  // Handle the interaction of a change to a document with the editor
  // that this document is part of.
  function makeChangeSingleDocInEditor(cm, change, spans) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

    var recomputeMaxLength = false, checkWidthStart = from.line;
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
      doc.iter(checkWidthStart, to.line + 1, function(line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true;
          return true;
        }
      });
    }

    if (doc.sel.contains(change.from, change.to) > -1)
      signalCursorActivity(cm);

    updateDoc(doc, change, spans, estimateHeight(cm));

    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function(line) {
        var len = lineLength(line);
        if (len > display.maxLineLength) {
          display.maxLine = line;
          display.maxLineLength = len;
          display.maxLineChanged = true;
          recomputeMaxLength = false;
        }
      });
      if (recomputeMaxLength) cm.curOp.updateMaxLine = true;
    }

    // Adjust frontier, schedule worker
    doc.frontier = Math.min(doc.frontier, from.line);
    startWorker(cm, 400);

    var lendiff = change.text.length - (to.line - from.line) - 1;
    // Remember that these lines changed, for updating the display
    if (change.full)
      regChange(cm);
    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
      regLineChange(cm, from.line, "text");
    else
      regChange(cm, from.line, to.line + 1, lendiff);

    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
    if (changeHandler || changesHandler) {
      var obj = {
        from: from, to: to,
        text: change.text,
        removed: change.removed,
        origin: change.origin
      };
      if (changeHandler) signalLater(cm, "change", cm, obj);
      if (changesHandler) (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj);
    }
    cm.display.selForContextMenu = null;
  }

  function replaceRange(doc, code, from, to, origin) {
    if (!to) to = from;
    if (cmp(to, from) < 0) { var tmp = to; to = from; from = tmp; }
    if (typeof code == "string") code = splitLines(code);
    makeChange(doc, {from: from, to: to, text: code, origin: origin});
  }

  // SCROLLING THINGS INTO VIEW

  // If an editor sits on the top or bottom of the window, partially
  // scrolled out of view, this ensures that the cursor is visible.
  function maybeScrollWindow(cm, coords) {
    if (signalDOMEvent(cm, "scrollCursorIntoView")) return;

    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
    if (coords.top + box.top < 0) doScroll = true;
    else if (coords.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) doScroll = false;
    if (doScroll != null && !phantom) {
      var scrollNode = elt("div", "\u200b", null, "position: absolute; top: " +
                           (coords.top - display.viewOffset - paddingTop(cm.display)) + "px; height: " +
                           (coords.bottom - coords.top + scrollGap(cm) + display.barHeight) + "px; left: " +
                           coords.left + "px; width: 2px;");
      cm.display.lineSpace.appendChild(scrollNode);
      scrollNode.scrollIntoView(doScroll);
      cm.display.lineSpace.removeChild(scrollNode);
    }
  }

  // Scroll a given position into view (immediately), verifying that
  // it actually became visible (as line heights are accurately
  // measured, the position of something may 'drift' during drawing).
  function scrollPosIntoView(cm, pos, end, margin) {
    if (margin == null) margin = 0;
    for (var limit = 0; limit < 5; limit++) {
      var changed = false, coords = cursorCoords(cm, pos);
      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
      var scrollPos = calculateScrollPos(cm, Math.min(coords.left, endCoords.left),
                                         Math.min(coords.top, endCoords.top) - margin,
                                         Math.max(coords.left, endCoords.left),
                                         Math.max(coords.bottom, endCoords.bottom) + margin);
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
      if (scrollPos.scrollTop != null) {
        setScrollTop(cm, scrollPos.scrollTop);
        if (Math.abs(cm.doc.scrollTop - startTop) > 1) changed = true;
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft);
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) changed = true;
      }
      if (!changed) break;
    }
    return coords;
  }

  // Scroll a given set of coordinates into view (immediately).
  function scrollIntoView(cm, x1, y1, x2, y2) {
    var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2);
    if (scrollPos.scrollTop != null) setScrollTop(cm, scrollPos.scrollTop);
    if (scrollPos.scrollLeft != null) setScrollLeft(cm, scrollPos.scrollLeft);
  }

  // Calculate a new scroll position needed to scroll the given
  // rectangle into view. Returns an object with scrollTop and
  // scrollLeft properties. When these are undefined, the
  // vertical/horizontal position does not need to be adjusted.
  function calculateScrollPos(cm, x1, y1, x2, y2) {
    var display = cm.display, snapMargin = textHeight(cm.display);
    if (y1 < 0) y1 = 0;
    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
    var screen = displayHeight(cm), result = {};
    if (y2 - y1 > screen) y2 = y1 + screen;
    var docBottom = cm.doc.height + paddingVert(display);
    var atTop = y1 < snapMargin, atBottom = y2 > docBottom - snapMargin;
    if (y1 < screentop) {
      result.scrollTop = atTop ? 0 : y1;
    } else if (y2 > screentop + screen) {
      var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen);
      if (newTop != screentop) result.scrollTop = newTop;
    }

    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
    var tooWide = x2 - x1 > screenw;
    if (tooWide) x2 = x1 + screenw;
    if (x1 < 10)
      result.scrollLeft = 0;
    else if (x1 < screenleft)
      result.scrollLeft = Math.max(0, x1 - (tooWide ? 0 : 10));
    else if (x2 > screenw + screenleft - 3)
      result.scrollLeft = x2 + (tooWide ? 0 : 10) - screenw;
    return result;
  }

  // Store a relative adjustment to the scroll position in the current
  // operation (to be applied when the operation finishes).
  function addToScrollPos(cm, left, top) {
    if (left != null || top != null) resolveScrollToPos(cm);
    if (left != null)
      cm.curOp.scrollLeft = (cm.curOp.scrollLeft == null ? cm.doc.scrollLeft : cm.curOp.scrollLeft) + left;
    if (top != null)
      cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
  }

  // Make sure that at the end of the operation the current cursor is
  // shown.
  function ensureCursorVisible(cm) {
    resolveScrollToPos(cm);
    var cur = cm.getCursor(), from = cur, to = cur;
    if (!cm.options.lineWrapping) {
      from = cur.ch ? Pos(cur.line, cur.ch - 1) : cur;
      to = Pos(cur.line, cur.ch + 1);
    }
    cm.curOp.scrollToPos = {from: from, to: to, margin: cm.options.cursorScrollMargin, isCursor: true};
  }

  // When an operation has its scrollToPos property set, and another
  // scroll action is applied before the end of the operation, this
  // 'simulates' scrolling that position into view in a cheap way, so
  // that the effect of intermediate scroll commands is not ignored.
  function resolveScrollToPos(cm) {
    var range = cm.curOp.scrollToPos;
    if (range) {
      cm.curOp.scrollToPos = null;
      var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to);
      var sPos = calculateScrollPos(cm, Math.min(from.left, to.left),
                                    Math.min(from.top, to.top) - range.margin,
                                    Math.max(from.right, to.right),
                                    Math.max(from.bottom, to.bottom) + range.margin);
      cm.scrollTo(sPos.scrollLeft, sPos.scrollTop);
    }
  }

  // API UTILITIES

  // Indent the given line. The how parameter can be "smart",
  // "add"/null, "subtract", or "prev". When aggressive is false
  // (typically set to true for forced single-line indents), empty
  // lines are not indented, and places where the mode returns Pass
  // are left alone.
  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc, state;
    if (how == null) how = "add";
    if (how == "smart") {
      // Fall back to "prev" when the mode doesn't have an indentation
      // method.
      if (!doc.mode.indent) how = "prev";
      else state = getStateBefore(cm, n);
    }

    var tabSize = cm.options.tabSize;
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
    if (line.stateAfter) line.stateAfter = null;
    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
    if (!aggressive && !/\S/.test(line.text)) {
      indentation = 0;
      how = "not";
    } else if (how == "smart") {
      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      if (indentation == Pass || indentation > 150) {
        if (!aggressive) return;
        how = "prev";
      }
    }
    if (how == "prev") {
      if (n > doc.first) indentation = countColumn(getLine(doc, n-1).text, null, tabSize);
      else indentation = 0;
    } else if (how == "add") {
      indentation = curSpace + cm.options.indentUnit;
    } else if (how == "subtract") {
      indentation = curSpace - cm.options.indentUnit;
    } else if (typeof how == "number") {
      indentation = curSpace + how;
    }
    indentation = Math.max(0, indentation);

    var indentString = "", pos = 0;
    if (cm.options.indentWithTabs)
      for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";}
    if (pos < indentation) indentString += spaceStr(indentation - pos);

    if (indentString != curSpaceString) {
      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
    } else {
      // Ensure that, if the cursor was in the whitespace at the start
      // of the line, it is moved to the end of that space.
      for (var i = 0; i < doc.sel.ranges.length; i++) {
        var range = doc.sel.ranges[i];
        if (range.head.line == n && range.head.ch < curSpaceString.length) {
          var pos = Pos(n, curSpaceString.length);
          replaceOneSelection(doc, i, new Range(pos, pos));
          break;
        }
      }
    }
    line.stateAfter = null;
  }

  // Utility for applying a change to a line by handle or number,
  // returning the number and optionally registering the line as
  // changed.
  function changeLine(doc, handle, changeType, op) {
    var no = handle, line = handle;
    if (typeof handle == "number") line = getLine(doc, clipLine(doc, handle));
    else no = lineNo(handle);
    if (no == null) return null;
    if (op(line, no) && doc.cm) regLineChange(doc.cm, no, changeType);
    return line;
  }

  // Helper for deleting text near the selection(s), used to implement
  // backspace, delete, and similar functionality.
  function deleteNearSelection(cm, compute) {
    var ranges = cm.doc.sel.ranges, kill = [];
    // Build up a set of ranges to kill first, merging overlapping
    // ranges.
    for (var i = 0; i < ranges.length; i++) {
      var toKill = compute(ranges[i]);
      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
        var replaced = kill.pop();
        if (cmp(replaced.from, toKill.from) < 0) {
          toKill.from = replaced.from;
          break;
        }
      }
      kill.push(toKill);
    }
    // Next, remove those actual ranges.
    runInOp(cm, function() {
      for (var i = kill.length - 1; i >= 0; i--)
        replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete");
      ensureCursorVisible(cm);
    });
  }

  // Used for horizontal relative motion. Dir is -1 or 1 (left or
  // right), unit can be "char", "column" (like char, but doesn't
  // cross line boundaries), "word" (across next word), or "group" (to
  // the start of next group of word or non-word-non-whitespace
  // chars). The visually param controls whether, in right-to-left
  // text, direction 1 means to move towards the next index in the
  // string, or towards the character to the right of the current
  // position. The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosH(doc, pos, dir, unit, visually) {
    var line = pos.line, ch = pos.ch, origDir = dir;
    var lineObj = getLine(doc, line);
    var possible = true;
    function findNextLine() {
      var l = line + dir;
      if (l < doc.first || l >= doc.first + doc.size) return (possible = false);
      line = l;
      return lineObj = getLine(doc, l);
    }
    function moveOnce(boundToLine) {
      var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true);
      if (next == null) {
        if (!boundToLine && findNextLine()) {
          if (visually) ch = (dir < 0 ? lineRight : lineLeft)(lineObj);
          else ch = dir < 0 ? lineObj.text.length : 0;
        } else return (possible = false);
      } else ch = next;
      return true;
    }

    if (unit == "char") moveOnce();
    else if (unit == "column") moveOnce(true);
    else if (unit == "word" || unit == "group") {
      var sawType = null, group = unit == "group";
      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first)) break;
        var cur = lineObj.text.charAt(ch) || "\n";
        var type = isWordChar(cur, helper) ? "w"
          : group && cur == "\n" ? "n"
          : !group || /\s/.test(cur) ? null
          : "p";
        if (group && !first && !type) type = "s";
        if (sawType && sawType != type) {
          if (dir < 0) {dir = 1; moveOnce();}
          break;
        }

        if (type) sawType = type;
        if (dir > 0 && !moveOnce(!first)) break;
      }
    }
    var result = skipAtomic(doc, Pos(line, ch), origDir, true);
    if (!possible) result.hitSide = true;
    return result;
  }

  // For relative vertical movement. Dir may be -1 or 1. Unit can be
  // "page" or "line". The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y;
    if (unit == "page") {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      y = pos.top + dir * (pageSize - (dir < 0 ? 1.5 : .5) * textHeight(cm.display));
    } else if (unit == "line") {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
    }
    for (;;) {
      var target = coordsChar(cm, x, y);
      if (!target.outside) break;
      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break; }
      y += dir * 5;
    }
    return target;
  }

  // EDITOR METHODS

  // The publicly visible API. Note that methodOp(f) means
  // 'wrap f in an operation, performed on its `this` parameter'.

  // This is not the complete set of editor methods. Most of the
  // methods defined on the Doc type are also injected into
  // CodeMirror.prototype, for backwards compatibility and
  // convenience.

  CodeMirror.prototype = {
    constructor: CodeMirror,
    focus: function(){window.focus(); this.display.input.focus();},

    setOption: function(option, value) {
      var options = this.options, old = options[option];
      if (options[option] == value && option != "mode") return;
      options[option] = value;
      if (optionHandlers.hasOwnProperty(option))
        operation(this, optionHandlers[option])(this, value, old);
    },

    getOption: function(option) {return this.options[option];},
    getDoc: function() {return this.doc;},

    addKeyMap: function(map, bottom) {
      this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map));
    },
    removeKeyMap: function(map) {
      var maps = this.state.keyMaps;
      for (var i = 0; i < maps.length; ++i)
        if (maps[i] == map || maps[i].name == map) {
          maps.splice(i, 1);
          return true;
        }
    },

    addOverlay: methodOp(function(spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
      if (mode.startState) throw new Error("Overlays may not be stateful.");
      this.state.overlays.push({mode: mode, modeSpec: spec, opaque: options && options.opaque});
      this.state.modeGen++;
      regChange(this);
    }),
    removeOverlay: methodOp(function(spec) {
      var overlays = this.state.overlays;
      for (var i = 0; i < overlays.length; ++i) {
        var cur = overlays[i].modeSpec;
        if (cur == spec || typeof spec == "string" && cur.name == spec) {
          overlays.splice(i, 1);
          this.state.modeGen++;
          regChange(this);
          return;
        }
      }
    }),

    indentLine: methodOp(function(n, dir, aggressive) {
      if (typeof dir != "string" && typeof dir != "number") {
        if (dir == null) dir = this.options.smartIndent ? "smart" : "prev";
        else dir = dir ? "add" : "subtract";
      }
      if (isLine(this.doc, n)) indentLine(this, n, dir, aggressive);
    }),
    indentSelection: methodOp(function(how) {
      var ranges = this.doc.sel.ranges, end = -1;
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (!range.empty()) {
          var from = range.from(), to = range.to();
          var start = Math.max(end, from.line);
          end = Math.min(this.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
          for (var j = start; j < end; ++j)
            indentLine(this, j, how);
          var newRanges = this.doc.sel.ranges;
          if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
            replaceOneSelection(this.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll);
        } else if (range.head.line > end) {
          indentLine(this, range.head.line, how, true);
          end = range.head.line;
          if (i == this.doc.sel.primIndex) ensureCursorVisible(this);
        }
      }
    }),

    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(pos, precise) {
      return takeToken(this, pos, precise);
    },

    getLineTokens: function(line, precise) {
      return takeToken(this, Pos(line), precise, true);
    },

    getTokenTypeAt: function(pos) {
      pos = clipPos(this.doc, pos);
      var styles = getLineStyles(this, getLine(this.doc, pos.line));
      var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
      var type;
      if (ch == 0) type = styles[2];
      else for (;;) {
        var mid = (before + after) >> 1;
        if ((mid ? styles[mid * 2 - 1] : 0) >= ch) after = mid;
        else if (styles[mid * 2 + 1] < ch) before = mid + 1;
        else { type = styles[mid * 2 + 2]; break; }
      }
      var cut = type ? type.indexOf("cm-overlay ") : -1;
      return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1);
    },

    getModeAt: function(pos) {
      var mode = this.doc.mode;
      if (!mode.innerMode) return mode;
      return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode;
    },

    getHelper: function(pos, type) {
      return this.getHelpers(pos, type)[0];
    },

    getHelpers: function(pos, type) {
      var found = [];
      if (!helpers.hasOwnProperty(type)) return helpers;
      var help = helpers[type], mode = this.getModeAt(pos);
      if (typeof mode[type] == "string") {
        if (help[mode[type]]) found.push(help[mode[type]]);
      } else if (mode[type]) {
        for (var i = 0; i < mode[type].length; i++) {
          var val = help[mode[type][i]];
          if (val) found.push(val);
        }
      } else if (mode.helperType && help[mode.helperType]) {
        found.push(help[mode.helperType]);
      } else if (help[mode.name]) {
        found.push(help[mode.name]);
      }
      for (var i = 0; i < help._global.length; i++) {
        var cur = help._global[i];
        if (cur.pred(mode, this) && indexOf(found, cur.val) == -1)
          found.push(cur.val);
      }
      return found;
    },

    getStateAfter: function(line, precise) {
      var doc = this.doc;
      line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
      return getStateBefore(this, line + 1, precise);
    },

    cursorCoords: function(start, mode) {
      var pos, range = this.doc.sel.primary();
      if (start == null) pos = range.head;
      else if (typeof start == "object") pos = clipPos(this.doc, start);
      else pos = start ? range.from() : range.to();
      return cursorCoords(this, pos, mode || "page");
    },

    charCoords: function(pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || "page");
    },

    coordsChar: function(coords, mode) {
      coords = fromCoordSystem(this, coords, mode || "page");
      return coordsChar(this, coords.left, coords.top);
    },

    lineAtHeight: function(height, mode) {
      height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
      return lineAtHeight(this.doc, height + this.display.viewOffset);
    },
    heightAtLine: function(line, mode) {
      var end = false, last = this.doc.first + this.doc.size - 1;
      if (line < this.doc.first) line = this.doc.first;
      else if (line > last) { line = last; end = true; }
      var lineObj = getLine(this.doc, line);
      return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page").top +
        (end ? this.doc.height - heightAtLine(lineObj) : 0);
    },

    defaultTextHeight: function() { return textHeight(this.display); },
    defaultCharWidth: function() { return charWidth(this.display); },

    setGutterMarker: methodOp(function(line, gutterID, value) {
      return changeLine(this.doc, line, "gutter", function(line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {});
        markers[gutterID] = value;
        if (!value && isEmpty(markers)) line.gutterMarkers = null;
        return true;
      });
    }),

    clearGutter: methodOp(function(gutterID) {
      var cm = this, doc = cm.doc, i = doc.first;
      doc.iter(function(line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          line.gutterMarkers[gutterID] = null;
          regLineChange(cm, i, "gutter");
          if (isEmpty(line.gutterMarkers)) line.gutterMarkers = null;
        }
        ++i;
      });
    }),

    addLineWidget: methodOp(function(handle, node, options) {
      return addLineWidget(this, handle, node, options);
    }),

    removeLineWidget: function(widget) { widget.clear(); },

    lineInfo: function(line) {
      if (typeof line == "number") {
        if (!isLine(this.doc, line)) return null;
        var n = line;
        line = getLine(this.doc, line);
        if (!line) return null;
      } else {
        var n = lineNo(line);
        if (n == null) return null;
      }
      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
              widgets: line.widgets};
    },

    getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo};},

    addWidget: function(pos, node, scroll, vert, horiz) {
      var display = this.display;
      pos = cursorCoords(this, clipPos(this.doc, pos));
      var top = pos.bottom, left = pos.left;
      node.style.position = "absolute";
      node.setAttribute("cm-ignore-events", "true");
      this.display.input.setUneditable(node);
      display.sizer.appendChild(node);
      if (vert == "over") {
        top = pos.top;
      } else if (vert == "above" || vert == "near") {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          top = pos.top - node.offsetHeight;
        else if (pos.bottom + node.offsetHeight <= vspace)
          top = pos.bottom;
        if (left + node.offsetWidth > hspace)
          left = hspace - node.offsetWidth;
      }
      node.style.top = top + "px";
      node.style.left = node.style.right = "";
      if (horiz == "right") {
        left = display.sizer.clientWidth - node.offsetWidth;
        node.style.right = "0px";
      } else {
        if (horiz == "left") left = 0;
        else if (horiz == "middle") left = (display.sizer.clientWidth - node.offsetWidth) / 2;
        node.style.left = left + "px";
      }
      if (scroll)
        scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight);
    },

    triggerOnKeyDown: methodOp(onKeyDown),
    triggerOnKeyPress: methodOp(onKeyPress),
    triggerOnKeyUp: onKeyUp,

    execCommand: function(cmd) {
      if (commands.hasOwnProperty(cmd))
        return commands[cmd](this);
    },

    findPosH: function(from, amount, unit, visually) {
      var dir = 1;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        cur = findPosH(this.doc, cur, dir, unit, visually);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveH: methodOp(function(dir, unit) {
      var cm = this;
      cm.extendSelectionsBy(function(range) {
        if (cm.display.shift || cm.doc.extend || range.empty())
          return findPosH(cm.doc, range.head, dir, unit, cm.options.rtlMoveVisually);
        else
          return dir < 0 ? range.from() : range.to();
      }, sel_move);
    }),

    deleteH: methodOp(function(dir, unit) {
      var sel = this.doc.sel, doc = this.doc;
      if (sel.somethingSelected())
        doc.replaceSelection("", null, "+delete");
      else
        deleteNearSelection(this, function(range) {
          var other = findPosH(doc, range.head, dir, unit, false);
          return dir < 0 ? {from: other, to: range.head} : {from: range.head, to: other};
        });
    }),

    findPosV: function(from, amount, unit, goalColumn) {
      var dir = 1, x = goalColumn;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        var coords = cursorCoords(this, cur, "div");
        if (x == null) x = coords.left;
        else coords.left = x;
        cur = findPosV(this, coords, dir, unit);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveV: methodOp(function(dir, unit) {
      var cm = this, doc = this.doc, goals = [];
      var collapse = !cm.display.shift && !doc.extend && doc.sel.somethingSelected();
      doc.extendSelectionsBy(function(range) {
        if (collapse)
          return dir < 0 ? range.from() : range.to();
        var headPos = cursorCoords(cm, range.head, "div");
        if (range.goalColumn != null) headPos.left = range.goalColumn;
        goals.push(headPos.left);
        var pos = findPosV(cm, headPos, dir, unit);
        if (unit == "page" && range == doc.sel.primary())
          addToScrollPos(cm, null, charCoords(cm, pos, "div").top - headPos.top);
        return pos;
      }, sel_move);
      if (goals.length) for (var i = 0; i < doc.sel.ranges.length; i++)
        doc.sel.ranges[i].goalColumn = goals[i];
    }),

    // Find the word at the given position (as returned by coordsChar).
    findWordAt: function(pos) {
      var doc = this.doc, line = getLine(doc, pos.line).text;
      var start = pos.ch, end = pos.ch;
      if (line) {
        var helper = this.getHelper(pos, "wordChars");
        if ((pos.xRel < 0 || end == line.length) && start) --start; else ++end;
        var startChar = line.charAt(start);
        var check = isWordChar(startChar, helper)
          ? function(ch) { return isWordChar(ch, helper); }
          : /\s/.test(startChar) ? function(ch) {return /\s/.test(ch);}
          : function(ch) {return !/\s/.test(ch) && !isWordChar(ch);};
        while (start > 0 && check(line.charAt(start - 1))) --start;
        while (end < line.length && check(line.charAt(end))) ++end;
      }
      return new Range(Pos(pos.line, start), Pos(pos.line, end));
    },

    toggleOverwrite: function(value) {
      if (value != null && value == this.state.overwrite) return;
      if (this.state.overwrite = !this.state.overwrite)
        addClass(this.display.cursorDiv, "CodeMirror-overwrite");
      else
        rmClass(this.display.cursorDiv, "CodeMirror-overwrite");

      signal(this, "overwriteToggle", this, this.state.overwrite);
    },
    hasFocus: function() { return this.display.input.getField() == activeElt(); },

    scrollTo: methodOp(function(x, y) {
      if (x != null || y != null) resolveScrollToPos(this);
      if (x != null) this.curOp.scrollLeft = x;
      if (y != null) this.curOp.scrollTop = y;
    }),
    getScrollInfo: function() {
      var scroller = this.display.scroller;
      return {left: scroller.scrollLeft, top: scroller.scrollTop,
              height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
              width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
              clientHeight: displayHeight(this), clientWidth: displayWidth(this)};
    },

    scrollIntoView: methodOp(function(range, margin) {
      if (range == null) {
        range = {from: this.doc.sel.primary().head, to: null};
        if (margin == null) margin = this.options.cursorScrollMargin;
      } else if (typeof range == "number") {
        range = {from: Pos(range, 0), to: null};
      } else if (range.from == null) {
        range = {from: range, to: null};
      }
      if (!range.to) range.to = range.from;
      range.margin = margin || 0;

      if (range.from.line != null) {
        resolveScrollToPos(this);
        this.curOp.scrollToPos = range;
      } else {
        var sPos = calculateScrollPos(this, Math.min(range.from.left, range.to.left),
                                      Math.min(range.from.top, range.to.top) - range.margin,
                                      Math.max(range.from.right, range.to.right),
                                      Math.max(range.from.bottom, range.to.bottom) + range.margin);
        this.scrollTo(sPos.scrollLeft, sPos.scrollTop);
      }
    }),

    setSize: methodOp(function(width, height) {
      var cm = this;
      function interpret(val) {
        return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val;
      }
      if (width != null) cm.display.wrapper.style.width = interpret(width);
      if (height != null) cm.display.wrapper.style.height = interpret(height);
      if (cm.options.lineWrapping) clearLineMeasurementCache(this);
      var lineNo = cm.display.viewFrom;
      cm.doc.iter(lineNo, cm.display.viewTo, function(line) {
        if (line.widgets) for (var i = 0; i < line.widgets.length; i++)
          if (line.widgets[i].noHScroll) { regLineChange(cm, lineNo, "widget"); break; }
        ++lineNo;
      });
      cm.curOp.forceUpdate = true;
      signal(cm, "refresh", this);
    }),

    operation: function(f){return runInOp(this, f);},

    refresh: methodOp(function() {
      var oldHeight = this.display.cachedTextHeight;
      regChange(this);
      this.curOp.forceUpdate = true;
      clearCaches(this);
      this.scrollTo(this.doc.scrollLeft, this.doc.scrollTop);
      updateGutterSpace(this);
      if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
        estimateLineHeights(this);
      signal(this, "refresh", this);
    }),

    swapDoc: methodOp(function(doc) {
      var old = this.doc;
      old.cm = null;
      attachDoc(this, doc);
      clearCaches(this);
      this.display.input.reset();
      this.scrollTo(doc.scrollLeft, doc.scrollTop);
      this.curOp.forceScroll = true;
      signalLater(this, "swapDoc", this, old);
      return old;
    }),

    getInputField: function(){return this.display.input.getField();},
    getWrapperElement: function(){return this.display.wrapper;},
    getScrollerElement: function(){return this.display.scroller;},
    getGutterElement: function(){return this.display.gutters;}
  };
  eventMixin(CodeMirror);

  // OPTION DEFAULTS

  // The default configuration options.
  var defaults = CodeMirror.defaults = {};
  // Functions to run when options are changed.
  var optionHandlers = CodeMirror.optionHandlers = {};

  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt;
    if (handle) optionHandlers[name] =
      notOnInit ? function(cm, val, old) {if (old != Init) handle(cm, val, old);} : handle;
  }

  // Passed to option handlers when there is no old value.
  var Init = CodeMirror.Init = {toString: function(){return "CodeMirror.Init";}};

  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option("value", "", function(cm, val) {
    cm.setValue(val);
  }, true);
  option("mode", null, function(cm, val) {
    cm.doc.modeOption = val;
    loadMode(cm);
  }, true);

  option("indentUnit", 2, loadMode, true);
  option("indentWithTabs", false);
  option("smartIndent", true);
  option("tabSize", 4, function(cm) {
    resetModeState(cm);
    clearCaches(cm);
    regChange(cm);
  }, true);
  option("specialChars", /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, function(cm, val) {
    cm.options.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
    cm.refresh();
  }, true);
  option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function(cm) {cm.refresh();}, true);
  option("electricChars", true);
  option("inputStyle", mobile ? "contenteditable" : "textarea", function() {
    throw new Error("inputStyle can not (yet) be changed in a running editor"); // FIXME
  }, true);
  option("rtlMoveVisually", !windows);
  option("wholeLineUpdateBefore", true);

  option("theme", "default", function(cm) {
    themeChanged(cm);
    guttersChanged(cm);
  }, true);
  option("keyMap", "default", function(cm, val, old) {
    var next = getKeyMap(val);
    var prev = old != CodeMirror.Init && getKeyMap(old);
    if (prev && prev.detach) prev.detach(cm, next);
    if (next.attach) next.attach(cm, prev || null);
  });
  option("extraKeys", null);

  option("lineWrapping", false, wrappingChanged, true);
  option("gutters", [], function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("fixedGutter", true, function(cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
    cm.refresh();
  }, true);
  option("coverGutterNextToScrollbar", false, function(cm) {updateScrollbars(cm);}, true);
  option("scrollbarStyle", "native", function(cm) {
    initScrollbars(cm);
    updateScrollbars(cm);
    cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
    cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
  }, true);
  option("lineNumbers", false, function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("firstLineNumber", 1, guttersChanged, true);
  option("lineNumberFormatter", function(integer) {return integer;}, guttersChanged, true);
  option("showCursorWhenSelecting", false, updateSelection, true);

  option("resetSelectionOnContextMenu", true);

  option("readOnly", false, function(cm, val) {
    if (val == "nocursor") {
      onBlur(cm);
      cm.display.input.blur();
      cm.display.disabled = true;
    } else {
      cm.display.disabled = false;
      if (!val) cm.display.input.reset();
    }
  });
  option("disableInput", false, function(cm, val) {if (!val) cm.display.input.reset();}, true);
  option("dragDrop", true);

  option("cursorBlinkRate", 530);
  option("cursorScrollMargin", 0);
  option("cursorHeight", 1, updateSelection, true);
  option("singleCursorHeightPerLine", true, updateSelection, true);
  option("workTime", 100);
  option("workDelay", 100);
  option("flattenSpans", true, resetModeState, true);
  option("addModeClass", false, resetModeState, true);
  option("pollInterval", 100);
  option("undoDepth", 200, function(cm, val){cm.doc.history.undoDepth = val;});
  option("historyEventDelay", 1250);
  option("viewportMargin", 10, function(cm){cm.refresh();}, true);
  option("maxHighlightLength", 10000, resetModeState, true);
  option("moveInputWithCursor", true, function(cm, val) {
    if (!val) cm.display.input.resetPosition();
  });

  option("tabindex", null, function(cm, val) {
    cm.display.input.getField().tabIndex = val || "";
  });
  option("autofocus", null);

  // MODE DEFINITION AND QUERYING

  // Known modes, by name and by MIME
  var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};

  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  CodeMirror.defineMode = function(name, mode) {
    if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
    if (arguments.length > 2)
      mode.dependencies = Array.prototype.slice.call(arguments, 2);
    modes[name] = mode;
  };

  CodeMirror.defineMIME = function(mime, spec) {
    mimeModes[mime] = spec;
  };

  // Given a MIME type, a {name, ...options} config object, or a name
  // string, return a mode config object.
  CodeMirror.resolveMode = function(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec];
    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name];
      if (typeof found == "string") found = {name: found};
      spec = createObj(found, spec);
      spec.name = found.name;
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return CodeMirror.resolveMode("application/xml");
    }
    if (typeof spec == "string") return {name: spec};
    else return spec || {name: "null"};
  };

  // Given a mode spec (anything that resolveMode accepts), find and
  // initialize an actual mode object.
  CodeMirror.getMode = function(options, spec) {
    var spec = CodeMirror.resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory) return CodeMirror.getMode(options, "text/plain");
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) continue;
        if (modeObj.hasOwnProperty(prop)) modeObj["_" + prop] = modeObj[prop];
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    if (spec.helperType) modeObj.helperType = spec.helperType;
    if (spec.modeProps) for (var prop in spec.modeProps)
      modeObj[prop] = spec.modeProps[prop];

    return modeObj;
  };

  // Minimal default mode.
  CodeMirror.defineMode("null", function() {
    return {token: function(stream) {stream.skipToEnd();}};
  });
  CodeMirror.defineMIME("text/plain", "null");

  // This can be used to attach properties to mode objects from
  // outside the actual mode definition.
  var modeExtensions = CodeMirror.modeExtensions = {};
  CodeMirror.extendMode = function(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
    copyObj(properties, exts);
  };

  // EXTENSIONS

  CodeMirror.defineExtension = function(name, func) {
    CodeMirror.prototype[name] = func;
  };
  CodeMirror.defineDocExtension = function(name, func) {
    Doc.prototype[name] = func;
  };
  CodeMirror.defineOption = option;

  var initHooks = [];
  CodeMirror.defineInitHook = function(f) {initHooks.push(f);};

  var helpers = CodeMirror.helpers = {};
  CodeMirror.registerHelper = function(type, name, value) {
    if (!helpers.hasOwnProperty(type)) helpers[type] = CodeMirror[type] = {_global: []};
    helpers[type][name] = value;
  };
  CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
    CodeMirror.registerHelper(type, name, value);
    helpers[type]._global.push({pred: predicate, val: value});
  };

  // MODE STATE HANDLING

  // Utility functions for working with state. Exported because nested
  // modes need to do this for their inner modes.

  var copyState = CodeMirror.copyState = function(mode, state) {
    if (state === true) return state;
    if (mode.copyState) return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  };

  var startState = CodeMirror.startState = function(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  };

  // Given a mode and a state (for that mode), find the inner mode and
  // state at the position that the state refers to.
  CodeMirror.innerMode = function(mode, state) {
    while (mode.innerMode) {
      var info = mode.innerMode(state);
      if (!info || info.mode == mode) break;
      state = info.state;
      mode = info.mode;
    }
    return info || {mode: mode, state: state};
  };

  // STANDARD COMMANDS

  // Commands are parameter-less actions that can be performed on an
  // editor, mostly used for keybindings.
  var commands = CodeMirror.commands = {
    selectAll: function(cm) {cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);},
    singleSelection: function(cm) {
      cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll);
    },
    killLine: function(cm) {
      deleteNearSelection(cm, function(range) {
        if (range.empty()) {
          var len = getLine(cm.doc, range.head.line).text.length;
          if (range.head.ch == len && range.head.line < cm.lastLine())
            return {from: range.head, to: Pos(range.head.line + 1, 0)};
          else
            return {from: range.head, to: Pos(range.head.line, len)};
        } else {
          return {from: range.from(), to: range.to()};
        }
      });
    },
    deleteLine: function(cm) {
      deleteNearSelection(cm, function(range) {
        return {from: Pos(range.from().line, 0),
                to: clipPos(cm.doc, Pos(range.to().line + 1, 0))};
      });
    },
    delLineLeft: function(cm) {
      deleteNearSelection(cm, function(range) {
        return {from: Pos(range.from().line, 0), to: range.from()};
      });
    },
    delWrappedLineLeft: function(cm) {
      deleteNearSelection(cm, function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var leftPos = cm.coordsChar({left: 0, top: top}, "div");
        return {from: leftPos, to: range.from()};
      });
    },
    delWrappedLineRight: function(cm) {
      deleteNearSelection(cm, function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
        return {from: range.from(), to: rightPos };
      });
    },
    undo: function(cm) {cm.undo();},
    redo: function(cm) {cm.redo();},
    undoSelection: function(cm) {cm.undoSelection();},
    redoSelection: function(cm) {cm.redoSelection();},
    goDocStart: function(cm) {cm.extendSelection(Pos(cm.firstLine(), 0));},
    goDocEnd: function(cm) {cm.extendSelection(Pos(cm.lastLine()));},
    goLineStart: function(cm) {
      cm.extendSelectionsBy(function(range) { return lineStart(cm, range.head.line); },
                            {origin: "+move", bias: 1});
    },
    goLineStartSmart: function(cm) {
      cm.extendSelectionsBy(function(range) {
        return lineStartSmart(cm, range.head);
      }, {origin: "+move", bias: 1});
    },
    goLineEnd: function(cm) {
      cm.extendSelectionsBy(function(range) { return lineEnd(cm, range.head.line); },
                            {origin: "+move", bias: -1});
    },
    goLineRight: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
      }, sel_move);
    },
    goLineLeft: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: 0, top: top}, "div");
      }, sel_move);
    },
    goLineLeftSmart: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var pos = cm.coordsChar({left: 0, top: top}, "div");
        if (pos.ch < cm.getLine(pos.line).search(/\S/)) return lineStartSmart(cm, range.head);
        return pos;
      }, sel_move);
    },
    goLineUp: function(cm) {cm.moveV(-1, "line");},
    goLineDown: function(cm) {cm.moveV(1, "line");},
    goPageUp: function(cm) {cm.moveV(-1, "page");},
    goPageDown: function(cm) {cm.moveV(1, "page");},
    goCharLeft: function(cm) {cm.moveH(-1, "char");},
    goCharRight: function(cm) {cm.moveH(1, "char");},
    goColumnLeft: function(cm) {cm.moveH(-1, "column");},
    goColumnRight: function(cm) {cm.moveH(1, "column");},
    goWordLeft: function(cm) {cm.moveH(-1, "word");},
    goGroupRight: function(cm) {cm.moveH(1, "group");},
    goGroupLeft: function(cm) {cm.moveH(-1, "group");},
    goWordRight: function(cm) {cm.moveH(1, "word");},
    delCharBefore: function(cm) {cm.deleteH(-1, "char");},
    delCharAfter: function(cm) {cm.deleteH(1, "char");},
    delWordBefore: function(cm) {cm.deleteH(-1, "word");},
    delWordAfter: function(cm) {cm.deleteH(1, "word");},
    delGroupBefore: function(cm) {cm.deleteH(-1, "group");},
    delGroupAfter: function(cm) {cm.deleteH(1, "group");},
    indentAuto: function(cm) {cm.indentSelection("smart");},
    indentMore: function(cm) {cm.indentSelection("add");},
    indentLess: function(cm) {cm.indentSelection("subtract");},
    insertTab: function(cm) {cm.replaceSelection("\t");},
    insertSoftTab: function(cm) {
      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
      for (var i = 0; i < ranges.length; i++) {
        var pos = ranges[i].from();
        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
        spaces.push(new Array(tabSize - col % tabSize + 1).join(" "));
      }
      cm.replaceSelections(spaces);
    },
    defaultTab: function(cm) {
      if (cm.somethingSelected()) cm.indentSelection("add");
      else cm.execCommand("insertTab");
    },
    transposeChars: function(cm) {
      runInOp(cm, function() {
        var ranges = cm.listSelections(), newSel = [];
        for (var i = 0; i < ranges.length; i++) {
          var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
          if (line) {
            if (cur.ch == line.length) cur = new Pos(cur.line, cur.ch - 1);
            if (cur.ch > 0) {
              cur = new Pos(cur.line, cur.ch + 1);
              cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                              Pos(cur.line, cur.ch - 2), cur, "+transpose");
            } else if (cur.line > cm.doc.first) {
              var prev = getLine(cm.doc, cur.line - 1).text;
              if (prev)
                cm.replaceRange(line.charAt(0) + "\n" + prev.charAt(prev.length - 1),
                                Pos(cur.line - 1, prev.length - 1), Pos(cur.line, 1), "+transpose");
            }
          }
          newSel.push(new Range(cur, cur));
        }
        cm.setSelections(newSel);
      });
    },
    newlineAndIndent: function(cm) {
      runInOp(cm, function() {
        var len = cm.listSelections().length;
        for (var i = 0; i < len; i++) {
          var range = cm.listSelections()[i];
          cm.replaceRange("\n", range.anchor, range.head, "+input");
          cm.indentLine(range.from().line + 1, null, true);
          ensureCursorVisible(cm);
        }
      });
    },
    toggleOverwrite: function(cm) {cm.toggleOverwrite();}
  };


  // STANDARD KEYMAPS

  var keyMap = CodeMirror.keyMap = {};

  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
    "Esc": "singleSelection"
  };
  // Note that the save and find-related commands aren't defined by
  // default. User code or addons can define them. Unknown commands
  // are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
    fallthrough: "basic"
  };
  // Very basic readline/emacs-style bindings, which are standard on Mac.
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars"
  };
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
    fallthrough: ["basic", "emacsy"]
  };
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

  // KEYMAP DISPATCH

  function normalizeKeyName(name) {
    var parts = name.split(/-(?!$)/), name = parts[parts.length - 1];
    var alt, ctrl, shift, cmd;
    for (var i = 0; i < parts.length - 1; i++) {
      var mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod)) cmd = true;
      else if (/^a(lt)?$/i.test(mod)) alt = true;
      else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
      else if (/^s(hift)$/i.test(mod)) shift = true;
      else throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt) name = "Alt-" + name;
    if (ctrl) name = "Ctrl-" + name;
    if (cmd) name = "Cmd-" + name;
    if (shift) name = "Shift-" + name;
    return name;
  }

  // This is a kludge to keep keymaps mostly working as raw objects
  // (backwards compatibility) while at the same time support features
  // like normalization and multi-stroke key bindings. It compiles a
  // new normalized keymap, and then updates the old object to reflect
  // this.
  CodeMirror.normalizeKeyMap = function(keymap) {
    var copy = {};
    for (var keyname in keymap) if (keymap.hasOwnProperty(keyname)) {
      var value = keymap[keyname];
      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) continue;
      if (value == "...") { delete keymap[keyname]; continue; }

      var keys = map(keyname.split(" "), normalizeKeyName);
      for (var i = 0; i < keys.length; i++) {
        var val, name;
        if (i == keys.length - 1) {
          name = keyname;
          val = value;
        } else {
          name = keys.slice(0, i + 1).join(" ");
          val = "...";
        }
        var prev = copy[name];
        if (!prev) copy[name] = val;
        else if (prev != val) throw new Error("Inconsistent bindings for " + name);
      }
      delete keymap[keyname];
    }
    for (var prop in copy) keymap[prop] = copy[prop];
    return keymap;
  };

  var lookupKey = CodeMirror.lookupKey = function(key, map, handle, context) {
    map = getKeyMap(map);
    var found = map.call ? map.call(key, context) : map[key];
    if (found === false) return "nothing";
    if (found === "...") return "multi";
    if (found != null && handle(found)) return "handled";

    if (map.fallthrough) {
      if (Object.prototype.toString.call(map.fallthrough) != "[object Array]")
        return lookupKey(key, map.fallthrough, handle, context);
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle, context);
        if (result) return result;
      }
    }
  };

  // Modifier key presses don't count as 'real' key presses for the
  // purpose of keymap fallthrough.
  var isModifierKey = CodeMirror.isModifierKey = function(value) {
    var name = typeof value == "string" ? value : keyNames[value.keyCode];
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
  };

  // Look up the name of a key as indicated by an event object.
  var keyName = CodeMirror.keyName = function(event, noShift) {
    if (presto && event.keyCode == 34 && event["char"]) return false;
    var base = keyNames[event.keyCode], name = base;
    if (name == null || event.altGraphKey) return false;
    if (event.altKey && base != "Alt") name = "Alt-" + name;
    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") name = "Ctrl-" + name;
    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") name = "Cmd-" + name;
    if (!noShift && event.shiftKey && base != "Shift") name = "Shift-" + name;
    return name;
  };

  function getKeyMap(val) {
    return typeof val == "string" ? keyMap[val] : val;
  }

  // FROMTEXTAREA

  CodeMirror.fromTextArea = function(textarea, options) {
    options = options ? copyObj(options) : {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabIndex)
      options.tabindex = textarea.tabIndex;
    if (!options.placeholder && textarea.placeholder)
      options.placeholder = textarea.placeholder;
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = activeElt();
      options.autofocus = hasFocus == textarea ||
        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
    }

    function save() {textarea.value = cm.getValue();}
    if (textarea.form) {
      on(textarea.form, "submit", save);
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form, realSubmit = form.submit;
        try {
          var wrappedSubmit = form.submit = function() {
            save();
            form.submit = realSubmit;
            form.submit();
            form.submit = wrappedSubmit;
          };
        } catch(e) {}
      }
    }

    options.finishInit = function(cm) {
      cm.save = save;
      cm.getTextArea = function() { return textarea; };
      cm.toTextArea = function() {
        cm.toTextArea = isNaN; // Prevent this from being ran twice
        save();
        textarea.parentNode.removeChild(cm.getWrapperElement());
        textarea.style.display = "";
        if (textarea.form) {
          off(textarea.form, "submit", save);
          if (typeof textarea.form.submit == "function")
            textarea.form.submit = realSubmit;
        }
      };
    };

    textarea.style.display = "none";
    var cm = CodeMirror(function(node) {
      textarea.parentNode.insertBefore(node, textarea.nextSibling);
    }, options);
    return cm;
  };

  // STRING STREAM

  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.

  var StringStream = CodeMirror.StringStream = function(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
    this.lineStart = 0;
  };

  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == this.lineStart;},
    peek: function() {return this.string.charAt(this.pos) || undefined;},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") var ok = ch == match;
      else var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {
      if (this.lastColumnPos < this.start) {
        this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
        this.lastColumnPos = this.start;
      }
      return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    indentation: function() {
      return countColumn(this.string, null, this.tabSize) -
        (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
        var substr = this.string.substr(this.pos, pattern.length);
        if (cased(substr) == cased(pattern)) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0) return null;
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);},
    hideFirstChars: function(n, inner) {
      this.lineStart += n;
      try { return inner(); }
      finally { this.lineStart -= n; }
    }
  };

  // TEXTMARKERS

  // Created with markText and setBookmark methods. A TextMarker is a
  // handle that can be used to clear or find a marked position in the
  // document. Line objects hold arrays (markedSpans) containing
  // {from, to, marker} object pointing to such marker objects, and
  // indicating that such a marker is present on that line. Multiple
  // lines may point to the same marker when it spans across lines.
  // The spans will have null for their from/to properties when the
  // marker continues beyond the start/end of the line. Markers have
  // links back to the lines they currently touch.

  var nextMarkerId = 0;

  var TextMarker = CodeMirror.TextMarker = function(doc, type) {
    this.lines = [];
    this.type = type;
    this.doc = doc;
    this.id = ++nextMarkerId;
  };
  eventMixin(TextMarker);

  // Clear the marker.
  TextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    var cm = this.doc.cm, withOp = cm && !cm.curOp;
    if (withOp) startOperation(cm);
    if (hasHandler(this, "clear")) {
      var found = this.find();
      if (found) signalLater(this, "clear", found.from, found.to);
    }
    var min = null, max = null;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (cm && !this.collapsed) regLineChange(cm, lineNo(line), "text");
      else if (cm) {
        if (span.to != null) max = lineNo(line);
        if (span.from != null) min = lineNo(line);
      }
      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
      if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm)
        updateLineHeight(line, textHeight(cm.display));
    }
    if (cm && this.collapsed && !cm.options.lineWrapping) for (var i = 0; i < this.lines.length; ++i) {
      var visual = visualLine(this.lines[i]), len = lineLength(visual);
      if (len > cm.display.maxLineLength) {
        cm.display.maxLine = visual;
        cm.display.maxLineLength = len;
        cm.display.maxLineChanged = true;
      }
    }

    if (min != null && cm && this.collapsed) regChange(cm, min, max + 1);
    this.lines.length = 0;
    this.explicitlyCleared = true;
    if (this.atomic && this.doc.cantEdit) {
      this.doc.cantEdit = false;
      if (cm) reCheckSelection(cm.doc);
    }
    if (cm) signalLater(cm, "markerCleared", cm, this);
    if (withOp) endOperation(cm);
    if (this.parent) this.parent.clear();
  };

  // Find the position of the marker in the document. Returns a {from,
  // to} object by default. Side can be passed to get a specific side
  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
  // Pos objects returned contain a line object, rather than a line
  // number (used to prevent looking up the same line twice).
  TextMarker.prototype.find = function(side, lineObj) {
    if (side == null && this.type == "bookmark") side = 1;
    var from, to;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.from != null) {
        from = Pos(lineObj ? line : lineNo(line), span.from);
        if (side == -1) return from;
      }
      if (span.to != null) {
        to = Pos(lineObj ? line : lineNo(line), span.to);
        if (side == 1) return to;
      }
    }
    return from && {from: from, to: to};
  };

  // Signals that the marker's widget changed, and surrounding layout
  // should be recomputed.
  TextMarker.prototype.changed = function() {
    var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
    if (!pos || !cm) return;
    runInOp(cm, function() {
      var line = pos.line, lineN = lineNo(pos.line);
      var view = findViewForLine(cm, lineN);
      if (view) {
        clearLineMeasurementCacheFor(view);
        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
      }
      cm.curOp.updateMaxLine = true;
      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
        var oldHeight = widget.height;
        widget.height = null;
        var dHeight = widgetHeight(widget) - oldHeight;
        if (dHeight)
          updateLineHeight(line, line.height + dHeight);
      }
    });
  };

  TextMarker.prototype.attachLine = function(line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
    }
    this.lines.push(line);
  };
  TextMarker.prototype.detachLine = function(line) {
    this.lines.splice(indexOf(this.lines, line), 1);
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
    }
  };

  // Collapsed markers have unique ids, in order to be able to order
  // them, which is needed for uniquely determining an outer marker
  // when they overlap (they may nest, but not partially overlap).
  var nextMarkerId = 0;

  // Create a marker, wire it up to the right lines, and
  function markText(doc, from, to, options, type) {
    // Shared markers (across linked documents) are handled separately
    // (markTextShared will call out to this again, once per
    // document).
    if (options && options.shared) return markTextShared(doc, from, to, options, type);
    // Ensure we are in an operation.
    if (doc.cm && !doc.cm.curOp) return operation(doc.cm, markText)(doc, from, to, options, type);

    var marker = new TextMarker(doc, type), diff = cmp(from, to);
    if (options) copyObj(options, marker, false);
    // Don't connect empty markers unless clearWhenEmpty is false
    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
      return marker;
    if (marker.replacedWith) {
      // Showing up as a widget implies collapsed (widget replaces text)
      marker.collapsed = true;
      marker.widgetNode = elt("span", [marker.replacedWith], "CodeMirror-widget");
      if (!options.handleMouseEvents) marker.widgetNode.setAttribute("cm-ignore-events", "true");
      if (options.insertLeft) marker.widgetNode.insertLeft = true;
    }
    if (marker.collapsed) {
      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
        throw new Error("Inserting collapsed marker partially overlapping an existing one");
      sawCollapsedSpans = true;
    }

    if (marker.addToHistory)
      addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN);

    var curLine = from.line, cm = doc.cm, updateMaxLine;
    doc.iter(curLine, to.line + 1, function(line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
        updateMaxLine = true;
      if (marker.collapsed && curLine != from.line) updateLineHeight(line, 0);
      addMarkedSpan(line, new MarkedSpan(marker,
                                         curLine == from.line ? from.ch : null,
                                         curLine == to.line ? to.ch : null));
      ++curLine;
    });
    // lineIsHidden depends on the presence of the spans, so needs a second pass
    if (marker.collapsed) doc.iter(from.line, to.line + 1, function(line) {
      if (lineIsHidden(doc, line)) updateLineHeight(line, 0);
    });

    if (marker.clearOnEnter) on(marker, "beforeCursorEnter", function() { marker.clear(); });

    if (marker.readOnly) {
      sawReadOnlySpans = true;
      if (doc.history.done.length || doc.history.undone.length)
        doc.clearHistory();
    }
    if (marker.collapsed) {
      marker.id = ++nextMarkerId;
      marker.atomic = true;
    }
    if (cm) {
      // Sync editor state
      if (updateMaxLine) cm.curOp.updateMaxLine = true;
      if (marker.collapsed)
        regChange(cm, from.line, to.line + 1);
      else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
        for (var i = from.line; i <= to.line; i++) regLineChange(cm, i, "text");
      if (marker.atomic) reCheckSelection(cm.doc);
      signalLater(cm, "markerAdded", cm, marker);
    }
    return marker;
  }

  // SHARED TEXTMARKERS

  // A shared marker spans multiple linked documents. It is
  // implemented as a meta-marker-object controlling multiple normal
  // markers.
  var SharedTextMarker = CodeMirror.SharedTextMarker = function(markers, primary) {
    this.markers = markers;
    this.primary = primary;
    for (var i = 0; i < markers.length; ++i)
      markers[i].parent = this;
  };
  eventMixin(SharedTextMarker);

  SharedTextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    this.explicitlyCleared = true;
    for (var i = 0; i < this.markers.length; ++i)
      this.markers[i].clear();
    signalLater(this, "clear");
  };
  SharedTextMarker.prototype.find = function(side, lineObj) {
    return this.primary.find(side, lineObj);
  };

  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options);
    options.shared = false;
    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
    var widget = options.widgetNode;
    linkedDocs(doc, function(doc) {
      if (widget) options.widgetNode = widget.cloneNode(true);
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
      for (var i = 0; i < doc.linked.length; ++i)
        if (doc.linked[i].isParent) return;
      primary = lst(markers);
    });
    return new SharedTextMarker(markers, primary);
  }

  function findSharedMarkers(doc) {
    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())),
                         function(m) { return m.parent; });
  }

  function copySharedMarkers(doc, markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], pos = marker.find();
      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
      if (cmp(mFrom, mTo)) {
        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
        marker.markers.push(subMark);
        subMark.parent = marker;
      }
    }
  }

  function detachSharedMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], linked = [marker.primary.doc];;
      linkedDocs(marker.primary.doc, function(d) { linked.push(d); });
      for (var j = 0; j < marker.markers.length; j++) {
        var subMarker = marker.markers[j];
        if (indexOf(linked, subMarker.doc) == -1) {
          subMarker.parent = null;
          marker.markers.splice(j--, 1);
        }
      }
    }
  }

  // TEXTMARKER SPANS

  function MarkedSpan(marker, from, to) {
    this.marker = marker;
    this.from = from; this.to = to;
  }

  // Search an array of spans for a span matching the given marker.
  function getMarkedSpanFor(spans, marker) {
    if (spans) for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.marker == marker) return span;
    }
  }
  // Remove a span from an array, returning undefined if no spans are
  // left (we don't store arrays for lines without spans).
  function removeMarkedSpan(spans, span) {
    for (var r, i = 0; i < spans.length; ++i)
      if (spans[i] != span) (r || (r = [])).push(spans[i]);
    return r;
  }
  // Add a span to a line.
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
    span.marker.attachLine(line);
  }

  // Used for the algorithm that adjusts markers for a change in the
  // document. These functions cut an array of spans at a given
  // character position, returning an array of remaining chunks (or
  // undefined if nothing remains).
  function markedSpansBefore(old, startCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);
        (nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
      }
    }
    return nw;
  }
  function markedSpansAfter(old, endCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);
        (nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                              span.to == null ? null : span.to - endCh));
      }
    }
    return nw;
  }

  // Given a change object, compute the new set of marker spans that
  // cover the line in which the change took place. Removes spans
  // entirely within the change, reconnects spans belonging to the
  // same marker that appear on both sides of the change, and cuts off
  // spans partially within the change. Returns an array of span
  // arrays with one element for each line in (after) the change.
  function stretchSpansOverChange(doc, change) {
    if (change.full) return null;
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
    if (!oldFirst && !oldLast) return null;

    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert);
    var last = markedSpansAfter(oldLast, endCh, isInsert);

    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i];
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker);
          if (!found) span.to = startCh;
          else if (sameLine) span.to = found.to == null ? null : found.to + offset;
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i = 0; i < last.length; ++i) {
        var span = last[i];
        if (span.to != null) span.to += offset;
        if (span.from == null) {
          var found = getMarkedSpanFor(first, span.marker);
          if (!found) {
            span.from = offset;
            if (sameLine) (first || (first = [])).push(span);
          }
        } else {
          span.from += offset;
          if (sameLine) (first || (first = [])).push(span);
        }
      }
    }
    // Make sure we didn't create any zero-length spans
    if (first) first = clearEmptySpans(first);
    if (last && last != first) last = clearEmptySpans(last);

    var newMarkers = [first];
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers;
      if (gap > 0 && first)
        for (var i = 0; i < first.length; ++i)
          if (first[i].to == null)
            (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i].marker, null, null));
      for (var i = 0; i < gap; ++i)
        newMarkers.push(gapMarkers);
      newMarkers.push(last);
    }
    return newMarkers;
  }

  // Remove spans that are empty and don't have a clearWhenEmpty
  // option of false.
  function clearEmptySpans(spans) {
    for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
        spans.splice(i--, 1);
    }
    if (!spans.length) return null;
    return spans;
  }

  // Used for un/re-doing changes from the history. Combines the
  // result of computing the existing spans with the set of spans that
  // existed in the history (so that deleting around a span and then
  // undoing brings back the span).
  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change);
    var stretched = stretchSpansOverChange(doc, change);
    if (!old) return stretched;
    if (!stretched) return old;

    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i];
      if (oldCur && stretchCur) {
        spans: for (var j = 0; j < stretchCur.length; ++j) {
          var span = stretchCur[j];
          for (var k = 0; k < oldCur.length; ++k)
            if (oldCur[k].marker == span.marker) continue spans;
          oldCur.push(span);
        }
      } else if (stretchCur) {
        old[i] = stretchCur;
      }
    }
    return old;
  }

  // Used to 'clip' out readOnly ranges when making a change.
  function removeReadOnlyRanges(doc, from, to) {
    var markers = null;
    doc.iter(from.line, to.line + 1, function(line) {
      if (line.markedSpans) for (var i = 0; i < line.markedSpans.length; ++i) {
        var mark = line.markedSpans[i].marker;
        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
          (markers || (markers = [])).push(mark);
      }
    });
    if (!markers) return null;
    var parts = [{from: from, to: to}];
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find(0);
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j];
        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) continue;
        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
          newParts.push({from: p.from, to: m.from});
        if (dto > 0 || !mk.inclusiveRight && !dto)
          newParts.push({from: m.to, to: p.to});
        parts.splice.apply(parts, newParts);
        j += newParts.length - 1;
      }
    }
    return parts;
  }

  // Connect or disconnect spans from a line.
  function detachMarkedSpans(line) {
    var spans = line.markedSpans;
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.detachLine(line);
    line.markedSpans = null;
  }
  function attachMarkedSpans(line, spans) {
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.attachLine(line);
    line.markedSpans = spans;
  }

  // Helpers used when computing which overlapping collapsed span
  // counts as the larger one.
  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0; }
  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0; }

  // Returns a number indicating which of two overlapping collapsed
  // spans is larger (and thus includes the other). Falls back to
  // comparing ids when the spans cover exactly the same range.
  function compareCollapsedMarkers(a, b) {
    var lenDiff = a.lines.length - b.lines.length;
    if (lenDiff != 0) return lenDiff;
    var aPos = a.find(), bPos = b.find();
    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
    if (fromCmp) return -fromCmp;
    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
    if (toCmp) return toCmp;
    return b.id - a.id;
  }

  // Find out whether a line ends or starts in a collapsed span. If
  // so, return the marker for that span.
  function collapsedSpanAtSide(line, start) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
        found = sp.marker;
    }
    return found;
  }
  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true); }
  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false); }

  // Test whether there exists a collapsed span that partially
  // overlaps (covers the start or end, but not both) of a new span.
  // Such overlap is not allowed.
  function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
    var line = getLine(doc, lineNo);
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) for (var i = 0; i < sps.length; ++i) {
      var sp = sps[i];
      if (!sp.marker.collapsed) continue;
      var found = sp.marker.find(0);
      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) continue;
      if (fromCmp <= 0 && (cmp(found.to, from) > 0 || (sp.marker.inclusiveRight && marker.inclusiveLeft)) ||
          fromCmp >= 0 && (cmp(found.from, to) < 0 || (sp.marker.inclusiveLeft && marker.inclusiveRight)))
        return true;
    }
  }

  // A visual line is a line as drawn on the screen. Folding, for
  // example, can cause multiple logical lines to appear on the same
  // visual line. This finds the start of the visual line that the
  // given line is part of (usually that is the line itself).
  function visualLine(line) {
    var merged;
    while (merged = collapsedSpanAtStart(line))
      line = merged.find(-1, true).line;
    return line;
  }

  // Returns an array of logical lines that continue the visual line
  // started by the argument, or undefined if there are no such lines.
  function visualLineContinued(line) {
    var merged, lines;
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line;
      (lines || (lines = [])).push(line);
    }
    return lines;
  }

  // Get the line number of the start of the visual line that the
  // given line number is part of.
  function visualLineNo(doc, lineN) {
    var line = getLine(doc, lineN), vis = visualLine(line);
    if (line == vis) return lineN;
    return lineNo(vis);
  }
  // Get the line number of the start of the next visual line after
  // the given line.
  function visualLineEndNo(doc, lineN) {
    if (lineN > doc.lastLine()) return lineN;
    var line = getLine(doc, lineN), merged;
    if (!lineIsHidden(doc, line)) return lineN;
    while (merged = collapsedSpanAtEnd(line))
      line = merged.find(1, true).line;
    return lineNo(line) + 1;
  }

  // Compute whether a line is hidden. Lines count as hidden when they
  // are part of a visual line that starts with another line, or when
  // they are entirely covered by collapsed, non-widget span.
  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (!sp.marker.collapsed) continue;
      if (sp.from == null) return true;
      if (sp.marker.widgetNode) continue;
      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
        return true;
    }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find(1, true);
      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker));
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      return true;
    for (var sp, i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i];
      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
          (sp.to == null || sp.to != span.from) &&
          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
          lineIsHiddenInner(doc, line, sp)) return true;
    }
  }

  // LINE WIDGETS

  // Line widgets are block elements displayed above or below a line.

  var LineWidget = CodeMirror.LineWidget = function(cm, node, options) {
    if (options) for (var opt in options) if (options.hasOwnProperty(opt))
      this[opt] = options[opt];
    this.cm = cm;
    this.node = node;
  };
  eventMixin(LineWidget);

  function adjustScrollWhenAboveVisible(cm, line, diff) {
    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
      addToScrollPos(cm, null, diff);
  }

  LineWidget.prototype.clear = function() {
    var cm = this.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
    if (no == null || !ws) return;
    for (var i = 0; i < ws.length; ++i) if (ws[i] == this) ws.splice(i--, 1);
    if (!ws.length) line.widgets = null;
    var height = widgetHeight(this);
    runInOp(cm, function() {
      adjustScrollWhenAboveVisible(cm, line, -height);
      regLineChange(cm, no, "widget");
      updateLineHeight(line, Math.max(0, line.height - height));
    });
  };
  LineWidget.prototype.changed = function() {
    var oldH = this.height, cm = this.cm, line = this.line;
    this.height = null;
    var diff = widgetHeight(this) - oldH;
    if (!diff) return;
    runInOp(cm, function() {
      cm.curOp.forceUpdate = true;
      adjustScrollWhenAboveVisible(cm, line, diff);
      updateLineHeight(line, line.height + diff);
    });
  };

  function widgetHeight(widget) {
    if (widget.height != null) return widget.height;
    if (!contains(document.body, widget.node)) {
      var parentStyle = "position: relative;";
      if (widget.coverGutter)
        parentStyle += "margin-left: -" + widget.cm.display.gutters.offsetWidth + "px;";
      if (widget.noHScroll)
        parentStyle += "width: " + widget.cm.display.wrapper.clientWidth + "px;";
      removeChildrenAndAdd(widget.cm.display.measure, elt("div", [widget.node], null, parentStyle));
    }
    return widget.height = widget.node.offsetHeight;
  }

  function addLineWidget(cm, handle, node, options) {
    var widget = new LineWidget(cm, node, options);
    if (widget.noHScroll) cm.display.alignWidgets = true;
    changeLine(cm.doc, handle, "widget", function(line) {
      var widgets = line.widgets || (line.widgets = []);
      if (widget.insertAt == null) widgets.push(widget);
      else widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
      widget.line = line;
      if (!lineIsHidden(cm.doc, line)) {
        var aboveVisible = heightAtLine(line) < cm.doc.scrollTop;
        updateLineHeight(line, line.height + widgetHeight(widget));
        if (aboveVisible) addToScrollPos(cm, null, widget.height);
        cm.curOp.forceUpdate = true;
      }
      return true;
    });
    return widget;
  }

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = CodeMirror.Line = function(text, markedSpans, estimateHeight) {
    this.text = text;
    attachMarkedSpans(this, markedSpans);
    this.height = estimateHeight ? estimateHeight(this) : 1;
  };
  eventMixin(Line);
  Line.prototype.lineNo = function() { return lineNo(this); };

  // Change the content (text, markers) of a line. Automatically
  // invalidates cached information and tries to re-estimate the
  // line's height.
  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text;
    if (line.stateAfter) line.stateAfter = null;
    if (line.styles) line.styles = null;
    if (line.order != null) line.order = null;
    detachMarkedSpans(line);
    attachMarkedSpans(line, markedSpans);
    var estHeight = estimateHeight ? estimateHeight(line) : 1;
    if (estHeight != line.height) updateLineHeight(line, estHeight);
  }

  // Detach a line from the document tree and its markers.
  function cleanUpLine(line) {
    line.parent = null;
    detachMarkedSpans(line);
  }

  function extractLineClasses(type, output) {
    if (type) for (;;) {
      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
      if (!lineClass) break;
      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
      var prop = lineClass[1] ? "bgClass" : "textClass";
      if (output[prop] == null)
        output[prop] = lineClass[2];
      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
        output[prop] += " " + lineClass[2];
    }
    return type;
  }

  function callBlankLine(mode, state) {
    if (mode.blankLine) return mode.blankLine(state);
    if (!mode.innerMode) return;
    var inner = CodeMirror.innerMode(mode, state);
    if (inner.mode.blankLine) return inner.mode.blankLine(inner.state);
  }

  function readToken(mode, stream, state, inner) {
    for (var i = 0; i < 10; i++) {
      if (inner) inner[0] = CodeMirror.innerMode(mode, state).mode;
      var style = mode.token(stream, state);
      if (stream.pos > stream.start) return style;
    }
    throw new Error("Mode " + mode.name + " failed to advance stream.");
  }

  // Utility for getTokenAt and getLineTokens
  function takeToken(cm, pos, precise, asArray) {
    function getObj(copy) {
      return {start: stream.start, end: stream.pos,
              string: stream.current(),
              type: style || null,
              state: copy ? copyState(doc.mode, state) : state};
    }

    var doc = cm.doc, mode = doc.mode, style;
    pos = clipPos(doc, pos);
    var line = getLine(doc, pos.line), state = getStateBefore(cm, pos.line, precise);
    var stream = new StringStream(line.text, cm.options.tabSize), tokens;
    if (asArray) tokens = [];
    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
      stream.start = stream.pos;
      style = readToken(mode, stream, state);
      if (asArray) tokens.push(getObj(true));
    }
    return asArray ? tokens : getObj();
  }

  // Run the given mode's parser over a line, calling f for each token.
  function runMode(cm, text, mode, state, f, lineClasses, forceToEnd) {
    var flattenSpans = mode.flattenSpans;
    if (flattenSpans == null) flattenSpans = cm.options.flattenSpans;
    var curStart = 0, curStyle = null;
    var stream = new StringStream(text, cm.options.tabSize), style;
    var inner = cm.options.addModeClass && [null];
    if (text == "") extractLineClasses(callBlankLine(mode, state), lineClasses);
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false;
        if (forceToEnd) processLine(cm, text, state, stream.pos);
        stream.pos = text.length;
        style = null;
      } else {
        style = extractLineClasses(readToken(mode, stream, state, inner), lineClasses);
      }
      if (inner) {
        var mName = inner[0].name;
        if (mName) style = "m-" + (style ? mName + " " + style : mName);
      }
      if (!flattenSpans || curStyle != style) {
        while (curStart < stream.start) {
          curStart = Math.min(stream.start, curStart + 50000);
          f(curStart, curStyle);
        }
        curStyle = style;
      }
      stream.start = stream.pos;
    }
    while (curStart < stream.pos) {
      // Webkit seems to refuse to render text nodes longer than 57444 characters
      var pos = Math.min(stream.pos, curStart + 50000);
      f(pos, curStyle);
      curStart = pos;
    }
  }

  // Compute a style array (an array starting with a mode generation
  // -- for invalidation -- followed by pairs of end positions and
  // style strings), which is used to highlight the tokens on the
  // line.
  function highlightLine(cm, line, state, forceToEnd) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen], lineClasses = {};
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, state, function(end, style) {
      st.push(end, style);
    }, lineClasses, forceToEnd);

    // Run overlays, adjust style array.
    for (var o = 0; o < cm.state.overlays.length; ++o) {
      var overlay = cm.state.overlays[o], i = 1, at = 0;
      runMode(cm, line.text, overlay.mode, true, function(end, style) {
        var start = i;
        // Ensure there's a token end at the current position, and that i points at it
        while (at < end) {
          var i_end = st[i];
          if (i_end > end)
            st.splice(i, 1, end, st[i+1], i_end);
          i += 2;
          at = Math.min(end, i_end);
        }
        if (!style) return;
        if (overlay.opaque) {
          st.splice(start, i - start, end, "cm-overlay " + style);
          i = start + 2;
        } else {
          for (; start < i; start += 2) {
            var cur = st[start+1];
            st[start+1] = (cur ? cur + " " : "") + "cm-overlay " + style;
          }
        }
      }, lineClasses);
    }

    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null};
  }

  function getLineStyles(cm, line, updateFrontier) {
    if (!line.styles || line.styles[0] != cm.state.modeGen) {
      var result = highlightLine(cm, line, line.stateAfter = getStateBefore(cm, lineNo(line)));
      line.styles = result.styles;
      if (result.classes) line.styleClasses = result.classes;
      else if (line.styleClasses) line.styleClasses = null;
      if (updateFrontier === cm.doc.frontier) cm.doc.frontier++;
    }
    return line.styles;
  }

  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array. Used for lines that
  // aren't currently visible.
  function processLine(cm, text, state, startAt) {
    var mode = cm.doc.mode;
    var stream = new StringStream(text, cm.options.tabSize);
    stream.start = stream.pos = startAt || 0;
    if (text == "") callBlankLine(mode, state);
    while (!stream.eol() && stream.pos <= cm.options.maxHighlightLength) {
      readToken(mode, stream, state);
      stream.start = stream.pos;
    }
  }

  // Convert a style as returned by a mode (either null, or a string
  // containing one or more styles) to a CSS style. This is cached,
  // and also looks for line-wide styles.
  var styleToClassCache = {}, styleToClassCacheWithMode = {};
  function interpretTokenStyle(style, options) {
    if (!style || /^\s*$/.test(style)) return null;
    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
    return cache[style] ||
      (cache[style] = style.replace(/\S+/g, "cm-$&"));
  }

  // Render the DOM representation of the text of a line. Also builds
  // up a 'line map', which points at the DOM nodes that represent
  // specific stretches of text, and is used by the measuring code.
  // The returned object contains the DOM node, this map, and
  // information about line-wide styles that were set by the mode.
  function buildLineContent(cm, lineView) {
    // The padding-right forces the element to have a 'border', which
    // is needed on Webkit to be able to get line-level bounding
    // rectangles for it (in measureChar).
    var content = elt("span", null, null, webkit ? "padding-right: .1px" : null);
    var builder = {pre: elt("pre", [content]), content: content, col: 0, pos: 0, cm: cm};
    lineView.measure = {};

    // Iterate over the logical lines that make up this visual line.
    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
      var line = i ? lineView.rest[i - 1] : lineView.line, order;
      builder.pos = 0;
      builder.addToken = buildToken;
      // Optionally wire in some hacks into the token-rendering
      // algorithm, to deal with browser quirks.
      if ((ie || webkit) && cm.getOption("lineWrapping"))
        builder.addToken = buildTokenSplitSpaces(builder.addToken);
      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line)))
        builder.addToken = buildTokenBadBidi(builder.addToken, order);
      builder.map = [];
      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
      if (line.styleClasses) {
        if (line.styleClasses.bgClass)
          builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "");
        if (line.styleClasses.textClass)
          builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "");
      }

      // Ensure at least a single node is present, for measuring.
      if (builder.map.length == 0)
        builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure)));

      // Store the map and a cache object for the current logical line
      if (i == 0) {
        lineView.measure.map = builder.map;
        lineView.measure.cache = {};
      } else {
        (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map);
        (lineView.measure.caches || (lineView.measure.caches = [])).push({});
      }
    }

    // See issue #2901
    if (webkit && /\bcm-tab\b/.test(builder.content.lastChild.className))
      builder.content.className = "cm-tab-wrap-hack";

    signal(cm, "renderLine", cm, lineView.line, builder.pre);
    if (builder.pre.className)
      builder.textClass = joinClasses(builder.pre.className, builder.textClass || "");

    return builder;
  }

  function defaultSpecialCharPlaceholder(ch) {
    var token = elt("span", "\u2022", "cm-invalidchar");
    token.title = "\\u" + ch.charCodeAt(0).toString(16);
    token.setAttribute("aria-label", token.title);
    return token;
  }

  // Build up the DOM representation for a single token, and add it to
  // the line map. Takes care to render special characters separately.
  function buildToken(builder, text, style, startStyle, endStyle, title, css) {
    if (!text) return;
    var special = builder.cm.options.specialChars, mustWrap = false;
    if (!special.test(text)) {
      builder.col += text.length;
      var content = document.createTextNode(text);
      builder.map.push(builder.pos, builder.pos + text.length, content);
      if (ie && ie_version < 9) mustWrap = true;
      builder.pos += text.length;
    } else {
      var content = document.createDocumentFragment(), pos = 0;
      while (true) {
        special.lastIndex = pos;
        var m = special.exec(text);
        var skipped = m ? m.index - pos : text.length - pos;
        if (skipped) {
          var txt = document.createTextNode(text.slice(pos, pos + skipped));
          if (ie && ie_version < 9) content.appendChild(elt("span", [txt]));
          else content.appendChild(txt);
          builder.map.push(builder.pos, builder.pos + skipped, txt);
          builder.col += skipped;
          builder.pos += skipped;
        }
        if (!m) break;
        pos += skipped + 1;
        if (m[0] == "\t") {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
          var txt = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
          txt.setAttribute("role", "presentation");
          txt.setAttribute("cm-text", "\t");
          builder.col += tabWidth;
        } else {
          var txt = builder.cm.options.specialCharPlaceholder(m[0]);
          txt.setAttribute("cm-text", m[0]);
          if (ie && ie_version < 9) content.appendChild(elt("span", [txt]));
          else content.appendChild(txt);
          builder.col += 1;
        }
        builder.map.push(builder.pos, builder.pos + 1, txt);
        builder.pos++;
      }
    }
    if (style || startStyle || endStyle || mustWrap || css) {
      var fullStyle = style || "";
      if (startStyle) fullStyle += startStyle;
      if (endStyle) fullStyle += endStyle;
      var token = elt("span", [content], fullStyle, css);
      if (title) token.title = title;
      return builder.content.appendChild(token);
    }
    builder.content.appendChild(content);
  }

  function buildTokenSplitSpaces(inner) {
    function split(old) {
      var out = " ";
      for (var i = 0; i < old.length - 2; ++i) out += i % 2 ? " " : "\u00a0";
      out += " ";
      return out;
    }
    return function(builder, text, style, startStyle, endStyle, title) {
      inner(builder, text.replace(/ {3,}/g, split), style, startStyle, endStyle, title);
    };
  }

  // Work around nonsense dimensions being reported for stretches of
  // right-to-left text.
  function buildTokenBadBidi(inner, order) {
    return function(builder, text, style, startStyle, endStyle, title) {
      style = style ? style + " cm-force-border" : "cm-force-border";
      var start = builder.pos, end = start + text.length;
      for (;;) {
        // Find the part that overlaps with the start of this text
        for (var i = 0; i < order.length; i++) {
          var part = order[i];
          if (part.to > start && part.from <= start) break;
        }
        if (part.to >= end) return inner(builder, text, style, startStyle, endStyle, title);
        inner(builder, text.slice(0, part.to - start), style, startStyle, null, title);
        startStyle = null;
        text = text.slice(part.to - start);
        start = part.to;
      }
    };
  }

  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
    var widget = !ignoreWidget && marker.widgetNode;
    if (widget) builder.map.push(builder.pos, builder.pos + size, widget);
    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
      if (!widget)
        widget = builder.content.appendChild(document.createElement("span"));
      widget.setAttribute("cm-marker", marker.id);
    }
    if (widget) {
      builder.cm.display.input.setUneditable(widget);
      builder.content.appendChild(widget);
    }
    builder.pos += size;
  }

  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans, allText = line.text, at = 0;
    if (!spans) {
      for (var i = 1; i < styles.length; i+=2)
        builder.addToken(builder, allText.slice(at, at = styles[i]), interpretTokenStyle(styles[i+1], builder.cm.options));
      return;
    }

    var len = allText.length, pos = 0, i = 1, text = "", style, css;
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed;
    for (;;) {
      if (nextChange == pos) { // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = title = css = "";
        collapsed = null; nextChange = Infinity;
        var foundBookmarks = [];
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker;
          if (sp.from <= pos && (sp.to == null || sp.to > pos)) {
            if (sp.to != null && nextChange > sp.to) { nextChange = sp.to; spanEndStyle = ""; }
            if (m.className) spanStyle += " " + m.className;
            if (m.css) css = m.css;
            if (m.startStyle && sp.from == pos) spanStartStyle += " " + m.startStyle;
            if (m.endStyle && sp.to == nextChange) spanEndStyle += " " + m.endStyle;
            if (m.title && !title) title = m.title;
            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
              collapsed = sp;
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from;
          }
          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) foundBookmarks.push(m);
        }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                             collapsed.marker, collapsed.from == null);
          if (collapsed.to == null) return;
        }
        if (!collapsed && foundBookmarks.length) for (var j = 0; j < foundBookmarks.length; ++j)
          buildCollapsedSpan(builder, 0, foundBookmarks[j]);
      }
      if (pos >= len) break;

      var upto = Math.min(len, nextChange);
      while (true) {
        if (text) {
          var end = pos + text.length;
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title, css);
          }
          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break;}
          pos = end;
          spanStartStyle = "";
        }
        text = allText.slice(at, at = styles[i++]);
        style = interpretTokenStyle(styles[i++], builder.cm.options);
      }
    }
  }

  // DOCUMENT DATA STRUCTURE

  // By default, updates that start and end at the beginning of a line
  // are treated specially, in order to make the association of line
  // widgets and marker elements with the text behave more intuitive.
  function isWholeLineUpdate(doc, change) {
    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
      (!doc.cm || doc.cm.options.wholeLineUpdateBefore);
  }

  // Perform a change on the document data structure.
  function updateDoc(doc, change, markedSpans, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null;}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, "change", line, change);
    }
    function linesFor(start, end) {
      for (var i = start, result = []; i < end; ++i)
        result.push(new Line(text[i], spansFor(i), estimateHeight));
      return result;
    }

    var from = change.from, to = change.to, text = change.text;
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

    // Adjust the line structure
    if (change.full) {
      doc.insert(0, linesFor(0, text.length));
      doc.remove(text.length, doc.size - text.length);
    } else if (isWholeLineUpdate(doc, change)) {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      var added = linesFor(0, text.length - 1);
      update(lastLine, lastLine.text, lastSpans);
      if (nlines) doc.remove(from.line, nlines);
      if (added.length) doc.insert(from.line, added);
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        var added = linesFor(1, text.length - 1);
        added.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      var added = linesFor(1, text.length - 1);
      if (nlines > 1) doc.remove(from.line + 1, nlines - 1);
      doc.insert(from.line + 1, added);
    }

    signalLater(doc, "change", doc, change);
  }

  // The document is represented as a BTree consisting of leaves, with
  // chunk of lines in them, and branches, with up to ten leaves or
  // other branch nodes below them. The top node is always a branch
  // node, and is the document object itself (meaning it has
  // additional methods and properties).
  //
  // All nodes have parent links. The tree is used both to go from
  // line numbers to line objects, and to go from objects to numbers.
  // It also indexes by height, and is used to convert between height
  // and line object, and to find the total height of the document.
  //
  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    for (var i = 0, height = 0; i < lines.length; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }

  LeafChunk.prototype = {
    chunkSize: function() { return this.lines.length; },
    // Remove the n lines at offset 'at'.
    removeInner: function(at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        cleanUpLine(line);
        signalLater(line, "delete");
      }
      this.lines.splice(at, n);
    },
    // Helper used to collapse a small branch into a single leaf.
    collapse: function(lines) {
      lines.push.apply(lines, this.lines);
    },
    // Insert the given array of lines at offset 'at', count them as
    // having the given height.
    insertInner: function(at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0; i < lines.length; ++i) lines[i].parent = this;
    },
    // Used to iterate over a part of the tree.
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at])) return true;
    }
  };

  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0; i < children.length; ++i) {
      var ch = children[i];
      size += ch.chunkSize(); height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }

  BranchChunk.prototype = {
    chunkSize: function() { return this.size; },
    removeInner: function(at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) break;
          at = 0;
        } else at -= sz;
      }
      // If the result is smaller than 25 lines, ensure that it is a
      // single leaf node.
      if (this.size - n < 25 &&
          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },
    collapse: function(lines) {
      for (var i = 0; i < this.children.length; ++i) this.children[i].collapse(lines);
    },
    insertInner: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            while (child.lines.length > 50) {
              var spilled = child.lines.splice(child.lines.length - 25, 25);
              var newleaf = new LeafChunk(spilled);
              child.height -= newleaf.height;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.parent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    // When a node has grown, check whether it should be split.
    maybeSpill: function() {
      if (this.children.length <= 10) return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
        } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    iterN: function(at, n, op) {
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) return true;
          if ((n -= used) == 0) break;
          at = 0;
        } else at -= sz;
      }
    }
  };

  var nextDocId = 0;
  var Doc = CodeMirror.Doc = function(text, mode, firstLine) {
    if (!(this instanceof Doc)) return new Doc(text, mode, firstLine);
    if (firstLine == null) firstLine = 0;

    BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
    this.first = firstLine;
    this.scrollTop = this.scrollLeft = 0;
    this.cantEdit = false;
    this.cleanGeneration = 1;
    this.frontier = firstLine;
    var start = Pos(firstLine, 0);
    this.sel = simpleSelection(start);
    this.history = new History(null);
    this.id = ++nextDocId;
    this.modeOption = mode;

    if (typeof text == "string") text = splitLines(text);
    updateDoc(this, {from: start, to: start, text: text});
    setSelection(this, simpleSelection(start), sel_dontScroll);
  };

  Doc.prototype = createObj(BranchChunk.prototype, {
    constructor: Doc,
    // Iterate over the document. Supports two forms -- with only one
    // argument, it calls that for each line in the document. With
    // three, it iterates over the range given by the first two (with
    // the second being non-inclusive).
    iter: function(from, to, op) {
      if (op) this.iterN(from - this.first, to - from, op);
      else this.iterN(this.first, this.first + this.size, from);
    },

    // Non-public interface for adding and removing lines.
    insert: function(at, lines) {
      var height = 0;
      for (var i = 0; i < lines.length; ++i) height += lines[i].height;
      this.insertInner(at - this.first, lines, height);
    },
    remove: function(at, n) { this.removeInner(at - this.first, n); },

    // From here, the methods are part of the public interface. Most
    // are also available from CodeMirror (editor) instances.

    getValue: function(lineSep) {
      var lines = getLines(this, this.first, this.first + this.size);
      if (lineSep === false) return lines;
      return lines.join(lineSep || "\n");
    },
    setValue: docMethodOp(function(code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                        text: splitLines(code), origin: "setValue", full: true}, true);
      setSelection(this, simpleSelection(top));
    }),
    replaceRange: function(code, from, to, origin) {
      from = clipPos(this, from);
      to = to ? clipPos(this, to) : from;
      replaceRange(this, code, from, to, origin);
    },
    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
      if (lineSep === false) return lines;
      return lines.join(lineSep || "\n");
    },

    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text;},

    getLineHandle: function(line) {if (isLine(this, line)) return getLine(this, line);},
    getLineNumber: function(line) {return lineNo(line);},

    getLineHandleVisualStart: function(line) {
      if (typeof line == "number") line = getLine(this, line);
      return visualLine(line);
    },

    lineCount: function() {return this.size;},
    firstLine: function() {return this.first;},
    lastLine: function() {return this.first + this.size - 1;},

    clipPos: function(pos) {return clipPos(this, pos);},

    getCursor: function(start) {
      var range = this.sel.primary(), pos;
      if (start == null || start == "head") pos = range.head;
      else if (start == "anchor") pos = range.anchor;
      else if (start == "end" || start == "to" || start === false) pos = range.to();
      else pos = range.from();
      return pos;
    },
    listSelections: function() { return this.sel.ranges; },
    somethingSelected: function() {return this.sel.somethingSelected();},

    setCursor: docMethodOp(function(line, ch, options) {
      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
    }),
    setSelection: docMethodOp(function(anchor, head, options) {
      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
    }),
    extendSelection: docMethodOp(function(head, other, options) {
      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
    }),
    extendSelections: docMethodOp(function(heads, options) {
      extendSelections(this, clipPosArray(this, heads, options));
    }),
    extendSelectionsBy: docMethodOp(function(f, options) {
      extendSelections(this, map(this.sel.ranges, f), options);
    }),
    setSelections: docMethodOp(function(ranges, primary, options) {
      if (!ranges.length) return;
      for (var i = 0, out = []; i < ranges.length; i++)
        out[i] = new Range(clipPos(this, ranges[i].anchor),
                           clipPos(this, ranges[i].head));
      if (primary == null) primary = Math.min(ranges.length - 1, this.sel.primIndex);
      setSelection(this, normalizeSelection(out, primary), options);
    }),
    addSelection: docMethodOp(function(anchor, head, options) {
      var ranges = this.sel.ranges.slice(0);
      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
      setSelection(this, normalizeSelection(ranges, ranges.length - 1), options);
    }),

    getSelection: function(lineSep) {
      var ranges = this.sel.ranges, lines;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        lines = lines ? lines.concat(sel) : sel;
      }
      if (lineSep === false) return lines;
      else return lines.join(lineSep || "\n");
    },
    getSelections: function(lineSep) {
      var parts = [], ranges = this.sel.ranges;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        if (lineSep !== false) sel = sel.join(lineSep || "\n");
        parts[i] = sel;
      }
      return parts;
    },
    replaceSelection: function(code, collapse, origin) {
      var dup = [];
      for (var i = 0; i < this.sel.ranges.length; i++)
        dup[i] = code;
      this.replaceSelections(dup, collapse, origin || "+input");
    },
    replaceSelections: docMethodOp(function(code, collapse, origin) {
      var changes = [], sel = this.sel;
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i];
        changes[i] = {from: range.from(), to: range.to(), text: splitLines(code[i]), origin: origin};
      }
      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
      for (var i = changes.length - 1; i >= 0; i--)
        makeChange(this, changes[i]);
      if (newSel) setSelectionReplaceHistory(this, newSel);
      else if (this.cm) ensureCursorVisible(this.cm);
    }),
    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

    setExtending: function(val) {this.extend = val;},
    getExtending: function() {return this.extend;},

    historySize: function() {
      var hist = this.history, done = 0, undone = 0;
      for (var i = 0; i < hist.done.length; i++) if (!hist.done[i].ranges) ++done;
      for (var i = 0; i < hist.undone.length; i++) if (!hist.undone[i].ranges) ++undone;
      return {undo: done, redo: undone};
    },
    clearHistory: function() {this.history = new History(this.history.maxGeneration);},

    markClean: function() {
      this.cleanGeneration = this.changeGeneration(true);
    },
    changeGeneration: function(forceSplit) {
      if (forceSplit)
        this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
      return this.history.generation;
    },
    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration);
    },

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)};
    },
    setHistory: function(histData) {
      var hist = this.history = new History(this.history.maxGeneration);
      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
    },

    addLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        if (!line[prop]) line[prop] = cls;
        else if (classTest(cls).test(line[prop])) return false;
        else line[prop] += " " + cls;
        return true;
      });
    }),
    removeLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        var cur = line[prop];
        if (!cur) return false;
        else if (cls == null) line[prop] = null;
        else {
          var found = cur.match(classTest(cls));
          if (!found) return false;
          var end = found.index + found[0].length;
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
        }
        return true;
      });
    }),

    markText: function(from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, "range");
    },
    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft,
                      clearWhenEmpty: false, shared: options && options.shared};
      pos = clipPos(this, pos);
      return markText(this, pos, pos, realOpts, "bookmark");
    },
    findMarksAt: function(pos) {
      pos = clipPos(this, pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans) for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          markers.push(span.marker.parent || span.marker);
      }
      return markers;
    },
    findMarks: function(from, to, filter) {
      from = clipPos(this, from); to = clipPos(this, to);
      var found = [], lineNo = from.line;
      this.iter(from.line, to.line + 1, function(line) {
        var spans = line.markedSpans;
        if (spans) for (var i = 0; i < spans.length; i++) {
          var span = spans[i];
          if (!(lineNo == from.line && from.ch > span.to ||
                span.from == null && lineNo != from.line||
                lineNo == to.line && span.from > to.ch) &&
              (!filter || filter(span.marker)))
            found.push(span.marker.parent || span.marker);
        }
        ++lineNo;
      });
      return found;
    },
    getAllMarks: function() {
      var markers = [];
      this.iter(function(line) {
        var sps = line.markedSpans;
        if (sps) for (var i = 0; i < sps.length; ++i)
          if (sps[i].from != null) markers.push(sps[i].marker);
      });
      return markers;
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first;
      this.iter(function(line) {
        var sz = line.text.length + 1;
        if (sz > off) { ch = off; return true; }
        off -= sz;
        ++lineNo;
      });
      return clipPos(this, Pos(lineNo, ch));
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0) return 0;
      this.iter(this.first, coords.line, function (line) {
        index += line.text.length + 1;
      });
      return index;
    },

    copy: function(copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size), this.modeOption, this.first);
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
      doc.sel = this.sel;
      doc.extend = false;
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc;
    },

    linkedDoc: function(options) {
      if (!options) options = {};
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from) from = options.from;
      if (options.to != null && options.to < to) to = options.to;
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from);
      if (options.sharedHist) copy.history = this.history;
      (this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
      copySharedMarkers(copy, findSharedMarkers(this));
      return copy;
    },
    unlinkDoc: function(other) {
      if (other instanceof CodeMirror) other = other.doc;
      if (this.linked) for (var i = 0; i < this.linked.length; ++i) {
        var link = this.linked[i];
        if (link.doc != other) continue;
        this.linked.splice(i, 1);
        other.unlinkDoc(this);
        detachSharedMarkers(findSharedMarkers(this));
        break;
      }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function(doc) {splitIds.push(doc.id);}, true);
        other.history = new History(null);
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    iterLinkedDocs: function(f) {linkedDocs(this, f);},

    getMode: function() {return this.mode;},
    getEditor: function() {return this.cm;}
  });

  // Public alias.
  Doc.prototype.eachLine = Doc.prototype.iter;

  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
  var dontDelegate = "iter insert remove copy getEditor".split(" ");
  for (var prop in Doc.prototype) if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments);};
    })(Doc.prototype[prop]);

  eventMixin(Doc);

  // Call f for all linked documents.
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i];
        if (rel.doc == skip) continue;
        var shared = sharedHist && rel.sharedHist;
        if (sharedHistOnly && !shared) continue;
        f(rel.doc, shared);
        propagate(rel.doc, doc, shared);
      }
    }
    propagate(doc, null, true);
  }

  // Attach a document to an editor.
  function attachDoc(cm, doc) {
    if (doc.cm) throw new Error("This document is already in use.");
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    if (!cm.options.lineWrapping) findMaxLine(cm);
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }

  // LINE UTILITIES

  // Find the line object corresponding to the given line number.
  function getLine(doc, n) {
    n -= doc.first;
    if (n < 0 || n >= doc.size) throw new Error("There is no line " + (n + doc.first) + " in the document.");
    for (var chunk = doc; !chunk.lines;) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; break; }
        n -= sz;
      }
    }
    return chunk.lines[n];
  }

  // Get the part of a document between two positions, as an array of
  // strings.
  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function(line) {
      var text = line.text;
      if (n == end.line) text = text.slice(0, end.ch);
      if (n == start.line) text = text.slice(start.ch);
      out.push(text);
      ++n;
    });
    return out;
  }
  // Get the lines between from and to, as array of strings.
  function getLines(doc, from, to) {
    var out = [];
    doc.iter(from, to, function(line) { out.push(line.text); });
    return out;
  }

  // Update the height of a line, propagating the height change
  // upwards to parent nodes.
  function updateLineHeight(line, height) {
    var diff = height - line.height;
    if (diff) for (var n = line; n; n = n.parent) n.height += diff;
  }

  // Given a line object, find its line number by walking up through
  // its parent links.
  function lineNo(line) {
    if (line.parent == null) return null;
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur) break;
        no += chunk.children[i].chunkSize();
      }
    }
    return no + cur.first;
  }

  // Find the line at the given vertical position, using the height
  // information in the document tree.
  function lineAtHeight(chunk, h) {
    var n = chunk.first;
    outer: do {
      for (var i = 0; i < chunk.children.length; ++i) {
        var child = chunk.children[i], ch = child.height;
        if (h < ch) { chunk = child; continue outer; }
        h -= ch;
        n += child.chunkSize();
      }
      return n;
    } while (!chunk.lines);
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh) break;
      h -= lh;
    }
    return n + i;
  }


  // Find the height above the given line.
  function heightAtLine(lineObj) {
    lineObj = visualLine(lineObj);

    var h = 0, chunk = lineObj.parent;
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i];
      if (line == lineObj) break;
      else h += line.height;
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i = 0; i < p.children.length; ++i) {
        var cur = p.children[i];
        if (cur == chunk) break;
        else h += cur.height;
      }
    }
    return h;
  }

  // Get the bidi ordering for the given line (and cache it). Returns
  // false for lines that are fully left-to-right, and an array of
  // BidiSpan objects otherwise.
  function getOrder(line) {
    var order = line.order;
    if (order == null) order = line.order = bidiOrdering(line.text);
    return order;
  }

  // HISTORY

  function History(startGen) {
    // Arrays of change events and selections. Doing something adds an
    // event to done and clears undo. Undoing moves events from done
    // to undone, redoing moves them in the other direction.
    this.done = []; this.undone = [];
    this.undoDepth = Infinity;
    // Used to track when changes can be merged into a single undo
    // event
    this.lastModTime = this.lastSelTime = 0;
    this.lastOp = this.lastSelOp = null;
    this.lastOrigin = this.lastSelOrigin = null;
    // Used by the isClean() method
    this.generation = this.maxGeneration = startGen || 1;
  }

  // Create a history change event from an updateDoc-style change
  // object.
  function historyChangeFromChange(doc, change) {
    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    linkedDocs(doc, function(doc) {attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);}, true);
    return histChange;
  }

  // Pop all selection events off the end of a history array. Stop at
  // a change event.
  function clearSelectionEvents(array) {
    while (array.length) {
      var last = lst(array);
      if (last.ranges) array.pop();
      else break;
    }
  }

  // Find the top change event in the history. Pop off selection
  // events that are in the way.
  function lastChangeEvent(hist, force) {
    if (force) {
      clearSelectionEvents(hist.done);
      return lst(hist.done);
    } else if (hist.done.length && !lst(hist.done).ranges) {
      return lst(hist.done);
    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
      hist.done.pop();
      return lst(hist.done);
    }
  }

  // Register a change in the history. Merges changes that are within
  // a single operation, ore are close together with an origin that
  // allows merging (starting with "+") into a single event.
  function addChangeToHistory(doc, change, selAfter, opId) {
    var hist = doc.history;
    hist.undone.length = 0;
    var time = +new Date, cur;

    if ((hist.lastOp == opId ||
         hist.lastOrigin == change.origin && change.origin &&
         ((change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay) ||
          change.origin.charAt(0) == "*")) &&
        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
      // Merge this change into the last event
      var last = lst(cur.changes);
      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change);
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change));
      }
    } else {
      // Can not be merged, start a new event.
      var before = lst(hist.done);
      if (!before || !before.ranges)
        pushSelectionToHistory(doc.sel, hist.done);
      cur = {changes: [historyChangeFromChange(doc, change)],
             generation: hist.generation};
      hist.done.push(cur);
      while (hist.done.length > hist.undoDepth) {
        hist.done.shift();
        if (!hist.done[0].ranges) hist.done.shift();
      }
    }
    hist.done.push(selAfter);
    hist.generation = ++hist.maxGeneration;
    hist.lastModTime = hist.lastSelTime = time;
    hist.lastOp = hist.lastSelOp = opId;
    hist.lastOrigin = hist.lastSelOrigin = change.origin;

    if (!last) signal(doc, "historyAdded");
  }

  function selectionEventCanBeMerged(doc, origin, prev, sel) {
    var ch = origin.charAt(0);
    return ch == "*" ||
      ch == "+" &&
      prev.ranges.length == sel.ranges.length &&
      prev.somethingSelected() == sel.somethingSelected() &&
      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500);
  }

  // Called whenever the selection changes, sets the new selection as
  // the pending selection in the history, and pushes the old pending
  // selection into the 'done' array when it was significantly
  // different (in number of selected ranges, emptiness, or time).
  function addSelectionToHistory(doc, sel, opId, options) {
    var hist = doc.history, origin = options && options.origin;

    // A new event is started when the previous origin does not match
    // the current, or the origins don't allow matching. Origins
    // starting with * are always merged, those starting with + are
    // merged when similar and close together in time.
    if (opId == hist.lastSelOp ||
        (origin && hist.lastSelOrigin == origin &&
         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
      hist.done[hist.done.length - 1] = sel;
    else
      pushSelectionToHistory(sel, hist.done);

    hist.lastSelTime = +new Date;
    hist.lastSelOrigin = origin;
    hist.lastSelOp = opId;
    if (options && options.clearRedo !== false)
      clearSelectionEvents(hist.undone);
  }

  function pushSelectionToHistory(sel, dest) {
    var top = lst(dest);
    if (!(top && top.ranges && top.equals(sel)))
      dest.push(sel);
  }

  // Used to store marked span information in the history.
  function attachLocalSpans(doc, change, from, to) {
    var existing = change["spans_" + doc.id], n = 0;
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function(line) {
      if (line.markedSpans)
        (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans;
      ++n;
    });
  }

  // When un/re-doing restores text containing marked spans, those
  // that have been explicitly cleared should not be restored.
  function removeClearedSpans(spans) {
    if (!spans) return null;
    for (var i = 0, out; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) { if (!out) out = spans.slice(0, i); }
      else if (out) out.push(spans[i]);
    }
    return !out ? spans : out.length ? out : null;
  }

  // Retrieve and filter the old marked spans stored in a change event.
  function getOldSpans(doc, change) {
    var found = change["spans_" + doc.id];
    if (!found) return null;
    for (var i = 0, nw = []; i < change.text.length; ++i)
      nw.push(removeClearedSpans(found[i]));
    return nw;
  }

  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup, instantiateSel) {
    for (var i = 0, copy = []; i < events.length; ++i) {
      var event = events[i];
      if (event.ranges) {
        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
        continue;
      }
      var changes = event.changes, newChanges = [];
      copy.push({changes: newChanges});
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m;
        newChanges.push({from: change.from, to: change.to, text: change.text});
        if (newGroup) for (var prop in change) if (m = prop.match(/^spans_(\d+)$/)) {
          if (indexOf(newGroup, Number(m[1])) > -1) {
            lst(newChanges)[prop] = change[prop];
            delete change[prop];
          }
        }
      }
    }
    return copy;
  }

  // Rebasing/resetting history to deal with externally-sourced changes

  function rebaseHistSelSingle(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff;
    } else if (from < pos.line) {
      pos.line = from;
      pos.ch = 0;
    }
  }

  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true;
      if (sub.ranges) {
        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
        for (var j = 0; j < sub.ranges.length; j++) {
          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
        }
        continue;
      }
      for (var j = 0; j < sub.changes.length; ++j) {
        var cur = sub.changes[j];
        if (to < cur.from.line) {
          cur.from = Pos(cur.from.line + diff, cur.from.ch);
          cur.to = Pos(cur.to.line + diff, cur.to.ch);
        } else if (from <= cur.to.line) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        array.splice(0, i + 1);
        i = 0;
      }
    }
  }

  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
    rebaseHistArray(hist.done, from, to, diff);
    rebaseHistArray(hist.undone, from, to, diff);
  }

  // EVENT UTILITIES

  // Due to the fact that we still support jurassic IE versions, some
  // compatibility wrappers are needed.

  var e_preventDefault = CodeMirror.e_preventDefault = function(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
  };
  var e_stopPropagation = CodeMirror.e_stopPropagation = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
  };
  function e_defaultPrevented(e) {
    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false;
  }
  var e_stop = CodeMirror.e_stop = function(e) {e_preventDefault(e); e_stopPropagation(e);};

  function e_target(e) {return e.target || e.srcElement;}
  function e_button(e) {
    var b = e.which;
    if (b == null) {
      if (e.button & 1) b = 1;
      else if (e.button & 2) b = 3;
      else if (e.button & 4) b = 2;
    }
    if (mac && e.ctrlKey && b == 1) b = 3;
    return b;
  }

  // EVENT HANDLING

  // Lightweight event framework. on/off also work on DOM nodes,
  // registering native DOM handlers.

  var on = CodeMirror.on = function(emitter, type, f) {
    if (emitter.addEventListener)
      emitter.addEventListener(type, f, false);
    else if (emitter.attachEvent)
      emitter.attachEvent("on" + type, f);
    else {
      var map = emitter._handlers || (emitter._handlers = {});
      var arr = map[type] || (map[type] = []);
      arr.push(f);
    }
  };

  var off = CodeMirror.off = function(emitter, type, f) {
    if (emitter.removeEventListener)
      emitter.removeEventListener(type, f, false);
    else if (emitter.detachEvent)
      emitter.detachEvent("on" + type, f);
    else {
      var arr = emitter._handlers && emitter._handlers[type];
      if (!arr) return;
      for (var i = 0; i < arr.length; ++i)
        if (arr[i] == f) { arr.splice(i, 1); break; }
    }
  };

  var signal = CodeMirror.signal = function(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < arr.length; ++i) arr[i].apply(null, args);
  };

  var orphanDelayedCallbacks = null;

  // Often, we want to signal events at a point where we are in the
  // middle of some work, but don't want the handler to start calling
  // other methods on the editor, which might be in an inconsistent
  // state or simply not expect any other events to happen.
  // signalLater looks whether there are any handlers, and schedules
  // them to be executed when the last operation ends, or, if no
  // operation is active, when a timeout fires.
  function signalLater(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2), list;
    if (operationGroup) {
      list = operationGroup.delayedCallbacks;
    } else if (orphanDelayedCallbacks) {
      list = orphanDelayedCallbacks;
    } else {
      list = orphanDelayedCallbacks = [];
      setTimeout(fireOrphanDelayed, 0);
    }
    function bnd(f) {return function(){f.apply(null, args);};};
    for (var i = 0; i < arr.length; ++i)
      list.push(bnd(arr[i]));
  }

  function fireOrphanDelayed() {
    var delayed = orphanDelayedCallbacks;
    orphanDelayedCallbacks = null;
    for (var i = 0; i < delayed.length; ++i) delayed[i]();
  }

  // The DOM events that CodeMirror handles can be overridden by
  // registering a (non-DOM) handler on the editor for the event name,
  // and preventDefault-ing the event in that handler.
  function signalDOMEvent(cm, e, override) {
    if (typeof e == "string")
      e = {type: e, preventDefault: function() { this.defaultPrevented = true; }};
    signal(cm, override || e.type, cm, e);
    return e_defaultPrevented(e) || e.codemirrorIgnore;
  }

  function signalCursorActivity(cm) {
    var arr = cm._handlers && cm._handlers.cursorActivity;
    if (!arr) return;
    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
    for (var i = 0; i < arr.length; ++i) if (indexOf(set, arr[i]) == -1)
      set.push(arr[i]);
  }

  function hasHandler(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    return arr && arr.length > 0;
  }

  // Add on and off methods to a constructor's prototype, to make
  // registering events on such objects more convenient.
  function eventMixin(ctor) {
    ctor.prototype.on = function(type, f) {on(this, type, f);};
    ctor.prototype.off = function(type, f) {off(this, type, f);};
  }

  // MISC UTILITIES

  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerGap = 30;

  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = CodeMirror.Pass = {toString: function(){return "CodeMirror.Pass";}};

  // Reused option objects for setSelection & friends
  var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

  function Delayed() {this.id = null;}
  Delayed.prototype.set = function(ms, f) {
    clearTimeout(this.id);
    this.id = setTimeout(f, ms);
  };

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  var countColumn = CodeMirror.countColumn = function(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
      var nextTab = string.indexOf("\t", i);
      if (nextTab < 0 || nextTab >= end)
        return n + (end - i);
      n += nextTab - i;
      n += tabSize - (n % tabSize);
      i = nextTab + 1;
    }
  };

  // The inverse of countColumn -- find the offset that corresponds to
  // a particular column.
  function findColumn(string, goal, tabSize) {
    for (var pos = 0, col = 0;;) {
      var nextTab = string.indexOf("\t", pos);
      if (nextTab == -1) nextTab = string.length;
      var skipped = nextTab - pos;
      if (nextTab == string.length || col + skipped >= goal)
        return pos + Math.min(skipped, goal - col);
      col += nextTab - pos;
      col += tabSize - (col % tabSize);
      pos = nextTab + 1;
      if (col >= goal) return pos;
    }
  }

  var spaceStrs = [""];
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      spaceStrs.push(lst(spaceStrs) + " ");
    return spaceStrs[n];
  }

  function lst(arr) { return arr[arr.length-1]; }

  var selectInput = function(node) { node.select(); };
  if (ios) // Mobile Safari apparently has a bug where select() is broken.
    selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; };
  else if (ie) // Suppress mysterious IE10 errors
    selectInput = function(node) { try { node.select(); } catch(_e) {} };

  function indexOf(array, elt) {
    for (var i = 0; i < array.length; ++i)
      if (array[i] == elt) return i;
    return -1;
  }
  function map(array, f) {
    var out = [];
    for (var i = 0; i < array.length; i++) out[i] = f(array[i], i);
    return out;
  }

  function nothing() {}

  function createObj(base, props) {
    var inst;
    if (Object.create) {
      inst = Object.create(base);
    } else {
      nothing.prototype = base;
      inst = new nothing();
    }
    if (props) copyObj(props, inst);
    return inst;
  };

  function copyObj(obj, target, overwrite) {
    if (!target) target = {};
    for (var prop in obj)
      if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
        target[prop] = obj[prop];
    return target;
  }

  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function(){return f.apply(null, args);};
  }

  var nonASCIISingleCaseWordChar = /[\u00df\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  var isWordCharBasic = CodeMirror.isWordChar = function(ch) {
    return /\w/.test(ch) || ch > "\x80" &&
      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
  };
  function isWordChar(ch, helper) {
    if (!helper) return isWordCharBasic(ch);
    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) return true;
    return helper.test(ch);
  }

  function isEmpty(obj) {
    for (var n in obj) if (obj.hasOwnProperty(n) && obj[n]) return false;
    return true;
  }

  // Extending unicode characters. A series of a non-extending char +
  // any number of extending chars is treated as a single unit as far
  // as editing and measuring is concerned. This is not fully correct,
  // since some scripts/fonts/browsers also treat other configurations
  // of code points as a group.
  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch); }

  // DOM UTILITIES

  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (style) e.style.cssText = style;
    if (typeof content == "string") e.appendChild(document.createTextNode(content));
    else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
    return e;
  }

  var range;
  if (document.createRange) range = function(node, start, end, endNode) {
    var r = document.createRange();
    r.setEnd(endNode || node, end);
    r.setStart(node, start);
    return r;
  };
  else range = function(node, start, end) {
    var r = document.body.createTextRange();
    try { r.moveToElementText(node.parentNode); }
    catch(e) { return r; }
    r.collapse(true);
    r.moveEnd("character", end);
    r.moveStart("character", start);
    return r;
  };

  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      e.removeChild(e.firstChild);
    return e;
  }

  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e);
  }

  var contains = CodeMirror.contains = function(parent, child) {
    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
      child = child.parentNode;
    if (parent.contains)
      return parent.contains(child);
    do {
      if (child.nodeType == 11) child = child.host;
      if (child == parent) return true;
    } while (child = child.parentNode);
  };

  function activeElt() { return document.activeElement; }
  // Older versions of IE throws unspecified error when touching
  // document.activeElement in some cases (during loading, in iframe)
  if (ie && ie_version < 11) activeElt = function() {
    try { return document.activeElement; }
    catch(e) { return document.body; }
  };

  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*"); }
  var rmClass = CodeMirror.rmClass = function(node, cls) {
    var current = node.className;
    var match = classTest(cls).exec(current);
    if (match) {
      var after = current.slice(match.index + match[0].length);
      node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
    }
  };
  var addClass = CodeMirror.addClass = function(node, cls) {
    var current = node.className;
    if (!classTest(cls).test(current)) node.className += (current ? " " : "") + cls;
  };
  function joinClasses(a, b) {
    var as = a.split(" ");
    for (var i = 0; i < as.length; i++)
      if (as[i] && !classTest(as[i]).test(b)) b += " " + as[i];
    return b;
  }

  // WINDOW-WIDE EVENTS

  // These must be handled carefully, because naively registering a
  // handler for each editor will cause the editors to never be
  // garbage collected.

  function forEachCodeMirror(f) {
    if (!document.body.getElementsByClassName) return;
    var byClass = document.body.getElementsByClassName("CodeMirror");
    for (var i = 0; i < byClass.length; i++) {
      var cm = byClass[i].CodeMirror;
      if (cm) f(cm);
    }
  }

  var globalsRegistered = false;
  function ensureGlobalHandlers() {
    if (globalsRegistered) return;
    registerGlobalHandlers();
    globalsRegistered = true;
  }
  function registerGlobalHandlers() {
    // When the window resizes, we need to refresh active editors.
    var resizeTimer;
    on(window, "resize", function() {
      if (resizeTimer == null) resizeTimer = setTimeout(function() {
        resizeTimer = null;
        forEachCodeMirror(onResize);
      }, 100);
    });
    // When the window loses focus, we want to show the editor as blurred
    on(window, "blur", function() {
      forEachCodeMirror(onBlur);
    });
  }

  // FEATURE DETECTION

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // There is *some* kind of drag-and-drop support in IE6-8, but I
    // couldn't get it to work yet.
    if (ie && ie_version < 9) return false;
    var div = elt('div');
    return "draggable" in div || "dragDrop" in div;
  }();

  var zwspSupported;
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt("span", "\u200b");
      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
      if (measure.firstChild.offsetHeight != 0)
        zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8);
    }
    var node = zwspSupported ? elt("span", "\u200b") :
      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
    node.setAttribute("cm-text", "");
    return node;
  }

  // Feature-detect IE's crummy client rect reporting for bidi text
  var badBidiRects;
  function hasBadBidiRects(measure) {
    if (badBidiRects != null) return badBidiRects;
    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
    var r0 = range(txt, 0, 1).getBoundingClientRect();
    if (!r0 || r0.left == r0.right) return false; // Safari returns null in some cases (#2780)
    var r1 = range(txt, 1, 2).getBoundingClientRect();
    return badBidiRects = (r1.right - r0.right < 3);
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLines = CodeMirror.splitLines = "\n\nb".split(/\n/).length != 3 ? function(string) {
    var pos = 0, result = [], l = string.length;
    while (pos <= l) {
      var nl = string.indexOf("\n", pos);
      if (nl == -1) nl = string.length;
      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
      var rt = line.indexOf("\r");
      if (rt != -1) {
        result.push(line.slice(0, rt));
        pos += rt + 1;
      } else {
        result.push(line);
        pos = nl + 1;
      }
    }
    return result;
  } : function(string){return string.split(/\r\n?|\n/);};

  var hasSelection = window.getSelection ? function(te) {
    try { return te.selectionStart != te.selectionEnd; }
    catch(e) { return false; }
  } : function(te) {
    try {var range = te.ownerDocument.selection.createRange();}
    catch(e) {}
    if (!range || range.parentElement() != te) return false;
    return range.compareEndPoints("StartToEnd", range) != 0;
  };

  var hasCopyEvent = (function() {
    var e = elt("div");
    if ("oncopy" in e) return true;
    e.setAttribute("oncopy", "return;");
    return typeof e.oncopy == "function";
  })();

  var badZoomedRects = null;
  function hasBadZoomedRects(measure) {
    if (badZoomedRects != null) return badZoomedRects;
    var node = removeChildrenAndAdd(measure, elt("span", "x"));
    var normal = node.getBoundingClientRect();
    var fromRange = range(node, 0, 1).getBoundingClientRect();
    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1;
  }

  // KEY NAMES

  var keyNames = {3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
                  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
                  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
                  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod", 107: "=", 109: "-", 127: "Delete",
                  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
                  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
                  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"};
  CodeMirror.keyNames = keyNames;
  (function() {
    // Number keys
    for (var i = 0; i < 10; i++) keyNames[i + 48] = keyNames[i + 96] = String(i);
    // Alphabetic keys
    for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i);
    // Function keys
    for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i;
  })();

  // BIDI HELPERS

  function iterateBidiSections(order, from, to, f) {
    if (!order) return f(from, to, "ltr");
    var found = false;
    for (var i = 0; i < order.length; ++i) {
      var part = order[i];
      if (part.from < to && part.to > from || from == to && part.to == from) {
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr");
        found = true;
      }
    }
    if (!found) f(from, to, "ltr");
  }

  function bidiLeft(part) { return part.level % 2 ? part.to : part.from; }
  function bidiRight(part) { return part.level % 2 ? part.from : part.to; }

  function lineLeft(line) { var order = getOrder(line); return order ? bidiLeft(order[0]) : 0; }
  function lineRight(line) {
    var order = getOrder(line);
    if (!order) return line.text.length;
    return bidiRight(lst(order));
  }

  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLine(line);
    if (visual != line) lineN = lineNo(visual);
    var order = getOrder(visual);
    var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual);
    return Pos(lineN, ch);
  }
  function lineEnd(cm, lineN) {
    var merged, line = getLine(cm.doc, lineN);
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line;
      lineN = null;
    }
    var order = getOrder(line);
    var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line);
    return Pos(lineN == null ? lineNo(line) : lineN, ch);
  }
  function lineStartSmart(cm, pos) {
    var start = lineStart(cm, pos.line);
    var line = getLine(cm.doc, start.line);
    var order = getOrder(line);
    if (!order || order[0].level == 0) {
      var firstNonWS = Math.max(0, line.text.search(/\S/));
      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
      return Pos(start.line, inWS ? 0 : firstNonWS);
    }
    return start;
  }

  function compareBidiLevel(order, a, b) {
    var linedir = order[0].level;
    if (a == linedir) return true;
    if (b == linedir) return false;
    return a < b;
  }
  var bidiOther;
  function getBidiPartAt(order, pos) {
    bidiOther = null;
    for (var i = 0, found; i < order.length; ++i) {
      var cur = order[i];
      if (cur.from < pos && cur.to > pos) return i;
      if ((cur.from == pos || cur.to == pos)) {
        if (found == null) {
          found = i;
        } else if (compareBidiLevel(order, cur.level, order[found].level)) {
          if (cur.from != cur.to) bidiOther = found;
          return i;
        } else {
          if (cur.from != cur.to) bidiOther = i;
          return found;
        }
      }
    }
    return found;
  }

  function moveInLine(line, pos, dir, byUnit) {
    if (!byUnit) return pos + dir;
    do pos += dir;
    while (pos > 0 && isExtendingChar(line.text.charAt(pos)));
    return pos;
  }

  // This is needed in order to move 'visually' through bi-directional
  // text -- i.e., pressing left should make the cursor go left, even
  // when in RTL text. The tricky part is the 'jumps', where RTL and
  // LTR text touch each other. This often requires the cursor offset
  // to move more than one unit, in order to visually move one unit.
  function moveVisually(line, start, dir, byUnit) {
    var bidi = getOrder(line);
    if (!bidi) return moveLogically(line, start, dir, byUnit);
    var pos = getBidiPartAt(bidi, start), part = bidi[pos];
    var target = moveInLine(line, start, part.level % 2 ? -dir : dir, byUnit);

    for (;;) {
      if (target > part.from && target < part.to) return target;
      if (target == part.from || target == part.to) {
        if (getBidiPartAt(bidi, target) == pos) return target;
        part = bidi[pos += dir];
        return (dir > 0) == part.level % 2 ? part.to : part.from;
      } else {
        part = bidi[pos += dir];
        if (!part) return null;
        if ((dir > 0) == part.level % 2)
          target = moveInLine(line, part.to, -1, byUnit);
        else
          target = moveInLine(line, part.from, 1, byUnit);
      }
    }
  }

  function moveLogically(line, start, dir, byUnit) {
    var target = start + dir;
    if (byUnit) while (target > 0 && isExtendingChar(line.text.charAt(target))) target += dir;
    return target < 0 || target > line.text.length ? null : target;
  }

  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.

  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals

  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = (function() {
    // Character types for codepoints 0 to 0xff
    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
    // Character types for codepoints 0x600 to 0x6ff
    var arabicTypes = "rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmm";
    function charType(code) {
      if (code <= 0xf7) return lowTypes.charAt(code);
      else if (0x590 <= code && code <= 0x5f4) return "R";
      else if (0x600 <= code && code <= 0x6ed) return arabicTypes.charAt(code - 0x600);
      else if (0x6ee <= code && code <= 0x8ac) return "r";
      else if (0x2000 <= code && code <= 0x200b) return "w";
      else if (code == 0x200c) return "b";
      else return "L";
    }

    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;
    // Browsers seem to always treat the boundaries of block elements as being L.
    var outerType = "L";

    function BidiSpan(level, from, to) {
      this.level = level;
      this.from = from; this.to = to;
    }

    return function(str) {
      if (!bidiRE.test(str)) return false;
      var len = str.length, types = [];
      for (var i = 0, type; i < len; ++i)
        types.push(type = charType(str.charCodeAt(i)));

      // W1. Examine each non-spacing mark (NSM) in the level run, and
      // change the type of the NSM to the type of the previous
      // character. If the NSM is at the start of the level run, it will
      // get the type of sor.
      for (var i = 0, prev = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "m") types[i] = prev;
        else prev = type;
      }

      // W2. Search backwards from each instance of a European number
      // until the first strong type (R, L, AL, or sor) is found. If an
      // AL is found, change the type of the European number to Arabic
      // number.
      // W3. Change all ALs to R.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "1" && cur == "r") types[i] = "n";
        else if (isStrong.test(type)) { cur = type; if (type == "r") types[i] = "R"; }
      }

      // W4. A single European separator between two European numbers
      // changes to a European number. A single common separator between
      // two numbers of the same type changes to that type.
      for (var i = 1, prev = types[0]; i < len - 1; ++i) {
        var type = types[i];
        if (type == "+" && prev == "1" && types[i+1] == "1") types[i] = "1";
        else if (type == "," && prev == types[i+1] &&
                 (prev == "1" || prev == "n")) types[i] = prev;
        prev = type;
      }

      // W5. A sequence of European terminators adjacent to European
      // numbers changes to all European numbers.
      // W6. Otherwise, separators and terminators change to Other
      // Neutral.
      for (var i = 0; i < len; ++i) {
        var type = types[i];
        if (type == ",") types[i] = "N";
        else if (type == "%") {
          for (var end = i + 1; end < len && types[end] == "%"; ++end) {}
          var replace = (i && types[i-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // W7. Search backwards from each instance of a European number
      // until the first strong type (R, L, or sor) is found. If an L is
      // found, then change the type of the European number to L.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (cur == "L" && type == "1") types[i] = "L";
        else if (isStrong.test(type)) cur = type;
      }

      // N1. A sequence of neutrals takes the direction of the
      // surrounding strong text if the text on both sides has the same
      // direction. European and Arabic numbers act as if they were R in
      // terms of their influence on neutrals. Start-of-level-run (sor)
      // and end-of-level-run (eor) are used at level run boundaries.
      // N2. Any remaining neutrals take the embedding direction.
      for (var i = 0; i < len; ++i) {
        if (isNeutral.test(types[i])) {
          for (var end = i + 1; end < len && isNeutral.test(types[end]); ++end) {}
          var before = (i ? types[i-1] : outerType) == "L";
          var after = (end < len ? types[end] : outerType) == "L";
          var replace = before || after ? "L" : "R";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // Here we depart from the documented algorithm, in order to avoid
      // building up an actual levels array. Since there are only three
      // levels (0, 1, 2) in an implementation that doesn't take
      // explicit embedding into account, we can build up the order on
      // the fly, without following the level-based algorithm.
      var order = [], m;
      for (var i = 0; i < len;) {
        if (countsAsLeft.test(types[i])) {
          var start = i;
          for (++i; i < len && countsAsLeft.test(types[i]); ++i) {}
          order.push(new BidiSpan(0, start, i));
        } else {
          var pos = i, at = order.length;
          for (++i; i < len && types[i] != "L"; ++i) {}
          for (var j = pos; j < i;) {
            if (countsAsNum.test(types[j])) {
              if (pos < j) order.splice(at, 0, new BidiSpan(1, pos, j));
              var nstart = j;
              for (++j; j < i && countsAsNum.test(types[j]); ++j) {}
              order.splice(at, 0, new BidiSpan(2, nstart, j));
              pos = j;
            } else ++j;
          }
          if (pos < i) order.splice(at, 0, new BidiSpan(1, pos, i));
        }
      }
      if (order[0].level == 1 && (m = str.match(/^\s+/))) {
        order[0].from = m[0].length;
        order.unshift(new BidiSpan(0, 0, m[0].length));
      }
      if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
        lst(order).to -= m[0].length;
        order.push(new BidiSpan(0, len - m[0].length, len));
      }
      if (order[0].level != lst(order).level)
        order.push(new BidiSpan(order[0].level, len, len));

      return order;
    };
  })();

  // THE END

  CodeMirror.version = "5.0.0";

  return CodeMirror;
});

},{}],12:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("http", function() {
  function failFirstLine(stream, state) {
    stream.skipToEnd();
    state.cur = header;
    return "error";
  }

  function start(stream, state) {
    if (stream.match(/^HTTP\/\d\.\d/)) {
      state.cur = responseStatusCode;
      return "keyword";
    } else if (stream.match(/^[A-Z]+/) && /[ \t]/.test(stream.peek())) {
      state.cur = requestPath;
      return "keyword";
    } else {
      return failFirstLine(stream, state);
    }
  }

  function responseStatusCode(stream, state) {
    var code = stream.match(/^\d+/);
    if (!code) return failFirstLine(stream, state);

    state.cur = responseStatusText;
    var status = Number(code[0]);
    if (status >= 100 && status < 200) {
      return "positive informational";
    } else if (status >= 200 && status < 300) {
      return "positive success";
    } else if (status >= 300 && status < 400) {
      return "positive redirect";
    } else if (status >= 400 && status < 500) {
      return "negative client-error";
    } else if (status >= 500 && status < 600) {
      return "negative server-error";
    } else {
      return "error";
    }
  }

  function responseStatusText(stream, state) {
    stream.skipToEnd();
    state.cur = header;
    return null;
  }

  function requestPath(stream, state) {
    stream.eatWhile(/\S/);
    state.cur = requestProtocol;
    return "string-2";
  }

  function requestProtocol(stream, state) {
    if (stream.match(/^HTTP\/\d\.\d$/)) {
      state.cur = header;
      return "keyword";
    } else {
      return failFirstLine(stream, state);
    }
  }

  function header(stream) {
    if (stream.sol() && !stream.eat(/[ \t]/)) {
      if (stream.match(/^.*?:/)) {
        return "atom";
      } else {
        stream.skipToEnd();
        return "error";
      }
    } else {
      stream.skipToEnd();
      return "string";
    }
  }

  function body(stream) {
    stream.skipToEnd();
    return null;
  }

  return {
    token: function(stream, state) {
      var cur = state.cur;
      if (cur != header && cur != body && stream.eatSpace()) return null;
      return cur(stream, state);
    },

    blankLine: function(state) {
      state.cur = body;
    },

    startState: function() {
      return {cur: start};
    }
  };
});

CodeMirror.defineMIME("message/http", "http");

});

},{"../../lib/codemirror":11}],13:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// TODO actually recognize syntax of TypeScript constructs

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C, "debugger": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "module": kw("module"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               state.lastType == "sof" || /^[\[{}\(,;:]$/.test(state.lastType)) {
        readRegexp(stream);
        stream.match(/^\b(([gimyu])(?![gimyu]*\2))+\b/);
        return ret("regexp", "string-2");
      } else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) break;
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (/["'\/]/.test(ch)) {
        return;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), expression, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "module") return cont(pushlex("form"), pushcontext, afterModule, popcontext, poplex);
    if (type == "class") return cont(pushlex("form"), className, poplex);
    if (type == "export") return cont(pushlex("form"), afterExport, poplex);
    if (type == "import") return cont(pushlex("form"), afterImport, poplex);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(pattern, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "keyword c") return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, comprehension, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") { return pass(quasi, maybeop); }
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expressionNoComma);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (type == "[") {
      return cont(expression, expect("]"), afterprop);
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (isTS && type == ":") return cont(typedef);
  }
  function typedef(type) {
    if (type == "variable"){cx.marked = "variable-3"; return cont();}
  }
  function vardef() {
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (type == "variable") { register(value); return cont(); }
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type) {
    if (type == "spread") return cont(funarg);
    return pass(pattern, maybetype);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "extends") return cont(expression, classNameAfter);
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(classGetterSetter, functiondef, classBody);
      return cont(functiondef, classBody);
    }
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == ";") return cont(classBody);
    if (type == "}") return cont();
  }
  function classGetterSetter(type) {
    if (type != "variable") return pass();
    cx.marked = "property";
    return cont();
  }
  function afterModule(type, value) {
    if (type == "string") return cont(statement);
    if (type == "variable") { register(value); return cont(maybeFrom); }
  }
  function afterExport(_type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    return pass(statement);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    return cont();
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(expressionNoComma, maybeArrayComprehension);
  }
  function maybeArrayComprehension(type) {
    if (type == "for") return pass(comprehension, expect("]"));
    if (type == ",") return cont(commasep(maybeexpressionNoComma, "]"));
    return pass(commasep(expressionNoComma, "]"));
  }
  function comprehension(type) {
    if (type == "for") return cont(forspec, comprehension);
    if (type == "if") return cont(expression, comprehension);
  }

  function isContinuedStatement(state, textAfter) {
    return state.lastType == "operator" || state.lastType == "," ||
      isOperatorChar.test(textAfter.charAt(0)) ||
      /[,.]/.test(textAfter.charAt(0));
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",
    fold: "brace",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

},{"../../lib/codemirror":11}],14:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode('shell', function() {

  var words = {};
  function define(style, string) {
    var split = string.split(' ');
    for(var i = 0; i < split.length; i++) {
      words[split[i]] = style;
    }
  };

  // Atoms
  define('atom', 'true false');

  // Keywords
  define('keyword', 'if then do else elif while until for in esac fi fin ' +
    'fil done exit set unset export function');

  // Commands
  define('builtin', 'ab awk bash beep cat cc cd chown chmod chroot clear cp ' +
    'curl cut diff echo find gawk gcc get git grep kill killall ln ls make ' +
    'mkdir openssl mv nc node npm ping ps restart rm rmdir sed service sh ' +
    'shopt shred source sort sleep ssh start stop su sudo tee telnet top ' +
    'touch vi vim wall wc wget who write yes zsh');

  function tokenBase(stream, state) {
    if (stream.eatSpace()) return null;

    var sol = stream.sol();
    var ch = stream.next();

    if (ch === '\\') {
      stream.next();
      return null;
    }
    if (ch === '\'' || ch === '"' || ch === '`') {
      state.tokens.unshift(tokenString(ch));
      return tokenize(stream, state);
    }
    if (ch === '#') {
      if (sol && stream.eat('!')) {
        stream.skipToEnd();
        return 'meta'; // 'comment'?
      }
      stream.skipToEnd();
      return 'comment';
    }
    if (ch === '$') {
      state.tokens.unshift(tokenDollar);
      return tokenize(stream, state);
    }
    if (ch === '+' || ch === '=') {
      return 'operator';
    }
    if (ch === '-') {
      stream.eat('-');
      stream.eatWhile(/\w/);
      return 'attribute';
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/\d/);
      if(stream.eol() || !/\w/.test(stream.peek())) {
        return 'number';
      }
    }
    stream.eatWhile(/[\w-]/);
    var cur = stream.current();
    if (stream.peek() === '=' && /\w+/.test(cur)) return 'def';
    return words.hasOwnProperty(cur) ? words[cur] : null;
  }

  function tokenString(quote) {
    return function(stream, state) {
      var next, end = false, escaped = false;
      while ((next = stream.next()) != null) {
        if (next === quote && !escaped) {
          end = true;
          break;
        }
        if (next === '$' && !escaped && quote !== '\'') {
          escaped = true;
          stream.backUp(1);
          state.tokens.unshift(tokenDollar);
          break;
        }
        escaped = !escaped && next === '\\';
      }
      if (end || !escaped) {
        state.tokens.shift();
      }
      return (quote === '`' || quote === ')' ? 'quote' : 'string');
    };
  };

  var tokenDollar = function(stream, state) {
    if (state.tokens.length > 1) stream.eat('$');
    var ch = stream.next(), hungry = /\w/;
    if (ch === '{') hungry = /[^}]/;
    if (ch === '(') {
      state.tokens[0] = tokenString(')');
      return tokenize(stream, state);
    }
    if (!/\d/.test(ch)) {
      stream.eatWhile(hungry);
      stream.eat('}');
    }
    state.tokens.shift();
    return 'def';
  };

  function tokenize(stream, state) {
    return (state.tokens[0] || tokenBase) (stream, state);
  };

  return {
    startState: function() {return {tokens:[]};},
    token: function(stream, state) {
      return tokenize(stream, state);
    },
    lineComment: '#',
    fold: "brace"
  };
});

CodeMirror.defineMIME('text/x-sh', 'shell');

});

},{"../../lib/codemirror":11}],15:[function(require,module,exports){
/**
*
*	COMPUTE.IO: flow
*
*
*	DESCRIPTION:
*		- Creates a fluent interface.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: Flow()
	*	Flow constructor.
	*
	* @constructor
	* @returns {Flow} Flow instance
	*/
	function Flow() {
		if ( !(this instanceof Flow) ) {
			return new Flow();
		}
		this._value = null;
		return this;
	} // end FUNCTION Flow()

	/**
	* METHOD: value( [value] )
	*	Flow value setter and getter. If no `value` is provided, returns the flow `value`. If a `value` is provided, sets the flow `value`.
	*
	* @param {*} [value] - flow value
	* @returns {Flow|*} Flow instance or value
	*/
	Flow.prototype.value = function( value ) {
		if ( !arguments.length ) {
			return this._value;
		}
		this._value = value;
		return this;
	}; // end METHOD value()

	/**
	* METHOD: inspect()
	*	Logs the current flow value to the console.
	*
	* @returns {Flow} Flow instance
	*/
	Flow.prototype.inspect = function() {
		console.log( this._value );
		return this;
	}; // end METHOD inspect()

	/**
	* FUNCTION: createMethod( name, func )
	*	Creates a fluent method.
	*
	* @param {String} name - method name
	* @param {Function} func - method to bind to Flow prototype
	*/
	function createMethod( name, func ) {
		Flow.prototype[ name ] = function() {
			var args = Array.prototype.slice.call( arguments );
			args.unshift( this._value );
			this._value = func.apply( null, args );
			return this;
		};
	} // end FUNCTION createMethod()

	/**
	* FUNCTION: createFlow( compute )
	*	Binds a fluent interface to the compute object.
	*
	* @param {Object} compute - object containing compute methods
	* @returns {Flow} Flow constructor
	*/
	function createFlow( compute ) {
		var methods = Object.keys( compute ),
			method;

		methods.filter( function filter( method ) {
			return typeof compute[ method ] === 'function';
		});

		for ( var i = 0; i < methods.length; i++ ) {
			method = methods[ i ];
			createMethod( method, compute[ method ] );
		}

		return Flow;
	} // end FUNCTION createFlow()


	// EXPORTS //

	module.exports = createFlow;

})();

},{}],16:[function(require,module,exports){
/**
*
*	COMPUTE.IO
*
*
*	DESCRIPTION:
*		- Computation library.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var createFlow = require( './flow.js' );


// COMPUTE //

var compute = {};

/**
* Utilities.
*/
compute.polyval = require( 'compute-polynomial' );
compute.find = require( 'compute-find' );
compute.dims = require( 'compute-dims' );
compute.issorted = require( 'compute-issorted' );

/**
* Array creation.
*/
compute.linspace = require( 'compute-linspace' );
compute.incrspace = require( 'compute-incrspace' );
compute.logspace = require( 'compute-logspace' );
compute.datespace = require( 'compute-datespace' );
compute.incrdatespace = require( 'compute-incrdatespace' );
compute.zip = require( 'compute-zip' );
compute.unzip = require( 'compute-unzip' );

/**
* Sorting and reshaping arrays.
*/
compute.reverse = require( 'compute-reverse' );
compute.shuffle = require( 'compute-shuffle' );
compute.circshift = require( 'compute-circshift' );

/**
* Special functions.
*/
compute.abs = require( 'compute-abs' );
compute.sqrt = require( 'compute-sqrt' );
compute.signum = require( 'compute-signum' );
compute.erf = require( 'compute-erf' );
compute.erfc = require( 'compute-erfc' );
compute.erfinv = require( 'compute-erfinv' );
compute.erfcinv = require( 'compute-erfcinv' );

/**
* Arithmetic.
*/
compute.add = require( 'compute-add' );
compute.subtract = require( 'compute-subtract' );
compute.multiply = require( 'compute-multiply' );
compute.divide = require( 'compute-divide' );
compute.roundn = require( 'compute-roundn' );
compute.diff = require( 'compute-diff' );

/**
* Relational Operations.
*/
compute.eq = require( 'compute-eq' );
compute.neq = require( 'compute-neq' );
compute.gt = require( 'compute-gt' );
compute.geq = require( 'compute-geq' );
compute.lt = require( 'compute-lt' );
compute.leq = require( 'compute-leq' );

/**
* Logical Operations.
*/
compute.isnumeric = require( 'compute-isnumeric' );
compute.isnan = require( 'compute-isnan' );
compute.isfinite = require( 'compute-isfinite' );
compute.isinteger = require( 'compute-isinteger' );
compute.isinf = require( 'compute-isinf' );

/**
* Trigonometry.
*/
compute.deg2rad = require( 'compute-deg2rad' );
compute.rad2deg = require( 'compute-rad2deg' );

/**
* Geometry.
*/
compute.hypot = require( 'compute-hypot' );

/**
* Sets.
*/
compute.unique = require( 'compute-unique' );

/**
* Discrete Mathematics.
*/
compute.gcd = require( 'compute-gcd' );
compute.lcm = require( 'compute-lcm' );

/**
* Linear Algebra.
*/
compute.l1norm = require( 'compute-l1norm' );
compute.l2norm = require( 'compute-l2norm' );
compute.linfnorm = require( 'compute-linfnorm' );
compute.lpnorm = require( 'compute-lpnorm' );
compute.dot = require( 'compute-dot' );
compute.cross = require( 'compute-cross' );

/**
* Statistics.
*/
compute.min = require( 'compute-min' );
compute.argmin = require( 'compute-argmin' );
compute.nanmin = require( 'compute-nanmin' );
compute.argnanmin = require( 'compute-argnanmin' );
compute.incrmin = require( 'compute-incrmin' );
compute.mmin = require( 'compute-mmin' );
compute.cmin = require( 'compute-cmin' );
compute.max = require( 'compute-max' );
compute.argmax = require( 'compute-argmax' );
compute.nanmax = require( 'compute-nanmax' );
compute.argnanmax = require( 'compute-argnanmax' );
compute.incrmax = require( 'compute-incrmax' );
compute.mmax = require( 'compute-mmax' );
compute.cmax = require( 'compute-cmax' );
compute.range = require( 'compute-range' );
compute.nanrange = require( 'compute-nanrange' );
compute.sum = require( 'compute-sum' );
compute.nansum = require( 'compute-nansum' );
compute.incrsum = require( 'compute-incrsum' );
compute.msum = require( 'compute-msum' );
compute.incrmsum = require( 'compute-incrmsum' );
compute.csum = require( 'compute-csum' );
compute.prod = require( 'compute-prod' );
compute.nanprod = require( 'compute-nanprod' );
compute.mprod = require( 'compute-mprod' );
compute.cprod = require( 'compute-cprod' );
compute.mean = require( 'compute-mean' );
compute.nanmean = require( 'compute-nanmean' );
compute.incrmean = require( 'compute-incrmean' );
compute.mmean = require( 'compute-mmean' );
compute.incrmmean = require( 'compute-incrmmean' );
compute.wmean = require( 'compute-wmean' );
compute.gmean = require( 'compute-gmean' );
compute.nangmean = require( 'compute-nangmean' );
compute.hmean = require( 'compute-hmean' );
compute.nanhmean = require( 'compute-nanhmean' );
compute.qmean = require( 'compute-qmean' );
compute.nanqmean = require( 'compute-nanqmean' );
compute.variance = require( 'compute-variance' );
compute.nanvariance = require( 'compute-nanvariance' );
compute.incrvariance = require( 'compute-incrvariance' );
compute.mvariance = require( 'compute-mvariance' );
compute.incrmvariance = require( 'compute-incrmvariance' );
compute.stdev = require( 'compute-stdev' );
compute.nanstdev = require( 'compute-nanstdev' );
compute.incrstdev = require( 'compute-incrstdev' );
compute.mstdev = require( 'compute-mstdev' );
compute.incrmstdev = require( 'compute-incrmstdev' );
compute.mode = require( 'compute-mode' );
compute.median = require( 'compute-median' );
compute.nanmedian = require( 'compute-nanmedian' );
compute.quantile = require( 'compute-quantile' );
compute.quantiles = require( 'compute-quantiles' );
compute.nanquantiles = require( 'compute-nanquantiles' );
compute.iqr = require( 'compute-iqr' );
compute.idr = require( 'compute-idr' );
compute.midrange = require( 'compute-midrange' );
compute.midhinge = require( 'compute-midhinge' );
compute.midsummary = require( 'compute-midsummary' );
compute.midmean = require( 'compute-midmean' );
compute.lmidmean = require( 'compute-lmidmean' );
compute.umidmean = require( 'compute-umidmean' );
compute.trimean = require( 'compute-trimean' );
compute.skewness = require( 'compute-skewness' );
compute.kurtosis = require( 'compute-kurtosis' );
compute.covariance = require( 'compute-covariance' );
compute.pcorr = require( 'compute-pcorr' );

/**
* Information theory.
*/
compute.hamdist = require( 'compute-hamming' );
compute.tversky = require( 'compute-tversky-index' );

/**
* Flow.
*/
compute.flow = createFlow( compute );


// EXPORTS //

module.exports = compute;

},{"./flow.js":15,"compute-abs":17,"compute-add":18,"compute-argmax":19,"compute-argmin":20,"compute-argnanmax":21,"compute-argnanmin":22,"compute-circshift":23,"compute-cmax":25,"compute-cmin":26,"compute-covariance":27,"compute-cprod":30,"compute-cross":32,"compute-csum":33,"compute-datespace":34,"compute-deg2rad":38,"compute-diff":39,"compute-dims":40,"compute-divide":42,"compute-dot":43,"compute-eq":44,"compute-erf":47,"compute-erfc":48,"compute-erfcinv":49,"compute-erfinv":50,"compute-find":51,"compute-gcd":55,"compute-geq":57,"compute-gmean":58,"compute-gt":59,"compute-hamming":60,"compute-hmean":61,"compute-hypot":62,"compute-idr":63,"compute-incrdatespace":66,"compute-incrmax":69,"compute-incrmean":70,"compute-incrmin":71,"compute-incrmmean":72,"compute-incrmstdev":74,"compute-incrmsum":76,"compute-incrmvariance":78,"compute-incrspace":80,"compute-incrstdev":81,"compute-incrsum":82,"compute-incrvariance":83,"compute-iqr":84,"compute-isfinite":87,"compute-isinf":88,"compute-isinteger":89,"compute-isnan":90,"compute-isnumeric":91,"compute-issorted":92,"compute-kurtosis":93,"compute-l1norm":94,"compute-l2norm":95,"compute-lcm":96,"compute-leq":98,"compute-linfnorm":99,"compute-linspace":100,"compute-lmidmean":102,"compute-logspace":103,"compute-lpnorm":105,"compute-lt":107,"compute-max":108,"compute-mean":109,"compute-median":110,"compute-midhinge":111,"compute-midmean":114,"compute-midrange":115,"compute-midsummary":116,"compute-min":119,"compute-mmax":120,"compute-mmean":121,"compute-mmin":122,"compute-mode":123,"compute-mprod":124,"compute-mstdev":128,"compute-msum":129,"compute-multiply":130,"compute-mvariance":131,"compute-nangmean":132,"compute-nanhmean":133,"compute-nanmax":134,"compute-nanmean":135,"compute-nanmedian":136,"compute-nanmin":140,"compute-nanprod":141,"compute-nanqmean":143,"compute-nanquantiles":144,"compute-nanrange":150,"compute-nanstdev":152,"compute-nansum":153,"compute-nanvariance":154,"compute-neq":155,"compute-pcorr":158,"compute-polynomial":159,"compute-prod":160,"compute-qmean":162,"compute-quantile":163,"compute-quantiles":166,"compute-rad2deg":170,"compute-range":171,"compute-reverse":172,"compute-roundn":173,"compute-shuffle":174,"compute-signum":175,"compute-skewness":176,"compute-sqrt":177,"compute-stdev":178,"compute-subtract":179,"compute-sum":180,"compute-trimean":181,"compute-tversky-index":184,"compute-umidmean":191,"compute-unique":192,"compute-unzip":193,"compute-variance":195,"compute-wmean":196,"compute-zip":197}],17:[function(require,module,exports){
/**
*
*	COMPUTE: abs
*
*
*	DESCRIPTION:
*		- Computes an element-wise absolute value for each element in a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ABSOLUTE VALUE //

/**
* FUNCTION: abs( arr )
*	Computes an element-wise absolute value for each element of a numeric array. Note: the input array is mutated.
*
* @param {Array} arr - numeric array
*/
function abs( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'abs()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		val;
	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( val < 0 ) {
			arr[ i ] = -val;
		} else if ( val === 0 ) {
			// Return correctly -0.
			arr[ i ] = 0;
		}
	}
} // end FUNCTION abs()


// EXPORTS //

module.exports = abs;

},{}],18:[function(require,module,exports){
/**
*
*	COMPUTE: add
*
*
*	DESCRIPTION:
*		- Computes an element-wise addition of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ADD //

/**
* FUNCTION: add( arr, x )
*	Computes an element-wise addition of an array.
*
* @param {Array} arr - numeric array
* @param {Array|Number} x - either an array of equal length or a scalar
*/
function add( arr, x ) {
	var isArray = Array.isArray( x ),
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'add()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'add()::invalid input argument. Second argument must be either an array or a scalar.' );
	}
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'add()::invalid input argument. Arrays must be of equal length.' );
		}
		for ( i = 0; i < len; i++ ) {
			arr[ i ] += x[ i ];
		}
		return;
	}
	for ( i = 0; i < len; i++ ) {
		arr[ i ] += x;
	}
} // end FUNCTION add()


// EXPORTS //

module.exports = add;

},{}],19:[function(require,module,exports){
/**
*
*	COMPUTE: argmax
*
*
*	DESCRIPTION:
*		- Computes the maximum value of a numeric array and returns the corresponding array indices.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: argmax( arr )
*	Computes the maximum value of a numeric array and returns the corresponding array indices.
*
* @param {Array} arr - array of values
* @returns {Array} array indices
*/
function argmax( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'argmax()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		max = arr[ 0 ],
		idx = [ 0 ],
		val;

	for ( var i = 1; i < len; i++ ) {
		val = arr[ i ];
		if ( val > max ) {
			max = val;
			idx.length = 0;
			idx.push( i );
		}
		else if ( val === max ) {
			idx.push( i );
		}
	}
	return idx;
} // end FUNCTION argmax()


// EXPORTS //

module.exports = argmax;

},{}],20:[function(require,module,exports){
/**
*
*	COMPUTE: argmin
*
*
*	DESCRIPTION:
*		- Computes the minimum value of a numeric array and returns the corresponding array indices.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: argmin( arr )
*	Computes the minimum value of a numeric array and returns the corresponding array indices.
*
* @param {Array} arr - array of values
* @returns {Array} array indices
*/
function argmin( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'argmin()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		min = arr[ 0 ],
		idx = [ 0 ],
		val;

	for ( var i = 1; i < len; i++ ) {
		val = arr[ i ];
		if ( val < min ) {
			min = val;
			idx.length = 0;
			idx.push( i );
		}
		else if ( val === min ) {
			idx.push( i );
		}
	}
	return idx;
} // end FUNCTION argmin()


// EXPORTS //

module.exports = argmin;

},{}],21:[function(require,module,exports){
/**
*
*	COMPUTE: argnanmax
*
*
*	DESCRIPTION:
*		- Computes the maximum value of an array ignoring non-numeric values and returns the corresponding array indices.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: argnanmax( arr )
*	Computes the maximum value of an array ignoring non-numeric values and returns the corresponding array indices.
*
* @param {Array} arr - array of values
* @returns {Array} array indices
*/
function argnanmax( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'argnanmax()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		max = Number.NEGATIVE_INFINITY,
		idx = [],
		val;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( typeof val !== 'number' || val !== val ) {
			continue;
		}
		if ( val > max ) {
			max = val;
			idx.length = 0;
			idx.push( i );
		}
		else if ( val === max ) {
			idx.push( i );
		}
	}
	return idx;
} // end FUNCTION argnanmax()


// EXPORTS //

module.exports = argnanmax;

},{}],22:[function(require,module,exports){
/**
*
*	COMPUTE: argnanmin
*
*
*	DESCRIPTION:
*		- Computes the minimum value of an array ignoring non-numeric values and returns the corresponding array indices.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: argnanmin( arr )
*	Computes the minimum value of an array ignoring non-numeric values and returns the corresponding array indices.
*
* @param {Array} arr - array of values
* @returns {Array} array indices
*/
function argnanmin( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'argnanmin()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		min = Number.POSITIVE_INFINITY,
		idx = [],
		val;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( typeof val !== 'number' || val !== val ) {
			continue;
		}
		if ( val < min ) {
			min = val;
			idx.length = 0;
			idx.push( i );
		}
		else if ( val === min ) {
			idx.push( i );
		}
	}
	return idx;
} // end FUNCTION argnanmin()


// EXPORTS //

module.exports = argnanmin;

},{}],23:[function(require,module,exports){
/**
*
*	COMPUTE: circshift
*
*
*	DESCRIPTION:
*		- Shifts array elements (or string characters) circularly.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// CIRCSHIFT //

/**
* FUNCTION: circshift( x, k )
*	Shifts elements/characters circularly.
*
* @param {Array|String} x - array or string to be shifted
* @param {Number} k - integer specifying the number of positions to shift
* @param {Array|String} shifted results
*/
function circshift( x, k ) {
	var type = typeof x,
		dir = 1, // right
		len,
		i;
	if ( !Array.isArray( x ) && type !== 'string' ) {
		throw new TypeError( 'circshift()::invalid input argument. Must provide either an array or string to shift.' );
	}
	if ( !isInteger( k ) ) {
		throw new TypeError( 'circshift()::invalid input argument. Second argument must be an integer.' );
	}
	if ( type === 'string' ) {
		x = x.split( '' );
	}
	len = x.length;
	if ( k < 0 ) {
		// Get the equivalent positive number of positions...
		k = len + k; // len - |x|
	}
	// We only care about the remainder when we circularly shift. k === len means the elements stay in place.
	k = k % len;

	// Determine the direction which requires the fewest operations...
	if ( k > len/2 ) {
		dir = 0; // left
		k = len - k;
	}
	if ( dir ) {
		// Pop an element off the end and move to the front...
		for ( i = 0; i < k; i++ ) {
			x.unshift( x.pop() );
		}
	} else {
		// Shift an element off the front and move to the end...
		for ( i = 0; i < k; i++ ) {
			x.push( x.shift() );
		}
	}
	if ( type === 'string' ) {
		x = x.join( '' );
	}
	return x;
} // end FUNCTION circshift()


// EXPORTS //

module.exports = circshift;

},{"validate.io-integer":24}],24:[function(require,module,exports){
/**
*
*	VALIDATE: integer
*
*
*	DESCRIPTION:
*		- Validates if a value is an integer.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isNumber = require( 'validate.io-number' );


// ISINTEGER //

/**
* FUNCTION: isInteger( value )
*	Validates if a value is an integer.
*
* @param {Number} value - value to be validated
* @returns {Boolean} boolean indicating whether value is an integer
*/
function isInteger( value ) {
	return isNumber( value ) && value%1 === 0;
} // end FUNCTION isInteger()


// EXPORTS //

module.exports = isInteger;

},{"validate.io-number":200}],25:[function(require,module,exports){
/**
*
*	COMPUTE: cmax
*
*
*	DESCRIPTION:
*		- Computes the cumulative maximum of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: cmax( arr )
*	Computes the cumulative maximum of a numeric array.
*
* @param {Array} arr - numeric array
* @returns {Array} cumulative max
*/
function cmax( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'cmax()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		v = new Array( len ),
		max;

	max = arr[ 0 ];
	v[ 0 ] = max;
	for ( var i = 1; i < len; i++ ) {
		if ( arr[ i ] > max ) {
			max = arr[ i ];
		}
		v[ i ] = max;
	}
	return v;
} // end FUNCTION cmax()


// EXPORTS //

module.exports = cmax;

},{}],26:[function(require,module,exports){
/**
*
*	COMPUTE: cmin
*
*
*	DESCRIPTION:
*		- Computes the cumulative minimum of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: cmin( arr )
*	Computes the cumulative minimum of a numeric array.
*
* @param {Array} arr - numeric array
* @returns {Array} cumulative min
*/
function cmin( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'cmin()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		v = new Array( len ),
		min;

	min = arr[ 0 ];
	v[ 0 ] = min;
	for ( var i = 1; i < len; i++ ) {
		if ( arr[ i ] < min ) {
			min = arr[ i ];
		}
		v[ i ] = min;
	}
	return v;
} // end FUNCTION cmin()


// EXPORTS //

module.exports = cmin;

},{}],27:[function(require,module,exports){
/**
*
*	COMPUTE: covariance
*
*
*	DESCRIPTION:
*		- Computes the covariance between one or more numeric arrays.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' );


// COVARIANCE //

/**
* FUNCTION: covariance( arr1[, arr2,...,opts] )
*	Computes the covariance between one or more numeric arrays.
*
* @param {...Array} arr - numeric array
* @param {Object} [opts] - function options
* @param {Boolean} [opts.bias] - boolean indicating whether to calculate a biased or unbiased estimate of the covariance (default: false)
* @returns {Array} covariance matrix
*/
function covariance() {
	var bias = false,
		args,
		opts,
		nArgs,
		len,
		deltas,
		delta,
		means,
		C,
		cov,
		arr,
		N, r, A, B, sum, val,
		i, j, n;

	args = Array.prototype.slice.call( arguments );
	nArgs = args.length;

	if ( isObject( args[nArgs-1] ) ) {
		opts = args.pop();
		nArgs = nArgs - 1;
		if ( opts.hasOwnProperty( 'bias' ) ) {
			if ( typeof opts.bias !== 'boolean' ) {
				throw new TypeError( 'covariance()::invalid input argument. Bias option must be a boolean.' );
			}
			bias = opts.bias;
		}
	}
	if ( !nArgs ) {
		throw new Error( 'covariance()::insufficient input arguments. Must provide array arguments.' );
	}
	for ( i = 0; i < nArgs; i++ ) {
		if ( !Array.isArray( args[i] ) ) {
			throw new TypeError( 'covariance()::invalid input argument. Must provide array arguments.' );
		}
	}
	if ( Array.isArray( args[0][0] ) ) {
		// If the first argument is an array of arrays, calculate the covariance over the nested arrays, disregarding any other arguments...
		args = args[ 0 ];
	}
	nArgs = args.length;
	len = args[ 0 ].length;
	for ( i = 1; i < nArgs; i++ ) {
		if ( args[i].length !== len ) {
			throw new Error( 'covariance()::invalid input argument. All arrays must have equal length.' );
		}
	}
	// [0] Initialization...
	deltas = new Array( nArgs );
	means = new Array( nArgs );
	C = new Array( nArgs );
	cov = new Array( nArgs );
	for ( i = 0; i < nArgs; i++ ) {
		means[ i ] = args[ i ][ 0 ];
		arr = new Array( nArgs );
		for ( j = 0; j < nArgs; j++ ) {
			arr[ j ] = 0;
		}
		C[ i ] = arr;
		cov[ i ] = arr.slice(); // copy!
	}
	if ( len < 2 ) {
		return cov;
	}
	// [1] Compute the covariance...
	for ( n = 1; n < len; n++ ) {

		N = n + 1;
		r = n / N;

		// [a] Extract the values and compute the deltas...
		for ( i = 0; i < nArgs; i++ ) {
			deltas[ i ] = args[ i ][ n ] - means[ i ];
		}

		// [b] Update the covariance between one array and every other array...
		for ( i = 0; i < nArgs; i++ ) {
			arr = C[ i ];
			delta = deltas[ i ];
			for ( j = i; j < nArgs; j++ ) {
				A = arr[ j ];
				B = r * delta * deltas[ j ];
				sum = A + B;
				// Exploit the fact that the covariance matrix is symmetric...
				if ( i !== j ) {
					C[ j ][ i ] = sum;
				}
				arr[ j ] = sum;
			} // end FOR j
		} // end FOR i

		// [c] Update the means...
		for ( i = 0; i < nArgs; i++ ) {
			means[ i ] += deltas[ i ] / N;
		}
	} // end FOR n

	// [2] Normalize the co-moments...
	n = N - 1;
	if ( bias ) {
		n = N;
	}
	for ( i = 0; i < nArgs; i++ ) {
		arr = C[ i ];
		for ( j = i; j < nArgs; j++ ) {
			val = arr[ j ] / n;
			cov[ i ][ j ] = val;
			if ( i !== j ) {
				cov[ j ][ i ] = val;
			}
		}
	}
	return cov;
} // end FUNCTION covariance()


// EXPORTS //

module.exports = covariance;

},{"validate.io-object":28}],28:[function(require,module,exports){
/**
*
*	VALIDATE: object
*
*
*	DESCRIPTION:
*		- Validates if a value is a JavaScript object.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );


// ISOBJECT //

/**
* FUNCTION: isObject( value )
*	Validates if a value is a object; e.g., {}.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a object
*/
function isObject( value ) {
	return ( typeof value === 'object' && value !== null && !isArray( value ) );
} // end FUNCTION isObject()


// EXPORTS //

module.exports = isObject;

},{"validate.io-array":29}],29:[function(require,module,exports){
/**
*
*	VALIDATE: array
*
*
*	DESCRIPTION:
*		- Validates if a value is an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isArray( value )
*	Validates if a value is an array.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is an array
*/
function isArray( value ) {
	if ( Array.isArray ) {
		return Array.isArray( value );
	}
	return Object.prototype.toString.call( value ) === '[object Array]';
} // end FUNCTION isArray()

// EXPORTS //

module.exports = isArray;

},{}],30:[function(require,module,exports){
/**
*
*	COMPUTE: cumprod
*
*
*	DESCRIPTION:
*		- Computes the cumulative product of an array.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );


// CUMULATIVE PRODUCT //

/**
* FUNCTION: cprod( arr[, accessor] )
*	Computes the cumulative product of an array.
*
* @param {Array} arr - numeric array
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Array} cumulative product
*/

function cprod( arr, clbk ) {
	if ( !isArray( arr ) ) {
		throw new TypeError( 'cprod()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 ) {
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'cprod()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	var len = arr.length,
		v = new Array( len ),
		val,
		flg,
		i;

	if ( clbk ) {
		val = clbk( arr[ 0 ] );
		if ( val === 0 ) {
			flg = true;
		}
		v[ 0 ] = val;
		for ( i = 1; i < len; i++ ) {
			if ( flg ) {
				v[ i ] = 0;
				continue;
			}
			val = clbk( arr[ i ] );
			if ( val === 0 ) {
				flg = true;
				v[ i ] = 0;
			} else {
				v[ i ] = v[ i-1 ] * val;
			}
		}
	} else {
		val = arr[ 0 ];
		if ( val === 0 ) {
			flg = true;
		}
		v[ 0 ] = val;
		for ( i = 1; i < len; i++ ) {
			if ( flg ) {
				v[ i ] = 0;
				continue;
			}
			val = arr[ i ];
			if ( val === 0 ) {
				flg = true;
				v[ i ] = 0;
			} else {
				v[ i ] = v[ i-1 ] * val;
			}
		}
	}
	return v;
} // end FUNCTION cprod()


// EXPORTS //

module.exports = cprod;

},{"validate.io-array":31}],31:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],32:[function(require,module,exports){
/**
*
*	COMPUTE: cross
*
*
*	DESCRIPTION:
*		- Computes the cross product between two numeric arrays.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// CROSS PRODUCT //

/**
* FUNCTION: cross( x, y )
*	Computes the cross product between two numeric arrays.
*
* @param {Array} x - numeric array
* @param {Array} y - numeric array
* @returns {Number} cross product
*/
function cross( x, y ) {
	if ( !Array.isArray( x ) ) {
		throw new TypeError( 'cross()::invalid input argument. First argument must be an array.' );
	}
	if ( !Array.isArray( y ) ) {
		throw new TypeError( 'cross()::invalid input argument. Second argument must be an array.' );
	}
	if ( x.length !== 3 || y.length !== 3 ) {
		throw new Error( 'cross()::invalid input argument. Input arrays must be of length 3.' );
	}
	return [
		x[1]*y[2]-x[2]*y[1],
		x[2]*y[0]-x[0]*y[2],
		x[0]*y[1]-x[1]*y[0]
	];
} // end FUNCTION cross()


// EXPORTS //

module.exports = cross;

},{}],33:[function(require,module,exports){
/**
*
*	COMPUTE: csum
*
*
*	DESCRIPTION:
*		- Computes the cumulative sum of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: csum( arr )
*	Computes the cumulative sum of a numeric array.
*
* @param {Array} arr - numeric array
* @returns {Array} cumulative sum
*/
function csum( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'csum()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		v = new Array( len );

	v[ 0 ] = arr[ 0 ];
	for ( var i = 1; i < len; i++ ) {
		v[ i ] = v[ i-1 ] + arr[ i ];
	}
	return v;
} // end FUNCTION csum()


// EXPORTS //

module.exports = csum;

},{}],34:[function(require,module,exports){
/**
*
*	COMPUTE: datespace
*
*
*	DESCRIPTION:
*		- Generates an array of linearly spaced dates.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	isInteger = require( 'validate.io-integer' );


// VARIABLES //

var timestamp = /^\d{10}$|^\d{13}$/,
	rounders = [ 'floor', 'ceil', 'round' ];


// FUNCTIONS //

/**
* FUNCTION: validDate( value, name )
*	Validates a date parameter.
*
* @private
* @param {*} value - value to be validated
* @param {String} name - name to be used in error messages
* @returns {Date} validated date
*/
function validDate( value, name ) {
	var type;

	type = typeof value;
	if ( type === 'string' ) {
		value = Date.parse( value );
		if ( value !== value ) {
			throw new Error( 'datespace()::invalid input argument. Unable to parse ' +  name.toLowerCase() + ' date.' );
		}
		value = new Date( value );
	}
	if ( type === 'number' ) {
		if ( !timestamp.test( value ) ) {
			throw new Error( 'datespace()::invalid input argument. Numeric ' + name.toLowerCase() + ' date must be either a Unix or Javascript timestamp.' );
		}
		if ( value.toString().length === 10 ) {
			value = value * 1000; // sec to ms
		}
		value = new Date( value );
	}
	if ( !(value instanceof Date) ) {
		throw new TypeError( 'datespace()::invalid input argument. ' + name + ' date must either be a date string, Date object, Unix timestamp, or JavaScript timestamp.' );
	}
	return value;
} // end FUNCTION validDate()


// DATESPACE //

/**
* FUNCTION: datespace( start, stop[, length, options])
*	Generates an array of linearly spaced dates.
*
* @param {Date|Number|String} start - start time as either a `Date` object, Unix timestamp, JavaScript timestamp, or date string
* @param {Data|Number|String} stop - stop time as either a `Date` object, Unix timestamp, JavaScript timestamp, or date string
* @param {Number} [length] - output array length (default: 100)
* @param {Object} [options] - function options
* @param {String} [options.round] - specifies how sub-millisecond times should be rounded: [ 'floor', 'ceil', 'round' ] (default: 'floor' )
* @returns {Array} array of dates
*/
function datespace( start, stop, length, options ) {
	var nArgs = arguments.length,
		opts = {
			'round': 'floor'
		},
		len = 100,
		flg = true,
		round,
		end,
		d,
		tmp,
		arr;

	start = validDate( start, 'Start' );
	stop = validDate( stop, 'Stop' );

	if ( nArgs > 2 ) {
		if ( nArgs === 3 ) {
			if ( isObject( length ) ) {
				opts = length;
			} else {
				len = length;

				// Turn off checking the options object...
				flg = false;
			}
		} else {
			opts = options;
			len = length;
		}
		if ( len === 0 ) {
			return [];
		}
		if ( !isInteger( len ) || len < 0 ) {
			throw new TypeError( 'datespace()::invalid input argument. Length must a positive integer.' );
		}
		if ( flg ) {
			if ( !isObject( opts ) ) {
				throw new TypeError( 'datespace()::invalid input argument. Options must be an object.' );
			}
			if ( opts.hasOwnProperty( 'round' ) ) {
				if ( typeof opts.round !== 'string' ) {
					throw new TypeError( 'datespace()::invalid input argument. Round option must be a string.' );
				}
				if ( rounders.indexOf( opts.round ) === -1 ) {
					throw new Error( 'datespace()::invalid input argument. Unrecognized round option. Must be one of [' + rounders.join( ',' ) + '].' );
				}
			} else {
				opts.round = 'floor';
			}
		}
	}
	round = Math[ opts.round ];

	// Calculate the increment...
	end = len - 1;
	d = ( stop.getTime() - start.getTime() ) / end;

	// Build the output array...
	arr = new Array( len );
	tmp = start;
	arr[ 0 ] = tmp;
	tmp = tmp.getTime();
	for ( var i = 1; i < end; i++ ) {
		tmp += d;
		arr[ i ] = new Date( round( tmp ) );
	}
	arr[ end ] = stop;
	return arr;
} // end FUNCTION datespace()


// EXPORTS //

module.exports = datespace;

},{"validate.io-integer":35,"validate.io-object":36}],35:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],36:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":37}],37:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],38:[function(require,module,exports){
/**
*
*	COMPUTE: deg2rad
*
*
*	DESCRIPTION:
*		- Converts degrees to radians.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// DEGREES-TO-RADIANS //

/**
* FUNCTION: deg2rad( x )
*	Converts degrees to radians. Note: if provided an array, the array is mutated.
*
* @param {Array|Number} x - value(s) to be converted to radians
* @returns {Array|Number|Null} radian value(s). If `x` is an empty `array`, returns `null`.
*/
function deg2rad( x ) {
	var isArray = Array.isArray( x ),
		len;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'deg2rad()::invalid input argument. Must provide either a single numeric value or a numeric array.' );
	}
	if ( !isArray ) {
		return x * Math.PI / 180;
	}
	len = x.length;
	if ( !len ) {
		return null;
	}
	for ( var i = 0; i < len; i++ ) {
		x[ i ] *= Math.PI / 180;
	}
	return x;
} // end FUNCTION deg2rad()


// EXPORTS //

module.exports = deg2rad;

},{}],39:[function(require,module,exports){
/**
*
*	COMPUTE: diff
*
*
*	DESCRIPTION:
*		- Computes the differences between adjacent elements in an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// DIFF /

	/**
	* FUNCTION: diff( arr )
	*	Calculates the differences between adjacent elements in an array.
	*
	* @param {Array} arr - array of numerical values
	* @returns {Array} array of differences
	*/
	function diff( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'diff()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			d = new Array( len-1 );

		for ( var i = 0; i < len-1; i++ ) {
			d[ i ] = arr[ i ] - arr[ i+1 ];
		}
		return d;
	} // end FUNCTION diff()


	// EXPORTS //

	module.exports = diff;

})();
},{}],40:[function(require,module,exports){
/**
*
*	COMPUTE: dims
*
*
*	DESCRIPTION:
*		- Computes array dimensions.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// DIMS //

/**
* FUNCTION: dims( arr, d, max )
*	Computes array dimensions.
*
* @private
* @param {Array} arr - input array
* @param {Array} d - dimensions array
* @param {Number} max - max number of dimensions
* @returns {Array} dimensions array
*/
function dims( arr, d, max ) {
	if ( max && d.length === max ) {
		return;
	}
	if ( !Array.isArray( arr[0] ) ) {
		return;
	}
	d.push( arr[0].length );
	dims( arr[ 0 ], d, max );
} // end FUNCTION dims()

/**
* FUNCTION: check( arr, d )
*	Checks that all array elements have the same dimensions.
*
* @private
* @param {Array} arr - input array
* @param {Array} d - dimensions array
* @returns {Boolean} boolean indicating if all array elements have the same dimensions
*/
function check( arr, d ) {
	var len = arr.length,
		dim = d.shift(),
		nDims = d.length,
		val,
		flg;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( !Array.isArray( val ) || val.length !== dim ) {
			return false;
		}
		if ( nDims ) {
			flg = check( val, d.slice() );
			if ( !flg ) {
				return false;
			}
		}
	}
	return true;
} // end FUNCTION check()

/**
* FUNCTION: compute( arr[, max] )
*	Computes array dimensions.
*
* @param {Array} arr - input array
* @param {Number} [max] - limits the number of dimensions returned
* @returns {Array|null} array of dimensions or null
*/
function compute( arr, max ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'dims()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isInteger( max ) || max < 1 ) {
			throw new TypeError( 'dims()::invalid input argument. `max` option must be a positive integer.' );
		}
	}
	var d, flg;

	// [0] Initialize the dimensions array:
	d = [ arr.length ];

	// [1] Recursively determine array dimensions:
	dims( arr, d, max );

	// [2] Check that all array element dimensions are consistent...
	if ( d.length > 1 ) {
		flg = check( arr, d.slice( 1 ) );
		if ( !flg ) {
			return null;
		}
	}
	return d;
} // end FUNCTION compute()


// EXPORTS //

module.exports = compute;

},{"validate.io-integer":41}],41:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],42:[function(require,module,exports){
/**
*
*	COMPUTE: divide
*
*
*	DESCRIPTION:
*		- Computes an element-wise division of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// DIVIDE //

/**
* FUNCTION: divide( arr, x )
*	Computes an element-wise division of an array.
*
* @param {Array} arr - numeric array
* @param {Array|Number} x - either an array of equal length or a scalar
*/
function divide( arr, x ) {
	var isArray = Array.isArray( x ),
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'divide()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'divide()::invalid input argument. Second argument must be either an array or a scalar.' );
	}
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'divide()::invalid input argument. Arrays must be of equal length.' );
		}
		for ( i = 0; i < len; i++ ) {
			arr[ i ] /= x[ i ];
		}
		return;
	}
	for ( i = 0; i < len; i++ ) {
		arr[ i ] /= x;
	}
} // end FUNCTION divide()


// EXPORTS //

module.exports = divide;

},{}],43:[function(require,module,exports){
/**
*
*	COMPUTE: dot
*
*
*	DESCRIPTION:
*		- Computes the dot product between two numeric arrays.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// DOT PRODUCT //

/**
* FUNCTION: dot( x, y )
*	Computes the dot product between two numeric arrays.
*
* @param {Array} x - numeric array
* @param {Array} y - numeric array
* @returns {Number} dot product
*/
function dot( x, y ) {
	if ( !Array.isArray( x ) ) {
		throw new TypeError( 'dot()::invalid input argument. First argument must be an array.' );
	}
	if ( !Array.isArray( y ) ) {
		throw new TypeError( 'dot()::invalid input argument. Second argument must be an array.' );
	}
	var len = x.length,
		sum = 0;
	if ( len !== y.length ) {
		throw new Error( 'dot()::invalid input argument. Arrays must be of equal length.' );
	}
	for ( var i = 0; i < len; i++ ) {
		sum += x[ i ] * y[ i ];
	}
	return sum;
} // end FUNCTION dot()


// EXPORTS //

module.exports = dot;

},{}],44:[function(require,module,exports){
/**
*
*	COMPUTE: eq
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (equality) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' );


// EQUAL //

/**
* FUNCTION: eq( arr, x[, opts] )
*	Computes an element-wise comparison (equality) of an array.
*
* @param {Array} arr - input array
* @param {*} x - comparator
* @param {Object} [opts] - function options
* @param {Boolean} [opts.strict] - option indicating whether to enforce type equality (default: true)
* @param {Boolean} [opts.array] - option indicating whether to not perform element-by-element comparison when provided arrays of equal length (default: false)
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is equal to a compared value and `0` indicates that an input array element is not equal to a compared value
*/
function eq( arr, x, opts ) {
	var isArray = Array.isArray( x ),
		strict = true,
		arrCompare = false,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'eq()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'eq()::invalid input argument. Options must be an object.' );
		}
		if ( opts.hasOwnProperty( 'strict' ) ) {
			strict = opts.strict;
			if ( typeof strict !== 'boolean' ) {
				throw new TypeError( 'eq()::invalid input argument. Strict option must be a boolean.' );
			}
		}
		if ( opts.hasOwnProperty( 'array' ) ) {
			arrCompare = opts.array;
			if ( typeof arrCompare !== 'boolean' ) {
				throw new TypeError( 'eq()::invalid input argument. Array option must be a boolean.' );
			}
		}
	}
	len = arr.length;
	out = new Array( len );
	if ( strict ) {
		if ( !isArray || x.length !== len || arrCompare ) {
			for ( i = 0; i < len; i++ ) {
				if ( arr[ i ] === x ) {
					out[ i ] = 1;
				} else {
					out[ i ] = 0;
				}
			}
			return out;
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] === x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	if ( !isArray || x.length !== len || arrCompare ) {
		for ( i = 0; i < len; i++ ) {
			/* jshint eqeqeq:false */
			if ( arr[ i ] == x ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		/* jshint eqeqeq:false */
		if ( arr[ i ] == x[ i ] ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION eq()


// EXPORTS //

module.exports = eq;

},{"validate.io-object":45}],45:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":46}],46:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],47:[function(require,module,exports){
/**
*
*	COMPUTE: erf
*
*
*	DESCRIPTION:
*		- Error function.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* NOTE: the following copyright and license, as well as the long comment were part of the original implementation available as part of [FreeBSD]{@link https://svnweb.freebsd.org/base/release/9.3.0/lib/msun/src/s_erf.c?revision=268523&view=co}.
	*
	* The implementation follows the original, but has been modified for JavaScript.
	*/

	/**
	* ===========================
	* Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
	*
	* Developed at SunPro, a Sun Microsystems, Inc business.
	* Permission to use, copy, modify, and distribute this software is freely granted, provided that this notice is preserved.
	* ===========================
	*/

	/**
	* double erf(double x)
	*		                        x
	*		               2       |\
	*		erf(x) = -----------   | exp(-t*t)dt
	*		            sqrt(pi)  \|
	*		                       0
	*
	*		erfc(x) =  1-erf(x)
	*	Note that
	*		erf(-x) = -erf(x)
	*		erfc(-x) = 2 - erfc(x)
	*
	* Method:
	*	1. For |x| in [0, 0.84375)
	*		erf(x)  = x + x*R(x^2)
	*		erfc(x) = 1 - erf(x)           if x in [-.84375,0.25]
	*		        = 0.5 + ((0.5-x)-x*R)  if x in [0.25,0.84375]
	*		where R = P/Q where P is an odd poly of degree 8 and Q is an odd poly of degree 10.
	*			                       -57.90
	*			| R - (erf(x)-x)/x | <= 2
	*
	*
	*		Remark. The formula is derived by noting
	*			erf(x) = (2/sqrt(pi))*(x - x^3/3 + x^5/10 - x^7/42 + ....)
	*		and that
	*			2/sqrt(pi) = 1.128379167095512573896158903121545171688
	*		is close to one. The interval is chosen because the fix point of erf(x) is near 0.6174 (i.e., erf(x)=x when x is near 0.6174), and by some experiment, 0.84375 is chosen to guarantee the error is less than one ulp for erf.
	*
	*	2. For |x| in [0.84375,1.25), let s = |x| - 1, and c = 0.84506291151 rounded to single (24 bits)
	*		erf(x)  = sign(x) * (c  + P1(s)/Q1(s))
	*		erfc(x) = (1-c)  - P1(s)/Q1(s) if x > 0
	*			1+(c+P1(s)/Q1(s))    if x < 0
	*			|P1/Q1 - (erf(|x|)-c)| <= 2**-59.06
	*	Remark: here we use the taylor series expansion at x=1.
	*		erf(1+s) = erf(1) + s*Poly(s)
	*				= 0.845.. + P1(s)/Q1(s)
	*	That is, we use rational approximation to approximate
	*		erf(1+s) - (c = (single)0.84506291151)
	*	Note that |P1/Q1|< 0.078 for x in [0.84375,1.25] where
	*		P1(s) = degree 6 poly in s
	*		Q1(s) = degree 6 poly in s
	*
	*	3. For x in [1.25,1/0.35(~2.857143)),
	*		erfc(x) = (1/x)*exp(-x*x-0.5625+R1/S1)
	*		erf(x)  = 1 - erfc(x)
	*	where
	*		R1(z) = degree 7 poly in z, (z=1/x^2)
	*		S1(z) = degree 8 poly in z
	*
	*	4. For x in [1/0.35,28]
	*		erfc(x) = (1/x)*exp(-x*x-0.5625+R2/S2) if x > 0
	*		        = 2.0 - (1/x)*exp(-x*x-0.5625+R2/S2) if -6<x<0
	*		        = 2.0 - tiny		(if x <= -6)
	*		erf(x)  = sign(x)*(1.0 - erfc(x)) if x < 6, else
	*		erf(x)  = sign(x)*(1.0 - tiny)
	*	where
	*		R2(z) = degree 6 poly in z, (z=1/x^2)
	*		S2(z) = degree 7 poly in z
	*
	*	Note1:
	*		To compute exp(-x*x-0.5625+R/S), let s be a single precision number and s := x; then
	*		-x*x = -s*s + (s-x)*(s+x)
	*		exp(-x*x-0.5626+R/S) = exp(-s*s-0.5625)*exp((s-x)*(s+x)+R/S);
	*	Note2:
	*		Here 4 and 5 make use of the asymptotic series
	*		            exp(-x*x)
	*		erfc(x) ~  ----------- * ( 1 + Poly(1/x^2) )
	*		            x*sqrt(pi)
	*		We use rational approximation to approximate
	*			g(s)=f(1/x^2) = log(erfc(x)*x) - x*x + 0.5625
	*		Here is the error bound for R1/S1 and R2/S2
	*			|R1/S1 - f(x)|  < 2**(-62.57)
	*			|R2/S2 - f(x)|  < 2**(-61.52)
	*
	*	5. For inf > x >= 28
	*		erf(x)  = sign(x) *(1 - tiny)  (raise inexact)
	*		erfc(x) = tiny*tiny (raise underflow) if x > 0
	*		        = 2 - tiny if x<0
	*
	*	6. Special case:
	*		erf(0)  = 0, erf(inf)  = 1, erf(-inf) = -1,
	*		erfc(0) = 1, erfc(inf) = 0, erfc(-inf) = 2,
	*		erfc/erf(NaN) is NaN
	*/

	// CONSTANTS //

	var INF = Number.POSITIVE_INFINITY,
		NINF = Number.NEGATIVE_INFINITY,

		TINY = 1e-300,
		SMALL = 1.0 / (1 << 28 ), /* 2**-28; equiv is Math.pow( 2, -28 ) */
		ERX = 8.45062911510467529297e-1, /* 0x3FEB0AC1, 0x60000000 */

		// Coefficients for approximation to erf on [0, 0.84375)
		EFX = 1.28379167095512586316e-1, /* 0x3FC06EBA, 0x8214DB69 */
		EFX8 = 1.02703333676410069053, /* 0x3FF06EBA, 0x8214DB69 */
		PP0 = 1.28379167095512558561e-1, /* 0x3FC06EBA, 0x8214DB68 */
		PP1 = -3.25042107247001499370e-1, /* 0xBFD4CD7D, 0x691CB913 */
		PP2 = -2.84817495755985104766e-2, /* 0xBF9D2A51, 0xDBD7194F */
		PP3 = -5.77027029648944159157e-3, /* 0xBF77A291, 0x236668E4 */
		PP4 = -2.37630166566501626084e-5, /* 0xBEF8EAD6, 0x120016AC */
		QQ1 = 3.97917223959155352819e-1, /* 0x3FD97779, 0xCDDADC09 */
		QQ2 = 6.50222499887672944485e-2, /* 0x3FB0A54C, 0x5536CEBA */
		QQ3 = 5.08130628187576562776e-3, /* 0x3F74D022, 0xC4D36B0F */
		QQ4 = 1.32494738004321644526e-4, /* 0x3F215DC9, 0x221C1A10 */
		QQ5 = -3.96022827877536812320e-6, /* 0xBED09C43, 0x42A26120 */

		// Coefficients for approximation to erf on [0.84375, 1.25)
		PA0 = -2.36211856075265944077e-3, /* 0xBF6359B8, 0xBEF77538 */
		PA1 = 4.14856118683748331666e-1, /* 0x3FDA8D00, 0xAD92B34D */
		PA2 = -3.72207876035701323847e-1, /* 0xBFD7D240, 0xFBB8C3F1 */
		PA3 = 3.18346619901161753674e-1, /* 0x3FD45FCA, 0x805120E4 */
		PA4 = -1.10894694282396677476e-1, /* 0xBFBC6398, 0x3D3E28EC */
		PA5 = 3.54783043256182359371e-2, /* 0x3FA22A36, 0x599795EB */
		PA6 = -2.16637559486879084300e-3, /* 0xBF61BF38, 0x0A96073F */
		QA1 = 1.06420880400844228286e-1, /* 0x3FBB3E66, 0x18EEE323 */
		QA2 = 5.40397917702171048937e-1, /* 0x3FE14AF0, 0x92EB6F33 */
		QA3 = 7.18286544141962662868e-2, /* 0x3FB2635C, 0xD99FE9A7 */
		QA4 = 1.26171219808761642112e-1, /* 0x3FC02660, 0xE763351F */
		QA5 = 1.36370839120290507362e-2, /* 0x3F8BEDC2, 0x6B51DD1C */
		QA6 = 1.19844998467991074170e-2, /* 0x3F888B54, 0x5735151D */

		// Coefficients for approximation to erfc on [1.25, 1/0.35)
		RA0 = -9.86494403484714822705e-3, /* 0xBF843412, 0x600D6435 */
		RA1 = -6.93858572707181764372e-1, /* 0xBFE63416, 0xE4BA7360 */
		RA2 = -1.05586262253232909814e1, /* 0xC0251E04, 0x41B0E726 */
		RA3 = -6.23753324503260060396e1, /* 0xC04F300A, 0xE4CBA38D */
		RA4 = -1.62396669462573470355e2, /* 0xC0644CB1, 0x84282266 */
		RA5 = -1.84605092906711035994e2, /* 0xC067135C, 0xEBCCABB2 */
		RA6 = -8.12874355063065934246e1, /* 0xC0545265, 0x57E4D2F2 */
		RA7 = -9.81432934416914548592, /* 0xC023A0EF, 0xC69AC25C */
		SA1 = 1.96512716674392571292e1, /* 0x4033A6B9, 0xBD707687 */
		SA2 = 1.37657754143519042600e2, /* 0x4061350C, 0x526AE721 */
		SA3 = 4.34565877475229228821e2, /* 0x407B290D, 0xD58A1A71 */
		SA4 = 6.45387271733267880336e2, /* 0x40842B19, 0x21EC2868 */
		SA5 = 4.29008140027567833386e2, /* 0x407AD021, 0x57700314 */
		SA6 = 1.08635005541779435134e2, /* 0x405B28A3, 0xEE48AE2C */
		SA7 = 6.57024977031928170135, /* 0x401A47EF, 0x8E484A93 */
		SA8 = -6.04244152148580987438e-2, /* 0xBFAEEFF2, 0xEE749A62 */

		// Coefficients for approximation to erfc on [1/0.35, 28]
		RB0 = -9.86494292470009928597e-3, /* 0xBF843412, 0x39E86F4A */
		RB1 = -7.99283237680523006574e-1, /* 0xBFE993BA, 0x70C285DE */
		RB2 = -1.77579549177547519889e1, /* 0xC031C209, 0x555F995A */
		RB3 = -1.60636384855821916062e2, /* 0xC064145D, 0x43C5ED98 */
		RB4 = -6.37566443368389627722e2, /* 0xC083EC88, 0x1375F228 */
		RB5 = -1.02509513161107724954e3, /* 0xC0900461, 0x6A2E5992 */
		RB6 = -4.83519191608651397019e2, /* 0xC07E384E, 0x9BDC383F */
		SB1 = 3.03380607434824582924e1, /* 0x403E568B, 0x261D5190 */
		SB2 = 3.25792512996573918826e2, /* 0x40745CAE, 0x221B9F0A */
		SB3 = 1.53672958608443695994e3, /* 0x409802EB, 0x189D5118 */
		SB4 = 3.19985821950859553908e3, /* 0x40A8FFB7, 0x688C246A */
		SB5 = 2.55305040643316442583e3, /* 0x40A3F219, 0xCEDF3BE6 */
		SB6 = 4.74528541206955367215e2, /* 0x407DA874, 0xE79FE763 */
		SB7 = -2.24409524465858183362e1; /* 0xC03670E2, 0x42712D62 */


	// ERF //

	/**
	* FUNCTION: erf( x )
	*	Evaluates the error function for an input value.
	*
	* @private
	* @param {Number} x - input value
	* @returns {Number} evaluated error function
	*/
	function erf( x ) {
		var exp = Math.exp,
			sign = false,
			tmp,
			z, r, s, y, p, q;

		if ( typeof x !== 'number' ) {
			throw new TypeError( 'erf()::invalid input argument. Must provide a numeric value.' );
		}

		// [1] Special cases...

		// NaN:
		if ( x !== x ) {
			return NaN;
		}
		// Positive infinity:
		if ( x === INF ) {
			return 1;
		}
		// Negative infinity:
		if ( x === NINF ) {
			return -1;
		}

		// [2] Get the sign:
		if ( x < 0 ) {
			x = -x;
			sign = true;
		}

		// [3] |x| < 0.84375
		if ( x < 0.84375 ) {
			if ( x < SMALL ) {
				if ( x < TINY ) {
					// Avoid underflow:
					tmp = 0.125 * (8.0*x + EFX8*x );
				} else {
					tmp = x + EFX*x;
				}
			} else {
				z = x * x;
				// Horner's method: http://en.wikipedia.org/wiki/Horner's_method
				r = PP0 + z*(PP1+z*(PP2+z*(PP3+z*PP4)));
				s = 1.0 + z*(QQ1+z*(QQ2+z*(QQ3+z*(QQ4+z*QQ5))));
				y = r / s;
				tmp = x + x*y;
			}
			if ( sign ) {
				return -tmp;
			}
			return tmp;
		}

		// [4] 0.84375 <= |x| < 1.25
		if ( x < 1.25 ) {
			s = x - 1;
			p = PA0 + s*(PA1+s*(PA2+s*(PA3+s*(PA4+s*(PA5+s*PA6)))));
			q = 1 + s*(QA1+s*(QA2+s*(QA3+s*(QA4+s*(QA5+s*QA6)))));
			if ( sign ) {
				return -ERX - p/q;
			}
			return ERX + p/q;
		}

		// [5] INF > |x| >=6
		if ( x >= 6 ) {
			if ( sign ) {
				return TINY - 1;
			}
			return 1 - TINY;
		}

		s = 1 / (x*x);

		// [6] |x| < 1 / 0.35 ~2.857143
		if ( x < 1/0.35 ) {
			r = RA0 + s*(RA1+s*(RA2+s*(RA3+s*(RA4+s*(RA5+s*(RA6+s*RA7))))));
			s = 1 + s*(SA1+s*(SA2+s*(SA3+s*(SA4+s*(SA5+s*(SA6+s*(SA7+s*SA8)))))));
		} else { // [7] |x| >= 1/0.35 ~2.857143
			r = RB0 + s*(RB1+s*(RB2+s*(RB3+s*(RB4+s*(RB5+s*RB6)))));
			s = 1 + s*(SB1+s*(SB2+s*(SB3+s*(SB4+s*(SB5+s*(SB6+s*SB7))))));
		}
		z = x & 0xffffffff00000000; // pseudo-single (20-bit) precision x;
		r = exp( -z*z - 0.5625 ) * exp( (z-x)*(z+x) + r/s );
		if ( sign ) {
			return r/x - 1;
		}
		return 1 - r/x;
	} // end FUNCTION erf()


	// EXPORTS //

	module.exports = function( x ) {
		if ( typeof x === 'number' ) {
			return erf( x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'erf()::invalid input argument. Must provide an array.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = erf( x[ i ] );
		}
		return arr;
	};

})();
},{}],48:[function(require,module,exports){
/**
*
*	COMPUTE: erfc
*
*
*	DESCRIPTION:
*		- Complementary error function.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* NOTE: the following copyright and license, as well as the long comment were part of the original implementation available as part of [FreeBSD]{@link https://svnweb.freebsd.org/base/release/9.3.0/lib/msun/src/s_erf.c?revision=268523&view=co}.
	*
	* The implementation follows the original, but has been modified for JavaScript.
	*/

	/**
	* ===========================
	* Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
	*
	* Developed at SunPro, a Sun Microsystems, Inc business.
	* Permission to use, copy, modify, and distribute this software is freely granted, provided that this notice is preserved.
	* ===========================
	*/

	/**
	* double erfc(double x)
	*		                        x
	*		               2       |\
	*		erf(x) = -----------   | exp(-t*t)dt
	*		            sqrt(pi)  \|
	*		                       0
	*
	*		erfc(x) =  1-erf(x)
	*	Note that
	*		erf(-x) = -erf(x)
	*		erfc(-x) = 2 - erfc(x)
	*
	* Method:
	*	1. For |x| in [0, 0.84375)
	*		erf(x)  = x + x*R(x^2)
	*		erfc(x) = 1 - erf(x)           if x in [-.84375,0.25]
	*		        = 0.5 + ((0.5-x)-x*R)  if x in [0.25,0.84375]
	*		where R = P/Q where P is an odd poly of degree 8 and Q is an odd poly of degree 10.
	*			                       -57.90
	*			| R - (erf(x)-x)/x | <= 2
	*
	*
	*		Remark. The formula is derived by noting
	*			erf(x) = (2/sqrt(pi))*(x - x^3/3 + x^5/10 - x^7/42 + ....)
	*		and that
	*			2/sqrt(pi) = 1.128379167095512573896158903121545171688
	*		is close to one. The interval is chosen because the fix point of erf(x) is near 0.6174 (i.e., erf(x)=x when x is near 0.6174), and by some experiment, 0.84375 is chosen to guarantee the error is less than one ulp for erf.
	*
	*	2. For |x| in [0.84375,1.25), let s = |x| - 1, and c = 0.84506291151 rounded to single (24 bits)
	*		erf(x)  = sign(x) * (c  + P1(s)/Q1(s))
	*		erfc(x) = (1-c)  - P1(s)/Q1(s) if x > 0
	*			1+(c+P1(s)/Q1(s))    if x < 0
	*			|P1/Q1 - (erf(|x|)-c)| <= 2**-59.06
	*	Remark: here we use the taylor series expansion at x=1.
	*		erf(1+s) = erf(1) + s*Poly(s)
	*				= 0.845.. + P1(s)/Q1(s)
	*	That is, we use rational approximation to approximate
	*		erf(1+s) - (c = (single)0.84506291151)
	*	Note that |P1/Q1|< 0.078 for x in [0.84375,1.25] where
	*		P1(s) = degree 6 poly in s
	*		Q1(s) = degree 6 poly in s
	*
	*	3. For x in [1.25,1/0.35(~2.857143)),
	*		erfc(x) = (1/x)*exp(-x*x-0.5625+R1/S1)
	*		erf(x)  = 1 - erfc(x)
	*	where
	*		R1(z) = degree 7 poly in z, (z=1/x^2)
	*		S1(z) = degree 8 poly in z
	*
	*	4. For x in [1/0.35,28]
	*		erfc(x) = (1/x)*exp(-x*x-0.5625+R2/S2) if x > 0
	*		        = 2.0 - (1/x)*exp(-x*x-0.5625+R2/S2) if -6<x<0
	*		        = 2.0 - tiny		(if x <= -6)
	*		erf(x)  = sign(x)*(1.0 - erfc(x)) if x < 6, else
	*		erf(x)  = sign(x)*(1.0 - tiny)
	*	where
	*		R2(z) = degree 6 poly in z, (z=1/x^2)
	*		S2(z) = degree 7 poly in z
	*
	*	Note1:
	*		To compute exp(-x*x-0.5625+R/S), let s be a single precision number and s := x; then
	*		-x*x = -s*s + (s-x)*(s+x)
	*		exp(-x*x-0.5626+R/S) = exp(-s*s-0.5625)*exp((s-x)*(s+x)+R/S);
	*	Note2:
	*		Here 4 and 5 make use of the asymptotic series
	*		            exp(-x*x)
	*		erfc(x) ~  ----------- * ( 1 + Poly(1/x^2) )
	*		            x*sqrt(pi)
	*		We use rational approximation to approximate
	*			g(s)=f(1/x^2) = log(erfc(x)*x) - x*x + 0.5625
	*		Here is the error bound for R1/S1 and R2/S2
	*			|R1/S1 - f(x)|  < 2**(-62.57)
	*			|R2/S2 - f(x)|  < 2**(-61.52)
	*
	*	5. For inf > x >= 28
	*		erf(x)  = sign(x) *(1 - tiny)  (raise inexact)
	*		erfc(x) = tiny*tiny (raise underflow) if x > 0
	*		        = 2 - tiny if x<0
	*
	*	6. Special case:
	*		erf(0)  = 0, erf(inf)  = 1, erf(-inf) = -1,
	*		erfc(0) = 1, erfc(inf) = 0, erfc(-inf) = 2,
	*		erfc/erf(NaN) is NaN
	*/

	// CONSTANTS //

	var INF = Number.POSITIVE_INFINITY,
		NINF = Number.NEGATIVE_INFINITY,

		TINY = 1e-300,
		SMALL = 1.0 / (1 << 56 ), /* 2**-56; equiv is Math.pow( 2, -56 ) */
		ERX = 8.45062911510467529297e-1, /* 0x3FEB0AC1, 0x60000000 */

		// Coefficients for approximation to erfc on [0, 0.84375)
		PP0 = 1.28379167095512558561e-1, /* 0x3FC06EBA, 0x8214DB68 */
		PP1 = -3.25042107247001499370e-1, /* 0xBFD4CD7D, 0x691CB913 */
		PP2 = -2.84817495755985104766e-2, /* 0xBF9D2A51, 0xDBD7194F */
		PP3 = -5.77027029648944159157e-3, /* 0xBF77A291, 0x236668E4 */
		PP4 = -2.37630166566501626084e-5, /* 0xBEF8EAD6, 0x120016AC */
		QQ1 = 3.97917223959155352819e-1, /* 0x3FD97779, 0xCDDADC09 */
		QQ2 = 6.50222499887672944485e-2, /* 0x3FB0A54C, 0x5536CEBA */
		QQ3 = 5.08130628187576562776e-3, /* 0x3F74D022, 0xC4D36B0F */
		QQ4 = 1.32494738004321644526e-4, /* 0x3F215DC9, 0x221C1A10 */
		QQ5 = -3.96022827877536812320e-6, /* 0xBED09C43, 0x42A26120 */

		// Coefficients for approximation to erfc on [0.84375, 1.25)
		PA0 = -2.36211856075265944077e-3, /* 0xBF6359B8, 0xBEF77538 */
		PA1 = 4.14856118683748331666e-1, /* 0x3FDA8D00, 0xAD92B34D */
		PA2 = -3.72207876035701323847e-1, /* 0xBFD7D240, 0xFBB8C3F1 */
		PA3 = 3.18346619901161753674e-1, /* 0x3FD45FCA, 0x805120E4 */
		PA4 = -1.10894694282396677476e-1, /* 0xBFBC6398, 0x3D3E28EC */
		PA5 = 3.54783043256182359371e-2, /* 0x3FA22A36, 0x599795EB */
		PA6 = -2.16637559486879084300e-3, /* 0xBF61BF38, 0x0A96073F */
		QA1 = 1.06420880400844228286e-1, /* 0x3FBB3E66, 0x18EEE323 */
		QA2 = 5.40397917702171048937e-1, /* 0x3FE14AF0, 0x92EB6F33 */
		QA3 = 7.18286544141962662868e-2, /* 0x3FB2635C, 0xD99FE9A7 */
		QA4 = 1.26171219808761642112e-1, /* 0x3FC02660, 0xE763351F */
		QA5 = 1.36370839120290507362e-2, /* 0x3F8BEDC2, 0x6B51DD1C */
		QA6 = 1.19844998467991074170e-2, /* 0x3F888B54, 0x5735151D */

		// Coefficients for approximation to erfc on [1.25, 1/0.35)
		RA0 = -9.86494403484714822705e-3, /* 0xBF843412, 0x600D6435 */
		RA1 = -6.93858572707181764372e-1, /* 0xBFE63416, 0xE4BA7360 */
		RA2 = -1.05586262253232909814e1, /* 0xC0251E04, 0x41B0E726 */
		RA3 = -6.23753324503260060396e1, /* 0xC04F300A, 0xE4CBA38D */
		RA4 = -1.62396669462573470355e2, /* 0xC0644CB1, 0x84282266 */
		RA5 = -1.84605092906711035994e2, /* 0xC067135C, 0xEBCCABB2 */
		RA6 = -8.12874355063065934246e1, /* 0xC0545265, 0x57E4D2F2 */
		RA7 = -9.81432934416914548592, /* 0xC023A0EF, 0xC69AC25C */
		SA1 = 1.96512716674392571292e1, /* 0x4033A6B9, 0xBD707687 */
		SA2 = 1.37657754143519042600e2, /* 0x4061350C, 0x526AE721 */
		SA3 = 4.34565877475229228821e2, /* 0x407B290D, 0xD58A1A71 */
		SA4 = 6.45387271733267880336e2, /* 0x40842B19, 0x21EC2868 */
		SA5 = 4.29008140027567833386e2, /* 0x407AD021, 0x57700314 */
		SA6 = 1.08635005541779435134e2, /* 0x405B28A3, 0xEE48AE2C */
		SA7 = 6.57024977031928170135, /* 0x401A47EF, 0x8E484A93 */
		SA8 = -6.04244152148580987438e-2, /* 0xBFAEEFF2, 0xEE749A62 */

		// Coefficients for approximation to erfc on [1/0.35, 28]
		RB0 = -9.86494292470009928597e-3, /* 0xBF843412, 0x39E86F4A */
		RB1 = -7.99283237680523006574e-1, /* 0xBFE993BA, 0x70C285DE */
		RB2 = -1.77579549177547519889e1, /* 0xC031C209, 0x555F995A */
		RB3 = -1.60636384855821916062e2, /* 0xC064145D, 0x43C5ED98 */
		RB4 = -6.37566443368389627722e2, /* 0xC083EC88, 0x1375F228 */
		RB5 = -1.02509513161107724954e3, /* 0xC0900461, 0x6A2E5992 */
		RB6 = -4.83519191608651397019e2, /* 0xC07E384E, 0x9BDC383F */
		SB1 = 3.03380607434824582924e1, /* 0x403E568B, 0x261D5190 */
		SB2 = 3.25792512996573918826e2, /* 0x40745CAE, 0x221B9F0A */
		SB3 = 1.53672958608443695994e3, /* 0x409802EB, 0x189D5118 */
		SB4 = 3.19985821950859553908e3, /* 0x40A8FFB7, 0x688C246A */
		SB5 = 2.55305040643316442583e3, /* 0x40A3F219, 0xCEDF3BE6 */
		SB6 = 4.74528541206955367215e2, /* 0x407DA874, 0xE79FE763 */
		SB7 = -2.24409524465858183362e1; /* 0xC03670E2, 0x42712D62 */


	// ERFC //

	/**
	* FUNCTION: erfc( x )
	*	Evaluates the complementary error function for an input value.
	*
	* @private
	* @param {Number} x - input value
	* @returns {Number} evaluated complementary error function
	*/
	function erfc( x ) {
		var exp = Math.exp,
			sign = false,
			tmp,
			z, r, s, y, p, q;

		if ( typeof x !== 'number' ) {
			throw new TypeError( 'erfc()::invalid input argument. Must provide a numeric value.' );
		}

		// [1] Special cases...

		// NaN:
		if ( x !== x ) {
			return NaN;
		}
		// Positive infinity:
		if ( x === INF ) {
			return 0;
		}
		// Negative infinity:
		if ( x === NINF ) {
			return 2;
		}

		// [2] Get the sign:
		if ( x < 0 ) {
			x = -x;
			sign = true;
		}

		// [3] |x| < 0.84375
		if ( x < 0.84375 ) {
			// |x| < 2**-56
			if ( x < SMALL ) {
				tmp = x;
			} else {
				z = x * x;
				r = PP0 + z*(PP1+z*(PP2+z*(PP3+z*PP4)));
				s = 1 + z*(QQ1+z*(QQ2+z*(QQ3+z*(QQ4+z*QQ5))));
				y = r / s;
				if ( x < 0.25 ) { // |x| < 1/4
					tmp = x + x*y;
				} else {
					tmp = 0.5 + (x*y + (x-0.5));
				}
			}
			if ( sign ) {
				return 1 + tmp;
			}
			return 1 - tmp;
		}

		// [4] 0.84375 <= |x| < 1.25
		if ( x < 1.25 ) {
			s = x - 1;
			p = PA0 + s*(PA1+s*(PA2+s*(PA3+s*(PA4+s*(PA5+s*PA6)))));
			q = 1 + s*(QA1+s*(QA2+s*(QA3+s*(QA4+s*(QA5+s*QA6)))));
			if ( sign ) {
				return 1 + ERX + p/q;
			}
			return 1 - ERX - p/q;
		}

		// [5] |x| < 28
		if ( x < 28 ) {
			s = 1 / (x*x);
			// |x| < 1/0.35 ~ 2.857143
			if ( x < 1/0.35 ) {
				r = RA0 + s*(RA1+s*(RA2+s*(RA3+s*(RA4+s*(RA5+s*(RA6+s*RA7))))));
				s = 1 + s*(SA1+s*(SA2+s*(SA3+s*(SA4+s*(SA5+s*(SA6+s*SA7))))));
			} else { // |x| >= 1/0.35 ~ 2.857143
				if ( sign && x > 6 ) { // x < -6
					return 2 - TINY;
				}
				r = RB0 + s*(RB1+s*(RB2+s*(RB3+s*(RB4+s*(RB5+s*RB6)))));
				s = 1 + s*(SB1+s*(SB2+s*(SB3+s*(SB4+s*(SB5+s*(SB6+s*SB7))))));
			}
			z = x & 0xffffffff00000000; // pseudo-single (20-bit) precision x;
			r = exp( -z*z - 0.5625 ) * exp( (z-x)*(z+x) + r/s );
			if ( sign ) {
				return 2 - r/x;
			}
			return r/x;
		}

		if ( sign ) {
			return 2 - TINY; // ~2
		}
		return TINY * TINY; // ~0
	} // end FUNCTION erfc()


	// EXPORTS //

	module.exports = function( x ) {
		if ( typeof x === 'number' ) {
			return erfc( x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'erfc()::invalid input argument. Must provide an array.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = erfc( x[ i ] );
		}
		return arr;
	};

})();
},{}],49:[function(require,module,exports){
/**
*
*	COMPUTE: erfcinv
*
*
*	DESCRIPTION:
*		- Inverse complementary error function.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* erfcinv( x )
	*
	* Method:
	*	1. For `|x| <= 0.5`, evaluate inverse erf using the rational approximation:
	*
	*		`erfcinv = x(x+10)(Y+R(x))`
	*
	*	where `Y` is a constant and `R(x)` is optimized for a low absolute error compared to `|Y|`. Max error `~2e-18`.
	*
	*	2. For `0.5 > 1-|x| >= 0`, evaluate inverse erf using the rational approximation:
	*
	*		`erfcinv = sqrt(-2*log(1-x)) / (Y + R(1-x))`
	*
	*	where `Y `is a constant, and R(q) is optimised for a low absolute error compared to `Y`. Max error `~7e-17`.
	*
	*	3. For `1-|x| < 0.25`, we have a series of rational approximations all of the general form:
	*
	*		`p = sqrt(-log(1-x))`
	*
	*	Then the result is given by:
	*
	*		`erfcinv = p(Y+R(p-B))`
    *
    *	where `Y` is a constant, `B` is the lowest value of `p` for which the approximation is valid, and `R(x-B)` is optimized for a low absolute error compared to `Y`.
    *
    *	Note that almost all code will really go through the first or maybe second approximation.  After than we are dealing with very small input values.
    *
    *	If `p < 3`, max error `~1e-20`.
    *	If `p < 6`, max error `~8e-21`.
    *	If `p < 18`, max error `~1e-19`.
    *	If `p < 44`, max error `~6e-20`.
    *	If `p >= 44`, max error `~1e-20`.
	*/

	// MODULES //

	var polyval = require( 'compute-polynomial' );


	// CONSTANTS //

	var // Coefficients for erfcinv on [0, 0.5]:
		Y1 = 8.91314744949340820313e-2,
		P1 = [
			-5.08781949658280665617e-4,
			-8.36874819741736770379e-3,
			3.34806625409744615033e-2,
			-1.26926147662974029034e-2,
			-3.65637971411762664006e-2,
			2.19878681111168899165e-2,
			8.22687874676915743155e-3,
			-5.38772965071242932965e-3
		],
		Q1 = [
			1,
			-9.70005043303290640362e-1,
			-1.56574558234175846809,
			1.56221558398423026363,
			6.62328840472002992063e-1,
			-7.1228902341542847553e-1,
			-5.27396382340099713954e-2,
			7.95283687341571680018e-2,
			-2.33393759374190016776e-3,
			8.86216390456424707504e-4
		],

		// Coefficients for erfcinv for 0.5 > 1-x >= 0:
		Y2 = 2.249481201171875,
		P2 = [
			-2.02433508355938759655e-1,
			1.05264680699391713268e-1,
			8.37050328343119927838,
			1.76447298408374015486e1,
			-1.88510648058714251895e1,
			-4.46382324441786960818e1,
			1.7445385985570866523e1,
			2.11294655448340526258e1,
			-3.67192254707729348546
		],
		Q2 = [
			1,
			6.24264124854247537712,
			3.9713437953343869095,
			-2.86608180499800029974e1,
			-2.01432634680485188801e1,
			4.85609213108739935468e1,
			1.08268667355460159008e1,
			2.26436933413139721736e1,
			1.72114765761200282724
		],

		// Coefficients for erfcinv for sqrt( -log(1-x)):
		Y3 = 8.07220458984375e-1,
		P3 = [
			-1.31102781679951906451e-1,
			-1.63794047193317060787e-1,
			1.17030156341995252019e-1,
			3.87079738972604337464e-1,
			3.37785538912035898924e-1,
			1.42869534408157156766e-1,
			2.90157910005329060432e-2,
			2.14558995388805277169e-3,
			-6.79465575181126350155e-7,
			2.85225331782217055858e-8,
			-6.81149956853776992068e-10
		],
		Q3 = [
			1,
			3.46625407242567245975,
			5.38168345707006855425,
			4.77846592945843778382,
			2.59301921623620271374,
			8.48854343457902036425e-1,
			1.52264338295331783612e-1,
			1.105924229346489121e-2
		],

		Y4 = 9.3995571136474609375e-1,
		P4 = [
			-3.50353787183177984712e-2,
			-2.22426529213447927281e-3,
			1.85573306514231072324e-2,
			9.50804701325919603619e-3,
			1.87123492819559223345e-3,
			1.57544617424960554631e-4,
			4.60469890584317994083e-6,
			-2.30404776911882601748e-10,
			2.66339227425782031962e-12
		],
		Q4 = [
			1,
			1.3653349817554063097,
			7.62059164553623404043e-1,
			2.20091105764131249824e-1,
			3.41589143670947727934e-2,
			2.63861676657015992959e-3,
			7.64675292302794483503e-5
		],

		Y5 = 9.8362827301025390625e-1,
		P5 = [
			-1.67431005076633737133e-2,
			-1.12951438745580278863e-3,
            1.05628862152492910091e-3,
            2.09386317487588078668e-4,
            1.49624783758342370182e-5,
            4.49696789927706453732e-7,
            4.62596163522878599135e-9,
            -2.81128735628831791805e-14,
            9.9055709973310326855e-17
		],
		Q5 = [
			1,
			5.91429344886417493481e-1,
            1.38151865749083321638e-1,
            1.60746087093676504695e-2,
            9.64011807005165528527e-4,
            2.75335474764726041141e-5,
            2.82243172016108031869e-7
		];

	fliplr( P1 );
	fliplr( Q1 );
	fliplr( P2 );
	fliplr( Q2 );
	fliplr( P3 );
	fliplr( Q3 );
	fliplr( P4 );
	fliplr( Q4 );
	fliplr( P5 );
	fliplr( Q5 );


	// FUNCTIONS //

	/**
	* FUNCTION: fliplr( arr )
	*	Flips a vector left-to-right.
	*
	* @private
	* @param {Array} arr - vector to flip
	*/
	function fliplr( arr ) {
		var len = arr.length,
			half = Math.floor( len / 2 ),
			tmp, idx;

		for ( var i = 0; i < half; i++ ) {
			tmp = arr[ i ];
			idx = len - 1 - i;
			arr[ i ] = arr[ idx ];
			arr[ idx ] = tmp;
		}
	} // end FUNCTION fliplr()

	/**
	* FUNCTION: calc( x, v, P, Q, Y )
	*	Calculates a rational approximation.
	*
	* @private
	* @param {Number} x
	* @param {Number} v
	* @param {Array} P - array of polynomial coefficients
	* @param {Array} Q - array of polynomial coefficients
	* @param {Number} Y
	* @returns {Number} approximation
	*/
	function calc( x, v, P, Q, Y ) {
		var s, r;
		s = x - v;
		r = polyval( P, s ) / polyval( Q, s );
		return Y*x + r*x;
	} // end FUNCTION calc()


	// ERFINV //

	/**
	* FUNCTION: erfcinv( x )
	*	Evaluates the complementary inverse error function for an input value.
	*
	* @private
	* @param {Number} x - input value
	* @returns {Number} evaluated complementary inverse error function
	*/
	function erfcinv( x ) {
		var sign = false,
			q, g, r, s, tmp;

		if ( typeof x !== 'number' ) {
			throw new TypeError( 'erfcinv()::invalid input argument. Must provide a numeric value.' );
		}

		// [1] Special cases...

		// NaN
		if ( x !== x ) {
			return NaN;
		}
		// x not on the interval: [0,2]
		if ( x < 0 || x > 2 ) {
			throw new Error ( 'erfcinv()::invalid input argument. Value must be on the interval [0,2].' );
		}

		if ( x === 2 ) {
			return Number.POSITIVE_INFINITY;
		}
		if ( x === 0 ) {
			return Number.NEGATIVE_INFINITY;
		}
		if ( x === 1 ) {
			return 0;
		}

		// [2] Get the sign and make use of `erfc` reflection formula: `erfc(-z) = 2 - erfc(z)`...
		if ( x > 1 ) {
			q = 2 - x;
			x = 1 - q;
			sign = true;
		} else {
			q = x;
			x = 1 - x;
		}

		// [3] |x| <= 0.5
		if ( x <= 0.5 ) {
			g = x * (x+10);
			r = polyval( P1, x ) / polyval( Q1, x );
			tmp = g*Y1 + g*r;
			if ( sign ) {
				return -tmp;
			}
			return tmp;
		}

		// [4] 1-|x| >= 0.25
		if ( q >= 0.25 ) {
			g = Math.sqrt( -2 * Math.log( q ) );
			q = q - 0.25;
			r = polyval( P2, q ) / polyval( Q2, q );
			tmp = g / (Y2+r);
			if ( sign ) {
				return -tmp;
			}
			return tmp;
		}

		q = Math.sqrt( -Math.log( q ) );

		// [5] q < 3
		if ( q < 3 ) {
			return calc( q, 1.125, P3, Q3, Y3 );
		}
		// [6] q < 6
		if ( q < 6 ) {
			return calc( q, 3, P4, Q4, Y4 );
		}
		// NOTE: smallest number in JavaScript is 5e-324. Math.sqrt( -Math.log( 5e-324 ) ) ~27.2844
		return calc( q, 6, P5, Q5, Y5 );

		// NOTE: In the boost library, they are able to go to much smaller values, as 128 bit long doubles support ~1e-5000; something which JavaScript does not natively support.
	} // end FUNCTION erfinv()


	// EXPORTS //

	module.exports = function( x ) {
		if ( typeof x === 'number' ) {
			return erfcinv( x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'erfcinv()::invalid input argument. Must provide an array.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = erfcinv( x[ i ] );
		}
		return arr;
	};

})();
},{"compute-polynomial":159}],50:[function(require,module,exports){
/**
*
*	COMPUTE: erfinv
*
*
*	DESCRIPTION:
*		- Inverse error function.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* erfinv( x )
	*
	* Method:
	*	1. For `|x| <= 0.5`, evaluate inverse erf using the rational approximation:
	*
	*		`erfinv = x(x+10)(Y+R(x))`
	*
	*	where `Y` is a constant and `R(x)` is optimized for a low absolute error compared to `|Y|`. Max error `~2e-18`.
	*
	*	2. For `0.5 > 1-|x| >= 0`, evaluate inverse erf using the rational approximation:
	*
	*		`erfinv = sqrt(-2*log(1-x)) / (Y + R(1-x))`
	*
	*	where `Y `is a constant, and R(q) is optimised for a low absolute error compared to `Y`. Max error `~7e-17`.
	*
	*	3. For `1-|x| < 0.25`, we have a series of rational approximations all of the general form:
	*
	*		`p = sqrt(-log(1-x))`
	*
	*	Then the result is given by:
	*
	*		`erfinv = p(Y+R(p-B))`
    *
    *	where `Y` is a constant, `B` is the lowest value of `p` for which the approximation is valid, and `R(x-B)` is optimized for a low absolute error compared to `Y`.
    *
    *	Note that almost all code will really go through the first or maybe second approximation.  After than we are dealing with very small input values.
    *
    *	If `p < 3`, max error `~1e-20`.
    *	If `p < 6`, max error `~8e-21`.
    *	If `p < 18`, max error `~1e-19`.
    *	If `p < 44`, max error `~6e-20`.
    *	If `p >= 44`, max error `~1e-20`.
	*/

	// MODULES //

	var polyval = require( 'compute-polynomial' );


	// CONSTANTS //

	var // Coefficients for erfinv on [0, 0.5]:
		Y1 = 8.91314744949340820313e-2,
		P1 = [
			-5.08781949658280665617e-4,
			-8.36874819741736770379e-3,
			3.34806625409744615033e-2,
			-1.26926147662974029034e-2,
			-3.65637971411762664006e-2,
			2.19878681111168899165e-2,
			8.22687874676915743155e-3,
			-5.38772965071242932965e-3
		],
		Q1 = [
			1,
			-9.70005043303290640362e-1,
			-1.56574558234175846809,
			1.56221558398423026363,
			6.62328840472002992063e-1,
			-7.1228902341542847553e-1,
			-5.27396382340099713954e-2,
			7.95283687341571680018e-2,
			-2.33393759374190016776e-3,
			8.86216390456424707504e-4
		],

		// Coefficients for erfinv for 0.5 > 1-x >= 0:
		Y2 = 2.249481201171875,
		P2 = [
			-2.02433508355938759655e-1,
			1.05264680699391713268e-1,
			8.37050328343119927838,
			1.76447298408374015486e1,
			-1.88510648058714251895e1,
			-4.46382324441786960818e1,
			1.7445385985570866523e1,
			2.11294655448340526258e1,
			-3.67192254707729348546
		],
		Q2 = [
			1,
			6.24264124854247537712,
			3.9713437953343869095,
			-2.86608180499800029974e1,
			-2.01432634680485188801e1,
			4.85609213108739935468e1,
			1.08268667355460159008e1,
			2.26436933413139721736e1,
			1.72114765761200282724
		],

		// Coefficients for erfinv for sqrt( -log(1-x)):
		Y3 = 8.07220458984375e-1,
		P3 = [
			-1.31102781679951906451e-1,
			-1.63794047193317060787e-1,
			1.17030156341995252019e-1,
			3.87079738972604337464e-1,
			3.37785538912035898924e-1,
			1.42869534408157156766e-1,
			2.90157910005329060432e-2,
			2.14558995388805277169e-3,
			-6.79465575181126350155e-7,
			2.85225331782217055858e-8,
			-6.81149956853776992068e-10
		],
		Q3 = [
			1,
			3.46625407242567245975,
			5.38168345707006855425,
			4.77846592945843778382,
			2.59301921623620271374,
			8.48854343457902036425e-1,
			1.52264338295331783612e-1,
			1.105924229346489121e-2
		],

		Y4 = 9.3995571136474609375e-1,
		P4 = [
			-3.50353787183177984712e-2,
			-2.22426529213447927281e-3,
			1.85573306514231072324e-2,
			9.50804701325919603619e-3,
			1.87123492819559223345e-3,
			1.57544617424960554631e-4,
			4.60469890584317994083e-6,
			-2.30404776911882601748e-10,
			2.66339227425782031962e-12
		],
		Q4 = [
			1,
			1.3653349817554063097,
			7.62059164553623404043e-1,
			2.20091105764131249824e-1,
			3.41589143670947727934e-2,
			2.63861676657015992959e-3,
			7.64675292302794483503e-5
		],

		Y5 = 9.8362827301025390625e-1,
		P5 = [
			-1.67431005076633737133e-2,
			-1.12951438745580278863e-3,
            1.05628862152492910091e-3,
            2.09386317487588078668e-4,
            1.49624783758342370182e-5,
            4.49696789927706453732e-7,
            4.62596163522878599135e-9,
            -2.81128735628831791805e-14,
            9.9055709973310326855e-17
		],
		Q5 = [
			1,
			5.91429344886417493481e-1,
            1.38151865749083321638e-1,
            1.60746087093676504695e-2,
            9.64011807005165528527e-4,
            2.75335474764726041141e-5,
            2.82243172016108031869e-7
		];

	fliplr( P1 );
	fliplr( Q1 );
	fliplr( P2 );
	fliplr( Q2 );
	fliplr( P3 );
	fliplr( Q3 );
	fliplr( P4 );
	fliplr( Q4 );
	fliplr( P5 );
	fliplr( Q5 );


	// FUNCTIONS //

	/**
	* FUNCTION: fliplr( arr )
	*	Flips a vector left-to-right.
	*
	* @private
	* @param {Array} arr - vector to flip
	*/
	function fliplr( arr ) {
		var len = arr.length,
			half = Math.floor( len / 2 ),
			tmp, idx;

		for ( var i = 0; i < half; i++ ) {
			tmp = arr[ i ];
			idx = len - 1 - i;
			arr[ i ] = arr[ idx ];
			arr[ idx ] = tmp;
		}
	} // end FUNCTION fliplr()

	/**
	* FUNCTION: calc( x, v, P, Q, Y, sign )
	*	Calculates a rational approximation.
	*
	* @private
	* @param {Number} x
	* @param {Number} v
	* @param {Array} P - array of polynomial coefficients
	* @param {Array} Q - array of polynomial coefficients
	* @param {Number} Y
	* @param {Boolean} sign - indicates if positive or negative 
	* @returns {Number} approximation
	*/
	function calc( x, v, P, Q, Y, sign ) {
		var s, r, tmp;
		s = x - v;
		r = polyval( P, s ) / polyval( Q, s );
		tmp = Y*x + r*x;
		if ( sign ) {
			return -tmp;
		}
		return tmp;
	} // end FUNCTION calc()


	// ERFINV //

	/**
	* FUNCTION: erfinv( x )
	*	Evaluates the inverse error function for an input value.
	*
	* @private
	* @param {Number} x - input value
	* @returns {Number} evaluated inverse error function
	*/
	function erfinv( x ) {
		var sign = false,
			q, g, r, s, tmp;

		if ( typeof x !== 'number' ) {
			throw new TypeError( 'erfinv()::invalid input argument. Must provide a numeric value.' );
		}

		// [1] Special cases...

		// NaN
		if ( x !== x ) {
			return NaN;
		}
		// x not on the interval: [-1,1]
		if ( x < -1 || x > 1 ) {
			throw new Error ( 'erfinv()::invalid input argument. Value must be on the interval [-1,1].' );
		}

		if ( x === 1 ) {
			return Number.POSITIVE_INFINITY;
		}
		if ( x === -1 ) {
			return Number.NEGATIVE_INFINITY;
		}
		if ( x === 0 ) {
			return 0;
		}

		// [2] Get the sign and make use of `erf` reflection formula: `erf(-z) = -erf(z)`...
		if ( x < 0 ) {
			x = -x;
			sign = true;
		}
		q = 1 - x;

		// [3] |x| <= 0.5
		if ( x <= 0.5 ) {
			g = x * (x+10);
			r = polyval( P1, x ) / polyval( Q1, x );
			tmp = g*Y1 + g*r;
			if ( sign ) {
				return -tmp;
			}
			return tmp;
		}

		// [4] 1-|x| >= 0.25
		if ( q >= 0.25 ) {
			g = Math.sqrt( -2 * Math.log( q ) );
			q = q - 0.25;
			r = polyval( P2, q ) / polyval( Q2, q );
			tmp = g / (Y2+r);
			if ( sign ) {
				return -tmp;
			}
			return tmp;
		}

		q = Math.sqrt( -Math.log( q ) );

		// [5] q < 3
		if ( q < 3 ) {
			return calc( q, 1.125, P3, Q3, Y3, sign );
		}
		// [6] q < 6
		if ( q < 6 ) {
			return calc( q, 3, P4, Q4, Y4, sign );
		}
		// NOTE: smallest number in JavaScript is 5e-324. Math.sqrt( -Math.log( 5e-324 ) ) ~27.2844
		return calc( q, 6, P5, Q5, Y5, sign );

		// NOTE: In the boost library, they are able to go to much smaller values, as 128 bit long doubles support ~1e-5000; something which JavaScript does not natively support.
	} // end FUNCTION erfinv()


	// EXPORTS //

	module.exports = function( x ) {
		if ( typeof x === 'number' ) {
			return erfinv( x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'erfinv()::invalid input argument. Must provide an array.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = erfinv( x[ i ] );
		}
		return arr;
	};

})();
},{"compute-polynomial":159}],51:[function(require,module,exports){
/**
*
*	COMPUTE: find
*
*
*	DESCRIPTION:
*		- Finds array elements which satisfy a test condition.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	isInteger = require( 'validate.io-integer' );


// FIND //

/**
* FUNCTION: find( arr, [opts,], clbk )
*	Finds array elements which satisfy a test condition.
*
* @param {Array} arr - array from which elements will be tested
* @param {Object} [opts] - function options
* @param {Number} [opts.k] - limits the number of returned elements (default: `*`)
* @param {String} [opts.returns] - if `values`, values are returned; if `indices`, indices are returned; if `*`, both indices and values are returned (default: `indices`)
* @param {Function} clbk - function invoked for each array element. If the return value is truthy, the value is considered to have satisfied the test condition.
* @returns {Array} array of indices, element values, or arrays of index-value pairs
*/
function find( arr, opts, clbk ) {
	var returns = [ 'values', 'indices', '*' ],
		mode = 0,
		ret,
		len,
		k,
		v,
		i,
		count,
		out;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'find()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( arguments.length < 3 ) {
		clbk = opts;
		opts = {};
	}
	if ( typeof clbk !== 'function' ) {
		throw new TypeError( 'find()::invalid input argument. Callback argument must be a function.' );
	}
	if ( !isObject( opts ) ) {
		throw new TypeError( 'find()::invalid input argument. Options must be an object.' );
	}
	if ( opts.hasOwnProperty( 'k' ) ) {
		k = opts.k;
		if ( typeof k !== 'number' || k !== k || !isInteger( k ) ) {
			throw new TypeError( 'find()::invalid input argument. `k` must be an integer.' );
		}
	} else {
		k = len;
	}
	if ( opts.hasOwnProperty( 'returns' ) ) {
		ret = opts.returns;
		if ( typeof ret !== 'string' || returns.indexOf( ret ) === -1 ) {
			throw new TypeError( 'find()::invalid input argument. `returns` option must be a string and have one of the following values: `values`, `indices`, `all`.' );
		}
		if ( ret === 'values' ) {
			mode = 1;
		} else if ( ret === '*' ) {
			mode = 2;
		}
	}
	out = [];
	count = 0;

	if ( k === 0 ) {
		return out;
	}
	if ( k > 0 ) {
		// Search moving from begin-to-end [0,1,...]:
		for ( i = 0; i < len; i++ ) {
			v = arr[ i ];
			if ( clbk( v, i, arr ) ) {
				if ( mode === 2 ) {
					out.push( [ i, v ] );
				} else if ( mode === 1 ) {
					out.push( v );
				} else {
					out.push( i );
				}
				if ( ++count === k ) {
					break;
				}
			}
		}
		return out;
	}
	// Search moving from end-to-begin [...,2,1,0]:
	k = -k;
	for ( i = len-1; i >= 0; i-- ) {
		v = arr[ i ];
		if ( clbk( v, i, arr ) ) {
			if ( mode === 2 ) {
				out.push( [ i, v ] );
			} else if ( mode === 1 ) {
				out.push( v );
			} else {
				out.push( i );
			}
			if ( ++count === k ) {
				break;
			}
		}
	}
	return out;
} // end FUNCTION find()


// EXPORTS //

module.exports = find;

},{"validate.io-integer":52,"validate.io-object":53}],52:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],53:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":54}],54:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],55:[function(require,module,exports){
/**
*
*	COMPUTE: gcd
*
*
*	DESCRIPTION:
*		- Computes the greatest common divisor (gcd).
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// FUNCTIONS //

/**
* FUNCTION: gcd( a, b )
*	Computes the greatest common divisor of two integers `a` and `b`.
*
* @param {Number} a
* @param {Number} b
* @returns {Number} greatest common divisor
*/
function gcd( a, b ) {
	if ( !isInteger( a ) || !isInteger( b ) ) {
		throw new TypeError( 'gcd()::invalid input argument. Must provide integers.' );
	}
	if ( a < 0 ) {
		a = -a;
	}
	if ( b < 0 ) {
		b = -b;
	}
	// [0] Simple cases...
	if ( a === b ) {
		return a;
	}
	if ( a === 0 ) {
		return b;
	}
	if ( b === 0 ) {
		return a;
	}
	// [1] Look for factors of 2...
	if ( a % 2 === 0 ) { // is even
		if ( b % 2 === 1 ) { // is odd
			return gcd( a/2, b );
		}
		// both even...
		return 2 * gcd( a/2, b/2 );
	}
	if ( b % 2 === 0 ) {
		return gcd( a, b/2 );
	}
	// [2] Reduce larger argument...
	if ( a > b ) {
		return gcd( (a-b)/2, b );
	}
	return gcd( (b-a)/2, a );
} // end FUNCTION gcd()


// GREATEST COMMON DIVISOR //

/**
* FUNCTION: compute( arr )
*	Computes the greatest common divisor.
*
* @param {Array} arr - input array of integers
* @returns {Number|null} greatest common divisor or null.
*/
function compute( arr ) {
	var len, a, b;
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'gcd()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !len ) {
		return null;
	}
	// Exploit the fact that the gcd is an associative function...
	a = arr[ 0 ];
	for ( var i = 1; i < len; i++ ) {
		b = arr[ i ];
		a = gcd( a, b );
	}
	return a;
} // end FUNCTION compute()


// EXPORTS //

module.exports = compute;

},{"validate.io-integer":56}],56:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],57:[function(require,module,exports){
/**
*
*	COMPUTE: geq
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (greater than or equal to) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// GREATER THAN OR EQUAL TO //

/**
* FUNCTION: geq( arr, x )
*	Computes an element-wise comparison (greater than or equal to) of an array.
*
* @param {Array} arr - input array
* @param {Array|Number|String} x - comparator
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is greater than or equal to a compared value and `0` indicates that an input array element is not greater than or equal to a compared value
*/
function geq( arr, x ) {
	var isArray = Array.isArray( x ),
		type = typeof x,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'geq()::invalid input argument. Must provide an array.' );
	}
	if ( !isArray && ( type !== 'number' || x !== x ) && type !== 'string' ) {
		throw new TypeError( 'geq()::invalid input argument. Comparison input must either be an array, number, or string.' );
	}
	len = arr.length;
	out = new Array( len );
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'geq()::invalid input argument. Comparison array must have a length equal to that of the input array.' );
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] >= x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] >= x ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION geq()


// EXPORTS //

module.exports = geq;

},{}],58:[function(require,module,exports){
/**
*
*	COMPUTE: gmean
*
*
*	DESCRIPTION:
*		- Computes the geometric mean over an array of values.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// GMEAN //

	/**
	* FUNCTION: gmean( arr )
	*	Computes the geometric mean over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} gmean value
	*/
	function gmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'gmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			sum = 0,
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( val <= 0 ) {
				return NaN;
			}
			sum += Math.log( val ) / len;
		}
		return Math.exp( sum );
	} // end FUNCTION gmean()


	// EXPORTS //

	module.exports = gmean;

})();
},{}],59:[function(require,module,exports){
/**
*
*	COMPUTE: gt
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (greater than) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// GREATER THAN //

/**
* FUNCTION: gt( arr, x )
*	Computes an element-wise comparison (greater than) of an array.
*
* @param {Array} arr - input array
* @param {Array|Number|String} x - comparator
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is greater than a compared value and `0` indicates that an input array element is not greater than a compared value
*/
function gt( arr, x ) {
	var isArray = Array.isArray( x ),
		type = typeof x,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'gt()::invalid input argument. Must provide an array.' );
	}
	if ( !isArray && ( type !== 'number' || x !== x ) && type !== 'string' ) {
		throw new TypeError( 'gt()::invalid input argument. Comparison input must either be an array, number, or string.' );
	}
	len = arr.length;
	out = new Array( len );
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'gt()::invalid input argument. Comparison array must have a length equal to that of the input array.' );
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] > x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] > x ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION gt()


// EXPORTS //

module.exports = gt;

},{}],60:[function(require,module,exports){
/**
*
*	COMPUTE: hamming
*
*
*	DESCRIPTION:
*		- Computes the Hamming distance between two sequences.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: hamming( a, b )
	*	Computes the Hamming distance between two sequences.
	*
	* @param {String|Array} a - array or string sequence
	* @param {String|Array} b - array or string sequence
	* @returns {Number} Hamming distance
	*/
	function hamming( a, b ) {
		var aType = typeof a,
			bType = typeof b,
			dist = 0,
			len;

		if ( !Array.isArray( a ) && aType !== 'string' ) {
			throw new TypeError( 'hamming()::invalid input argument. Sequence must be either an array or a string.' );
		}
		if ( !Array.isArray( b ) && bType !== 'string' ) {
			throw new TypeError( 'hamming()::invalid input argument. Sequence must be either an array or a string.' );
		}
		if ( aType !== bType ) {
			throw new TypeError( 'hamming()::invalid input arguments. Sequences must be the same type; i.e., both strings or both arrays.' );
		}
		len = a.length;
		if ( len !== b.length ) {
			throw new Error( 'hamming()::invalid input arguments. Sequences must be the same length.' );
		}
		for ( var i = 0; i < len; i++ ) {
			if ( a[i] !== b[i] ) {
				dist += 1;
			}
		}
		return dist;
	} // end FUNCTION hamming()


	// EXPORTS //

	module.exports = hamming;

})();
},{}],61:[function(require,module,exports){
/**
*
*	COMPUTE: hmean
*
*
*	DESCRIPTION:
*		- Computes the harmonic mean over an array of values.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// HMEAN //

	/**
	* FUNCTION: hmean( arr )
	*	Computes the harmonic mean over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} harmonic mean
	*/
	function hmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'hmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			sum = 0,
			val;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( val <= 0 ) {
				return NaN;
			}
			sum += 1 / val;
		}
		return len / sum;
	} // end FUNCTION hmean()


	// EXPORTS //

	module.exports = hmean;

})();
},{}],62:[function(require,module,exports){
/**
*
*	COMPUTE: hypot
*
*
*	DESCRIPTION:
*		- Computes the hypotenuse of a right triangle.
*
*
*	NOTES:
*		[1] Based on http://www.johndcook.com/blog/2010/06/02/whats-so-hard-about-finding-a-hypotenuse/ .
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MODULES //

	var isNumeric = require( 'validate.io-number' );


	// HYPOT //

	/**
	* FUNCTION: hypot( a, b )
	*	Computes the hypotenuse of a right triangle.
	*
	* @param {Number} a - length of one side of triangle
	* @param {Number} b - length of other side of a triangle
	* @returns {Number} hypotenuse
	*/
	function hypot( a, b ) {
		if ( !isNumeric( a ) || !isNumeric( b ) ) {
			throw new TypeError( 'hypot()::invalid input argument. Input arguments must be numeric.' );
		}
		var min, max, r;
		a = Math.abs( a );
		b = Math.abs( b );
		if ( a > b ) {
			min = b;
			max = a;
		} else  {
			min = a;
			max = b;
		}
		r = min / max;
		return max * Math.sqrt( 1 + r*r );
	} // end FUNCTION hypot()


	// EXPORTS //

	module.exports = hypot;

})();
},{"validate.io-number":200}],63:[function(require,module,exports){
/**
*
*	COMPUTE: idr
*
*
*	DESCRIPTION:
*		- Computes the interdecile range for an array of values.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	quantile = require( 'compute-quantile' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// INTERDECILE RANGE //

/**
* FUNCTION: idr( arr[, opts] )
*	Computes the interdecile range for an array.
*
* @param {Array} arr - array of values
* @param {Object} [opts] - quantile options
* @returns {Number} interdecile range
*/
function idr( arr, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'idr()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'idr()::invalid input argument. Options should be an object.' );
		}
	} else {
		opts = {
			'sorted': false
		};
	}
	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
		opts.sorted = true;
	}
	return quantile( arr, 0.90, opts ) - quantile( arr, 0.10, opts );
} // end FUNCTION idr()


// EXPORTS //

module.exports = idr;

},{"compute-quantile":163,"validate.io-object":64}],64:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":65}],65:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],66:[function(require,module,exports){
/**
*
*	COMPUTE: incrdatespace
*
*
*	DESCRIPTION:
*		- Generates an array of linearly spaced dates using a provided increment.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

var isObject = require( 'validate.io-object' );


// VARIABLES //

var rounders,
	convert,
	timestamp,
	units,
	reUnits,
	fmt;

// Rounding options:
rounders = [
	'floor',
	'ceil',
	'round'
];

// Units:
units = [
	'y',
	'b',
	'w',
	'd',
	'h',
	'm',
	's',
	'ms'
];

// Conversions to milliseconds:
convert = {
	'ms': 1,
	's': 1000, // 1*1000
	'm': 60000, // 60*1000
	'h': 3600000, // 60000*60
	'd': 86400000, // 3600000*24
	'w': 604800000, // 86400000*7
	'b': 2629800000, // 365.25/12*86400000
	'y': 31557600000 // 365.25*86400000
};

// Regular expressions...
timestamp = /^\d{10}$|^\d{13}$/;

reUnits = {
	'ms': /^\d{0,}ms$|^\d{0,}millisecond$|^\d{0,}milliseconds$/,
	's': /^\d{0,}s$|^\d{0,}sec$|^\d{0,}secs$|^\d{0,}second$|^\d{0,}seconds$/,
	'm': /^\d{0,}m$|^\d{0,}min$|^\d{0,}mins$|^\d{0,}minute$|^\d{0,}minutes$/,
	'h': /^\d{0,}h$|^\d{0,}hr$|^\d{0,}hrs$|^\d{0,}hour$|^\d{0,}hours$/,
	'd': /^\d{0,}d$|^\d{0,}day$|^\d{0,}days$/,
	'w': /^\d{0,}w$|^\d{0,}wk$|^\d{0,}wks$|^\d{0,}week$|^\d{0,}weeks$/,
	'b': /^\d{0,}b$|^\d{0,}month$|^\d{0,}months$/,
	'y': /^\d{0,}y$|^\d{0,}yr$|^\d{0,}yrs$|^\d{0,}year$|^\d{0,}years$/
};

fmt = /^\d{0,}[a-z]+$/;


// FUNCTIONS //

/**
* FUNCTION: validDate( value, name )
*	Validates a date parameter.
*
* @private
* @param {*} value - value to be validated
* @param {String} name - name to be used in error messages
* @returns {Date} validated date
*/
function validDate( value, name ) {
	var type;

	type = typeof value;
	if ( type === 'string' ) {
		value = Date.parse( value );
		if ( value !== value ) {
			throw new Error( 'incrdatespace()::invalid input argument. Unable to parse ' +  name.toLowerCase() + ' date.' );
		}
		value = new Date( value );
	}
	if ( type === 'number' ) {
		if ( !timestamp.test( value ) ) {
			throw new Error( 'incrdatespace()::invalid input argument. Numeric ' + name.toLowerCase() + ' date must be either a Unix or Javascript timestamp.' );
		}
		if ( value.toString().length === 10 ) {
			value = value * 1000; // sec to ms
		}
		value = new Date( value );
	}
	if ( !(value instanceof Date) ) {
		throw new TypeError( 'incrdatespace()::invalid input argument. ' + name + ' date must either be a date string, Date object, Unix timestamp, or JavaScript timestamp.' );
	}
	return value;
} // end FUNCTION validDate()

/**
* FUNCTION: validIncrement( x )
*	Validates an increment.
*
* @private
* @param {String|Number} x - increment to be validated
* @returns {Number} increment in milliseconds
*/
function validIncrement( x ) {
	var N = units.length,
		sign = false,
		parts,
		len,
		unit,
		val,
		flg,
		i;

	if ( typeof x === 'number' ) {
		if ( x !== x ) {
			throw new TypeError( 'incrdatespace()::invalid value. Increment must be a valid number.' );
		}
		return x;
	}
	if ( typeof x !== 'string' ) {
		throw new TypeError( 'incrdatespace()::invalid value. Increment must be either a string or number.' );
	}
	// Convert the formatted string to milliseconds...
	if ( x[ 0 ] === '-' ) {
		sign = true;
		x = x.substr( 1 );
	}
	parts = x.split( '.' );
	len = parts.length;
	x = 0;
	while ( len ) {
		flg = false;
		val = parts.pop();
		if ( !fmt.test( val ) ) {
			throw new Error( 'incrdatespace()::invalid value. Scalar unit pair must have the following format: `ms`, `5ms`, `5days`, etc.' );
		}
		for ( i = 0; i < N; i++ ) {
			unit = units[ i ];
			if ( reUnits[ unit ].test( val ) ) {
				flg = true;
				val = parseInt( val, 10 );
				if ( val !== val ) {
					// No scalar...
					val = 1;
				}
				x += val * convert[ unit ];
				break;
			}
		}
		if ( !flg ) {
			throw new Error( 'incrdatespace()::invalid value. Unrecognized unit: `' + val + '`.' );
		}
		len = parts.length;
	}
	if ( sign ) {
		return -x;
	}
	return x;
} // end FUNCTION validIncrement()


// INCRDATESPACE //

/**
* FUNCTION: incrdatespace( start, stop[, increment, options])
*	Generates an array of linearly spaced dates using a provided increment.
*
* @param {Date|Number|String} start - start time as either a `Date` object, Unix timestamp, JavaScript timestamp, or date string
* @param {Data|Number|String} stop - stop time as either a `Date` object, Unix timestamp, JavaScript timestamp, or date string
* @param {Number|String} [increment] - value by which to increment successive dates (default: 'day')
* @param {Object} [options] - function options
* @param {String} [options.round] - specifies how sub-millisecond times should be rounded: [ 'floor', 'ceil', 'round' ] (default: 'floor' )
* @returns {Array} array of dates
*/
function incrdatespace( start, stop, increment, options ) {
	var nArgs = arguments.length,
		opts = {
			'round': 'floor'
		},
		incr = convert[ 'd' ],
		flg = true,
		round,
		len,
		i,
		tmp,
		arr;

	start = validDate( start, 'Start' );
	stop = validDate( stop, 'Stop' );

	if ( nArgs > 2 ) {
		if ( nArgs === 3 ) {
			if ( isObject( increment ) ) {
				opts = increment;
			} else {
				incr = increment;

				// Turn off checking the options object...
				flg = false;
			}
		} else {
			opts = options;
			incr = increment;
		}
		incr = validIncrement( incr );
		if ( flg ) {
			if ( !isObject( opts ) ) {
				throw new TypeError( 'incrdatespace()::invalid input argument. Options must be an object.' );
			}
			if ( opts.hasOwnProperty( 'round' ) ) {
				if ( typeof opts.round !== 'string' ) {
					throw new TypeError( 'incrdatespace()::invalid input argument. Round option must be a string.' );
				}
				if ( rounders.indexOf( opts.round ) === -1 ) {
					throw new Error( 'incrdatespace()::invalid input argument. Unrecognized round option. Must be one of [' + rounders.join( ',' ) + '].' );
				}
			} else {
				opts.round = 'floor';
			}
		}
	}
	round = Math[ opts.round ];

	// Calculate the array length:
	len = Math.ceil( ( stop-start ) / incr );
	if ( len < 0 ) {
		return [ start ];
	}

	// Build the output array...
	if ( len > 64000 ) {
		// Ensure fast elements...
		arr = [];
		arr.push( start );
		tmp = start.getTime();
		for ( i = 1; i < len; i++ ) {
			tmp += incr;
			arr.push( new Date( round( tmp ) ) );
		}
		return arr;
	}
	arr = new Array( len );
	arr[ 0 ] = start;
	tmp = start.getTime();
	for ( i = 1; i < len; i++ ) {
		tmp += incr;
		arr[ i ] = new Date( round( tmp ) );
	}
	return arr;
} // end FUNCTION incrdatespace()


// EXPORTS //

module.exports = incrdatespace;

},{"validate.io-object":67}],67:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":68}],68:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],69:[function(require,module,exports){
/**
*
*	COMPUTE: incrmax
*
*
*	DESCRIPTION:
*		- Provides a method to compute a maximum value incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// INCREMENTAL MAX //

	/**
	* FUNCTION: incrmax()
	*	Returns a method to compute the maximum value incrementally.
	*
	* @returns {Function} method to compute the max incrementally
	*/
	function incrmax() {
		var max = null;
		/**
		* FUNCTION: incrmax( [value] )
		*	If a `value` is provided, updates and returns the updated max. If no `value` is provided, returns the current max.
		*
		* @param {Number} [value] - value used to update the max
		* @returns {Number} max value
		*/
		return function incrmax( x ) {
			if ( !arguments.length ) {
				return max;
			}
			if ( x > max || max === null ) {
				max = x;
			}
			return max;
		};
	} // end FUNCTION incrmax()


	// EXPORTS //

	module.exports = incrmax;

})();
},{}],70:[function(require,module,exports){
/**
*
*	COMPUTE: incrmean
*
*
*	DESCRIPTION:
*		- Provides a method to compute an arithmetic mean incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// INCREMENTAL MEAN //

/**
* FUNCTION: incrmean()
*	Returns a method to compute an arithmetic mean incrementally.
*
* @returns {Function} method to compute an arithmetic mean incrementally
*/
function incrmean() {
	var mu = 0,
		N = 0,
		delta;
	/**
	* FUNCTION: incrmean( [value] )
	*	If a `value` is provided, updates and returns the updated mean. If no `value` is provided, returns the current mean.
	*
	* @param {Number} [value] - value used to update the mean
	* @returns {Number} mean value
	*/
	return function incrmean( x ) {
		if ( !arguments.length ) {
			return mu;
		}
		N += 1;
		delta = x - mu;
		mu += delta / N;
		return mu;
	};
} // end FUNCTION incrmean()


// EXPORTS //

module.exports = incrmean;

},{}],71:[function(require,module,exports){
/**
*
*	COMPUTE: incrmin
*
*
*	DESCRIPTION:
*		- Provides a method to compute a minimum value incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// INCREMENTAL MIN //

	/**
	* FUNCTION: incrmin()
	*	Returns a method to compute the minimum value incrementally.
	*
	* @returns {Function} method to compute the min incrementally
	*/
	function incrmin() {
		var min = null;
		/**
		* FUNCTION: incrmin( [value] )
		*	If a `value` is provided, updates and returns the updated min. If no `value` is provided, returns the current min.
		*
		* @param {Number} [value] - value used to update the min
		* @returns {Number} min value
		*/
		return function incrmin( x ) {
			if ( !arguments.length ) {
				return min;
			}
			if ( x < min || min === null ) {
				min = x;
			}
			return min;
		};
	} // end FUNCTION incrmin()


	// EXPORTS //

	module.exports = incrmin;

})();
},{}],72:[function(require,module,exports){
/**
*
*	COMPUTE: incrmmean
*
*
*	DESCRIPTION:
*		- Provides a method to compute a moving arithmetic mean incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// INCREMENTAL MOVING MEAN //

/**
* FUNCTION: incrmmean( W )
*	Returns a method to compute a moving arithmetic mean incrementally.
*
* @param {Number} W - window size
* @returns {Function} method to compute a moving arithmetic mean incrementally
*/
function incrmmean( W ) {
	if ( !isInteger( W ) || W < 1 ) {
		throw new TypeError( 'incrmmean()::invalid input argument. Window size must be a positive integer.' );
	}
	var arr = new Array( W ),
		mu = 0,
		N = 0,
		i = -1,
		delta,
		tmp;
	/**
	* FUNCTION: incrmmean( [value] )
	*	If a `value` is provided, updates and returns the updated mean. If no `value` is provided, returns the current mean.
	*
	* @param {Number} [value] - value used to update the moving mean
	* @returns {Number} mean
	*/
	return function incrmmean( x ) {
		if ( !arguments.length ) {
			if ( N === 0 ) {
				return null;
			}
			return mu;
		}
		// Update the index for managing the circular buffer...
		i = (i+1) % W;

		// Fill up the initial window; else, update the existing window...
		if ( N < W ) {
			arr[ i ] = x;
			N += 1;
			delta = x - mu;
			mu += delta / N;
		} else {
			tmp = arr[ i ];
			arr[ i ] = x;
			delta = x - tmp;
			mu += delta / W;
		}
		return mu;
	};
} // end FUNCTION incrmmean()


// EXPORTS //

module.exports = incrmmean;

},{"validate.io-integer":73}],73:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],74:[function(require,module,exports){
/**
*
*	COMPUTE: incrmstdev
*
*
*	DESCRIPTION:
*		- Provides a method to compute a moving sample standard deviation incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// INCREMENTAL MOVING SAMPLE STANDARD DEVIATION //

/**
* FUNCTION: incrmstdev( W )
*	Returns a method to compute a moving sample standard deviation incrementally.
*
* @param {Number} W - window size
* @returns {Function} method to compute a moving sample standard deviation incrementally
*/
function incrmstdev( W ) {
	if ( !isInteger( W ) || W < 1 ) {
		throw new TypeError( 'incrmstdev()::invalid input argument. Window size must be a positive integer.' );
	}
	var arr = new Array( W ),
		n = W - 1,
		M2 = 0,
		mu = 0,
		N = 0,
		i = -1,
		delta,
		tmp,
		d1,
		d2;
	/**
	* FUNCTION: incrmstdev( [value] )
	*	If a `value` is provided, updates and returns the updated sample standard deviation. If no `value` is provided, returns the current sample standard deviation.
	*
	* @param {Number} [value] - value used to update the moving sample standard deviation
	* @returns {Number} sample standard deviation
	*/
	return function incrmstdev( x ) {
		if ( !arguments.length ) {
			if ( N === 0 ) {
				return null;
			}
			if ( N === 1 ) {
				return 0;
			}
			if ( N < W ) {
				return Math.sqrt( M2 / (N-1) );
			}
			return Math.sqrt( M2 / n );
		}
		// Update the index for managing the circular buffer...
		i = (i+1) % W;

		// Fill up the initial window; else, update the existing window...
		if ( N < W ) {
			arr[ i ] = x;
			N += 1;
			delta = x - mu;
			mu += delta / N;
			M2 += delta * (x - mu);
			if ( N === 1 ) {
				return 0;
			}
			return Math.sqrt( M2 / (N-1) );
		}
		if ( N === 1 ) {
			return 0;
		}
		tmp = arr[ i ];
		arr[ i ] = x;
		delta = x - tmp;
		d1 = tmp - mu;
		mu += delta / W;
		d2 = x - mu;
		M2 += delta * (d1 + d2);

		return Math.sqrt( M2 / n );
	};
} // end FUNCTION incrmstdev()


// EXPORTS //

module.exports = incrmstdev;

},{"validate.io-integer":75}],75:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],76:[function(require,module,exports){
/**
*
*	COMPUTE: incrmsum
*
*
*	DESCRIPTION:
*		- Provides a method to compute a moving sum incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// INCREMENTAL MOVING SUM //

/**
* FUNCTION: incrmsum( W )
*	Returns a method to compute a moving sum incrementally.
*
* @param {Number} W - window size
* @returns {Function} method to compute a moving sum incrementally
*/
function incrmsum( W ) {
	if ( !isInteger( W ) || W < 1 ) {
		throw new TypeError( 'incrmsum()::invalid input argument. Window size must be a positive integer.' );
	}
	var arr = new Array( W ),
		sum = 0,
		N = 0,
		i = -1,
		tmp;
	/**
	* FUNCTION: incrmsum( [value] )
	*	If a `value` is provided, updates and returns the updated sum. If no `value` is provided, returns the current sum.
	*
	* @param {Number} [value] - value used to update the moving sum
	* @returns {Number} sum
	*/
	return function incrmsum( x ) {
		if ( !arguments.length ) {
			if ( N === 0 ) {
				return null;
			}
			return sum;
		}
		// Update the index for managing the circular buffer...
		i = (i+1) % W;

		// Fill up the initial window; else, update the existing window...
		if ( N < W ) {
			arr[ i ] = x;
			N += 1;
			sum += x;
		} else {
			tmp = arr[ i ];
			arr[ i ] = x;
			sum += x - tmp;
		}
		return sum;
	};
} // end FUNCTION incrmsum()


// EXPORTS //

module.exports = incrmsum;

},{"validate.io-integer":77}],77:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],78:[function(require,module,exports){
/**
*
*	COMPUTE: incrmvariance
*
*
*	DESCRIPTION:
*		- Provides a method to compute a moving sample variance incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// INCREMENTAL MOVING SAMPLE VARIANCE //

/**
* FUNCTION: incrmvariance( W )
*	Returns a method to compute a moving sample variance incrementally.
*
* @param {Number} W - window size
* @returns {Function} method to compute a moving sample variance incrementally
*/
function incrmvariance( W ) {
	if ( !isInteger( W ) || W < 1 ) {
		throw new TypeError( 'incrmvariance()::invalid input argument. Window size must be a positive integer.' );
	}
	var arr = new Array( W ),
		n = W - 1,
		M2 = 0,
		mu = 0,
		N = 0,
		i = -1,
		delta,
		tmp,
		d1,
		d2;
	/**
	* FUNCTION: incrmvariance( [value] )
	*	If a `value` is provided, updates and returns the updated sample variance. If no `value` is provided, returns the current sample variance.
	*
	* @param {Number} [value] - value used to update the moving sample variance
	* @returns {Number} sample variance
	*/
	return function incrmvariance( x ) {
		if ( !arguments.length ) {
			if ( N === 0 ) {
				return null;
			}
			if ( N === 1 ) {
				return 0;
			}
			if ( N < W ) {
				return M2 / (N-1);
			}
			return M2 / n;
		}
		// Update the index for managing the circular buffer...
		i = (i+1) % W;

		// Fill up the initial window; else, update the existing window...
		if ( N < W ) {
			arr[ i ] = x;
			N += 1;
			delta = x - mu;
			mu += delta / N;
			M2 += delta * (x - mu);
			if ( N === 1 ) {
				return 0;
			}
			return M2 / (N-1);
		}
		if ( N === 1 ) {
			return 0;
		}
		tmp = arr[ i ];
		arr[ i ] = x;
		delta = x - tmp;
		d1 = tmp - mu;
		mu += delta / W;
		d2 = x - mu;
		M2 += delta * (d1 + d2);

		return M2 / n;
	};
} // end FUNCTION incrmvariance()


// EXPORTS //

module.exports = incrmvariance;

},{"validate.io-integer":79}],79:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],80:[function(require,module,exports){
/**
*
*	COMPUTE: incrspace
*
*
*	DESCRIPTION:
*		- Generates a linearly spaced numeric array using a provided increment.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// INCRSPACE //

/**
* FUNCTION: incrspace( start, stop[, increment] )
*	Generates a linearly spaced numeric array using a provided increment.
*
* @param {Number} start - first array value
* @param {Number} stop - array element bound
* @param {Number} [increment] - increment
* @returns {Array} linearly spaced numeric array
*/
function incrspace( x1, x2, inc ) {
	var arr, len, i;
	if ( typeof x1 !== 'number' || x1 !== x1 ) {
		throw new TypeError( 'incrspace()::invalid input argument. Start must be numeric.' );
	}
	if ( typeof x2 !== 'number' || x2 !== x2 ) {
		throw new TypeError( 'incrspace()::invalid input argument. Stop must be numeric.' );
	}
	if ( arguments.length < 3 ) {
		inc = 1;
	} else {
		if ( typeof inc !== 'number' || inc !== inc ) {
			throw new TypeError( 'incrspace()::invalid input argument. Increment must be numeric.' );
		}
	}
	// Calculate the array length:
	len = Math.ceil( ( x2-x1 ) / inc );
	if ( len < 0 ) {
		return [ x1 ];
	}

	// Build the output array...
	if ( len > 64000 ) {
		// Ensure fast elements...
		arr = [];
		arr.push( x1 );
		for ( i = 1; i < len; i++ ) {
			arr.push( x1 + inc*i );
		}
		return arr;
	}
	arr = new Array( len );
	arr[ 0 ] = x1;
	for ( i = 1; i < len; i++ ) {
		arr[ i ] = x1 + inc*i;
	}
	return arr;
} // end FUNCTION incrspace()


// EXPORTS //

module.exports = incrspace;

},{}],81:[function(require,module,exports){
/**
*
*	COMPUTE: incrstdev
*
*
*	DESCRIPTION:
*		- Provides a method to compute a sample standard deviation incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// INCREMENTAL //

	/**
	* FUNCTION: incrstdev()
	*	Returns a method to compute the sample standard deviation incrementally.
	*
	* @returns {Function} method to compute the sample standard deviation incrementally
	*/
	function incrstdev() {
		var mu = 0,
			N = 0,
			M2 = 0,
			delta;
		/**
		* FUNCTION: incrstdev( [value] )
		*	If a `value` is provided, updates and returns the updated sample standard deviation. If no `value` is provided, returns the current sample standard deviation.
		*
		* @param {Number} [value] - value used to update the sample standard deviation
		* @returns {Number} sample standard deviation
		*/
		return function incrstdev( x ) {
			if ( !arguments.length ) {
				if ( N < 2 ) {
					return 0;
				}
				return Math.sqrt( M2 / (N-1) );
			}
			N += 1;
			delta = x - mu;
			mu += delta / N;
			M2 += delta * ( x - mu );
			if ( N < 2 ) {
				return 0;
			}
			return Math.sqrt( M2 / (N-1) );
		};
	} // end FUNCTION incrstdev()


	// EXPORTS //

	module.exports = incrstdev;

})();
},{}],82:[function(require,module,exports){
/**
*
*	COMPUTE: incrsum
*
*
*	DESCRIPTION:
*		- Provides a method to compute a sum incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// INCREMENTAL SUM //

	/**
	* FUNCTION: incrsum()
	*	Returns a method to compute the sum incrementally.
	*
	* @returns {Function} method to compute the sum incrementally
	*/
	function incrsum() {
		var sum = 0;
		/**
		* FUNCTION: incrsum( [value] )
		*	If a `value` is provided, updates and returns the updated sum. If no `value` is provided, returns the current sum.
		*
		* @param {Number} [value] - value used to update the sum
		* @returns {Number} sum
		*/
		return function incrsum( x ) {
			if ( !arguments.length ) {
				return sum;
			}
			sum += x;
			return sum;
		};
	} // end FUNCTION incrsum()


	// EXPORTS //

	module.exports = incrsum;

})();
},{}],83:[function(require,module,exports){
/**
*
*	COMPUTE: incrvariance
*
*
*	DESCRIPTION:
*		- Provides a method to compute a sample variance incrementally.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// INCREMENTAL SAMPLE VARIANCE //

	/**
	* FUNCTION: incrvariance()
	*	Returns a method to compute the sample variance incrementally.
	*
	* @returns {Function} method to compute the sample variance incrementally
	*/
	function incrvariance() {
		var mu = 0,
			N = 0,
			M2 = 0,
			delta;
		/**
		* FUNCTION: incrvariance( [value] )
		*	If a `value` is provided, updates and returns the updated sample variance. If no `value` is provided, returns the current sample variance.
		*
		* @param {Number} [value] - value used to update the sample variance
		* @returns {Number} sample variance
		*/
		return function incrvariance( x ) {
			if ( !arguments.length ) {
				if ( N < 2 ) {
					return 0;
				}
				return M2 / (N-1);
			}
			N += 1;
			delta = x - mu;
			mu += delta / N;
			M2 += delta * ( x - mu );
			if ( N < 2 ) {
				return 0;
			}
			return M2 / (N-1);
		};
	} // end FUNCTION incrvariance()


	// EXPORTS //

	module.exports = incrvariance;

})();
},{}],84:[function(require,module,exports){
/**
*
*	COMPUTE: iqr
*
*
*	DESCRIPTION:
*		- Computes the interquartile range for an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	quantile = require( 'compute-quantile' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// INTERQUARTILE RANGE //

/**
* FUNCTION: iqr( arr )
*	Computes the interquartile range for an array.
*
* @param {Array} arr - array of values
* @returns {Number} interquartile range
*/
function iqr( arr, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'iqr()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'iqr()::invalid input argument. Options should be an object.' );
		}
	} else {
		opts = {
			'sorted': false
		};
	}
	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
		opts.sorted = true;
	}
	return quantile( arr, 0.75, opts ) - quantile( arr, 0.25, opts );
} // end FUNCTION iqr()


// EXPORTS //

module.exports = iqr;

},{"compute-quantile":163,"validate.io-object":85}],85:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":86}],86:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],87:[function(require,module,exports){
/**
*
*	COMPUTE: isfinite
*
*
*	DESCRIPTION:
*		- Computes for each array element whether an element is a finite number.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// VARIABLES //

var pinf = Number.POSITIVE_INFINITY,
	ninf = Number.NEGATIVE_INFINITY;


// ISFINITE //

/**
* FUNCTION: isfinite( arr )
*	Computes for each array element whether an element is a finite number.
*
* @param {Array} arr - input array
* @param {Array} array of 1s and 0s indicating if an element is a finite number
*/
function isfinite( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'isfinite()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		out = new Array( len ),
		val;

	for ( var i = 0; i < len; i++ ) {
		out[ i ] = 0;
		val = arr[ i ];
		if ( typeof val === 'number' && val === val && val < pinf && val > ninf ) {
			out[ i ] = 1;
		}
	}
	return out;
} // end FUNCTION isfinite()


// EXPORTS //

module.exports = isfinite;

},{}],88:[function(require,module,exports){
/**
*
*	COMPUTE: isinf
*
*
*	DESCRIPTION:
*		- Computes for each array element whether an element is infinite.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// VARIABLES //

var pinf = Number.POSITIVE_INFINITY,
	ninf = Number.NEGATIVE_INFINITY;


// ISINF //

/**
* FUNCTION: isinf( arr )
*	Computes for each array element whether an element is infinite.
*
* @param {Array} arr - input array
* @param {Array} array of 1s and 0s indicating if an element is infinite
*/
function isinf( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'isinf()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		out = new Array( len ),
		val;

	for ( var i = 0; i < len; i++ ) {
		out[ i ] = 0;
		val = arr[ i ];
		if ( val === pinf || val === ninf ) {
			out[ i ] = 1;
		}
	}
	return out;
} // end FUNCTION isinf()


// EXPORTS //

module.exports = isinf;

},{}],89:[function(require,module,exports){
/**
*
*	COMPUTE: isinteger
*
*
*	DESCRIPTION:
*		- Computes for each array element whether an element is an integer.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ISINTEGER //

/**
* FUNCTION: isinteger( arr )
*	Computes for each array element whether an element is an integer.
*
* @param {Array} arr - input array
* @param {Array} array of 1s and 0s indicating if an element is an integer
*/
function isinteger( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'isinteger()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		out = new Array( len ),
		val;

	for ( var i = 0; i < len; i++ ) {
		out[ i ] = 0;
		val = arr[ i ];
		if ( typeof val === 'number' && val === val && val%1 === 0 ) {
			out[ i ] = 1;
		}
	}
	return out;
} // end FUNCTION isinteger()


// EXPORTS //

module.exports = isinteger;

},{}],90:[function(require,module,exports){
/**
*
*	COMPUTE: isnan
*
*
*	DESCRIPTION:
*		- Computes for each array element whether an element is NaN.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ISNAN //

/**
* FUNCTION: isnan( arr )
*	Computes for each array element whether an element is NaN.
*
* @param {Array} arr - input array
* @param {Array} array of 1s and 0s indicating if an element is NaN
*/
function isnan( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'isnan()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		out = new Array( len ),
		val;

	for ( var i = 0; i < len; i++ ) {
		out[ i ] = 0;
		val = arr[ i ];
		if ( typeof val !== 'number' || val !== val ) {
			out[ i ] = 1;
		}
	}
	return out;
} // end FUNCTION isnan()


// EXPORTS //

module.exports = isnan;

},{}],91:[function(require,module,exports){
/**
*
*	COMPUTE: isnumeric
*
*
*	DESCRIPTION:
*		- Computes for each array element whether an element is numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ISNUMERIC //

/**
* FUNCTION: isnumeric( arr )
*	Computes for each array element whether an element is numeric.
*
* @param {Array} arr - input array
* @param {Array} array of 1s and 0s indicating if an element is numeric
*/
function isnumeric( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'isnumeric()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		out = new Array( len ),
		val;

	for ( var i = 0; i < len; i++ ) {
		out[ i ] = 0;
		val = arr[ i ];
		if ( typeof val === 'number' && val === val ) {
			out[ i ] = 1;
		}
	}
	return out;
} // end FUNCTION isnumeric()


// EXPORTS //

module.exports = isnumeric;

},{}],92:[function(require,module,exports){
/**
*
*	COMPUTE: issorted
*
*
*	DESCRIPTION:
*		- Returns a boolean indicating if an input array is sorted.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// ISSORTED //

/**
* FUNCTION: issorted( arr[, comparator] )
*	Returns a boolean indicating if an input array is sorted.
*
* @param {Array} arr - input array
* @param {Function} [comparator] - comparator function invoked for each pair of consecutive elements which returns a numeric value indicating if elements are ordered
* @returns {Boolean} boolean indicating if array is sorted
*/
function issorted( arr, clbk ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'issorted()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'issorted()::invalid input argument. Comparator must be a function.' );
		}
	}
	var len = arr.length,
		i;
	if ( !clbk ) {
		// Default: ascending order...
		for ( i = 0; i < len-1; i++ ) {
			if ( arr[ i ] > arr[ i+1 ] ) {
				return false;
			}
		}
		return true;
	}
	// Impose arbitrary sort order...
	for ( i = 0; i < len-1; i++ ) {
		if ( clbk( arr[i], arr[i+1] ) > 0 ) {
			return false;
		}
	}
	return true;
} // end FUNCTION issorted()


// EXPORTS //

module.exports = issorted;

},{}],93:[function(require,module,exports){
/**
*
*	COMPUTE: kurtosis
*
*
*	DESCRIPTION:
*		- Computes the sample excess kurtosis of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: kurtosis( arr )
	*	Computes the sample excess kurtosis of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample excess kurtosis
	*/
	function kurtosis( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'kurtosis()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			delta = 0,
			delta_n = 0,
			delta_n2 = 0,
			term1 = 0,
			N = 0,
			mean = 0,
			M2 = 0,
			M3 = 0,
			M4 = 0,
			g;

		for ( var i = 0; i < len; i++ ) {
			N += 1;

			delta = arr[ i ] - mean;
			delta_n = delta / N;
			delta_n2 = delta_n * delta_n;

			term1 = delta * delta_n * (N-1);

			M4 += term1*delta_n2*(N*N - 3*N + 3) + 6*delta_n2*M2 - 4*delta_n*M3;
			M3 += term1*delta_n*(N-2) - 3*delta_n*M2;
			M2 += term1;
			mean += delta_n;
		}
		// Calculate the population excess kurtosis:
		g = N*M4 / ( M2*M2 ) - 3;
		// Return the corrected sample excess kurtosis:
		return (N-1) / ( (N-2)*(N-3) ) * ( (N+1)*g + 6 );
	} // end FUNCTION kurtosis()


	// EXPORTS //

	module.exports = kurtosis;

})();
},{}],94:[function(require,module,exports){
/**
*
*	COMPUTE: l1norm
*
*
*	DESCRIPTION:
*		- Computes the L1 norm (Manhattan norm) of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// L1NORM //

	/**
	* FUNCTION: l1norm( arr )
	*	Calculates the L1 norm (Manhattan/Taxicab norm) of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} L1 norm
	*/
	function l1norm( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'l1norm()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			sum = 0,
			val;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			// Math.abs( val )
			if ( val < 0 ) {
				val = -val;
			}
			sum += val;
		}
		return sum;
	} // end FUNCTION l1norm()


	// EXPORTS //

	module.exports = l1norm;

})();
},{}],95:[function(require,module,exports){
/**
*
*	COMPUTE: l2norm
*
*
*	DESCRIPTION:
*		- Computes the L2 norm (Euclidean norm) of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// L2NORM //

	/**
	* FUNCTION: l2norm( arr )
	*	Calculates the L2 norm (Euclidean norm) of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} L2 norm
	*/
	function l2norm( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'l2norm()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			t = 0,
			s = 1,
			r,
			val,
			abs;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			abs = val;
			if ( abs < 0 ) {
				abs = -abs;
			}
			if ( abs > 0 ) {
				if ( abs > t ) {
					r = t / val;
					s = 1 + s*r*r;
					t = abs;
				} else {
					r = val / t;
					s = s + r*r;
				}
			}
		}
		return t * Math.sqrt( s );
	} // end FUNCTION l2norm()


	// EXPORTS //

	module.exports = l2norm;

})();
},{}],96:[function(require,module,exports){
/**
*
*	COMPUTE: lcm
*
*
*	DESCRIPTION:
*		- Computes the least common multiple (lcm).
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// FUNCTIONS //

/**
* FUNCTION: gcd( a, b )
*	Computes the greatest common divisor of two integers `a` and `b`.
*
* @param {Number} a
* @param {Number} b
* @returns {Number} greatest common divisor
*/
function gcd( a, b ) {
	if ( !isInteger( a ) || !isInteger( b ) ) {
		throw new TypeError( 'lcm()::invalid input argument. Must provide integers.' );
	}
	// [0] Simple cases...
	if ( a === b ) {
		return a;
	}
	// [1] Look for factors of 2...
	if ( a % 2 === 0 ) { // is even
		if ( b % 2 === 1 ) { // is odd
			return gcd( a/2, b );
		}
		// both even...
		return 2 * gcd( a/2, b/2 );
	}
	if ( b % 2 === 0 ) {
		return gcd( a, b/2 );
	}
	// [2] Reduce larger argument...
	if ( a > b ) {
		return gcd( (a-b)/2, b );
	}
	return gcd( (b-a)/2, a );
} // end FUNCTION gcd()


// LEAST COMMON MULTIPLE //

/**
* FUNCTION: lcm( arr )
*	Computes the least common multiple (lcm).
*
* @param {Array} arr - array of integers
* @returns {Number|null} least common multiple or null
*/
function lcm( arr ) {
	var len, a, b, c;
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'lcm()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !len ) {
		return null;
	}
	// Exploit the fact that the lcm is an associative function...
	a = arr[ 0 ];
	for ( var i = 1; i < len; i++ ) {
		b = arr[ i ];
		if ( a === 0 || b === 0 ) {
			return 0;
		}
		if ( a < 0 ) {
			a = -a;
		}
		if ( b < 0 ) {
			b = -b;
		}
		c = gcd( a, b );
		a = ( a/c ) * b;
	}
	return a;
} // end FUNCTION lcm()


// EXPORTS //

module.exports = lcm;

},{"validate.io-integer":97}],97:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],98:[function(require,module,exports){
/**
*
*	COMPUTE: leq
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (less than or equal to) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// LESS THAN OR EQUAL TO //

/**
* FUNCTION: leq( arr, x )
*	Computes an element-wise comparison (less than or equal to) of an array.
*
* @param {Array} arr - input array
* @param {Array|Number|String} x - comparator
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is less than or equal to a compared value and `0` indicates that an input array element is not less than or equal to a compared value
*/
function leq( arr, x ) {
	var isArray = Array.isArray( x ),
		type = typeof x,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'leq()::invalid input argument. Must provide an array.' );
	}
	if ( !isArray && ( type !== 'number' || x !== x ) && type !== 'string' ) {
		throw new TypeError( 'leq()::invalid input argument. Comparison input must either be an array, number, or string.' );
	}
	len = arr.length;
	out = new Array( len );
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'leq()::invalid input argument. Comparison array must have a length equal to that of the input array.' );
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] <= x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] <= x ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION leq()


// EXPORTS //

module.exports = leq;


},{}],99:[function(require,module,exports){
/**
*
*	COMPUTE: linfnorm
*
*
*	DESCRIPTION:
*		- Computes the infinity norm (Chebyshev/supremum norm) of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// LPNORM //

	/**
	* FUNCTION: linfnorm( arr )
	*	Calculates the infinity norm of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} infinity norm
	*/
	function linfnorm( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'linfnorm()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			val = arr[ 0 ],
			max;

		if ( val < 0 ) {
			val = -val;
		}
		max = val;
		for ( var i = 1; i < len; i++ ) {
			val = arr[ i ];
			if ( val < 0 ) {
				val = -val;
			}
			if ( val > max ) {
				max = val;
			}
		}
		return max;
	} // end FUNCTION linfnorm()


	// EXPORTS //

	module.exports = linfnorm;

})();
},{}],100:[function(require,module,exports){
/**
*
*	COMPUTE: linspace
*
*
*	DESCRIPTION:
*		- Generates a linearly spaced numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// LINSPACE //

/**
* FUNCTION: linspace( start, stop[, length] )
*	Generates a linearly spaced numeric array.
*
* @param {Number} start - first array value
* @param {Number} stop - last array value
* @param {Number} [length] - length of output array
* @returns {Array} linearly spaced numeric array
*/
function linspace( x1, x2, len ) {
	var arr,
		end,
		tmp,
		d;

	if ( typeof x1 !== 'number' || x1 !== x1 ) {
		throw new TypeError( 'linspace()::invalid input argument. Start must be numeric.' );
	}
	if ( typeof x2 !== 'number' || x2 !== x2 ) {
		throw new TypeError( 'linspace()::invalid input argument. Stop must be numeric.' );
	}
	if ( arguments.length < 3 ) {
		len = 100;
	} else {
		if ( !isInteger( len ) || len < 0 ) {
			throw new TypeError( 'linspace()::invalid input argument. Length must be a positive integer.' );
		}
		if ( len === 0 ) {
			return [];
		}
	}
	// Calculate the increment:
	end = len - 1;
	d = ( x2-x1 ) / end;

	// Build the output array...
	arr = new Array( len );
	tmp = x1;
	arr[ 0 ] = tmp;
	for ( var i = 1; i < end; i++ ) {
		tmp += d;
		arr[ i ] = tmp;
	}
	arr[ end ] = x2;
	return arr;
} // end FUNCTION linspace()


// EXPORTS //

module.exports = linspace;

},{"validate.io-integer":101}],101:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],102:[function(require,module,exports){
/**
*
*	COMPUTE: lmidmean
*
*
*	DESCRIPTION:
*		- Computes the interquartile mean of the values below the median for a numeric array (lower midmean).
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// LOWER MIDMEAN //

/**
* FUNCTION: lmidmean( arr[, sorted] )
*	Computes the interquartile mean of the values below the median in a numeric array (lower midmean).
*
* @param {Array} arr - numeric array
* @param {Boolean} [sorted] - boolean flag indicating if the input array is sorted in ascending order
* @returns {Number} lower midmean
*/
function lmidmean( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'lmidmean()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean' ) {
		throw new TypeError( 'lmidmean()::invalid input argument. Second argument must be a boolean.' );
	}
	if ( arr.length < 6 ) {
		throw new Error( 'lmidmean()::invalid input argument. Input array must have 6 or more elements.' );
	}
	if ( !sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}
	var len = arr.length,
		mean = 0,
		N = 0,
		delta,
		low,
		high;

	// Quartiles sit between values
	if ( len%8 === 0 ) {
		low = len*0.125;
		high = len*0.375 - 1;
	}
	else {
		low = Math.ceil( len*0.125 );
		high = Math.floor( len*0.375 ) - 1;
	}

	// Compute an arithmetic mean...
	for ( var i = low; i <= high; i++ ) {
		N += 1;
		delta = arr[ i ] - mean;
		mean += delta / N;
	}

	return mean;
} // end FUNCTION lmidmean()


// EXPORTS //

module.exports = lmidmean;

},{}],103:[function(require,module,exports){
/**
*
*	COMPUTE: logspace
*
*
*	DESCRIPTION:
*		- Generates a logarithmically spaced numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// LOGSPACE //

/**
* FUNCTION: logspace( a, b[, length] )
*	Generates a logarithmically spaced numeric array.
*
* @param {Number} a - exponent of start value
* @param {Number} b - exponent of end value
* @param {Number} [length] - length of output array (default: 10)
* @returns {Array} logarithmically spaced numeric array
*/
function logspace( a, b, len ) {
	var arr,
		end,
		tmp,
		d;

	if ( typeof a !== 'number' || a !== a ) {
		throw new TypeError( 'logspace()::invalid input argument. Exponent of start value must be numeric.' );
	}
	if ( typeof b !== 'number' || b !== b ) {
		throw new TypeError( 'logspace()::invalid input argument. Exponent of stop value must be numeric.' );
	}
	if ( arguments.length < 3 ) {
		len = 10;
	} else {
		if ( !isInteger( len ) || len < 0 ) {
			throw new TypeError( 'logspace()::invalid input argument. Length must be a positive integer.' );
		}
		if ( len === 0 ) {
			return [];
		}
	}
	// Calculate the increment:
	end = len - 1;
	d = ( b-a ) / end;

	// Build the output array...
	arr = new Array( len );
	tmp = a;
	arr[ 0 ] = Math.pow( 10, tmp );
	for ( var i = 1; i < end; i++ ) {
		tmp += d;
		arr[ i ] = Math.pow( 10, tmp );
	}
	arr[ end ] = Math.pow( 10, b );
	return arr;
} // end FUNCTION logspace()


// EXPORTS //

module.exports = logspace;

},{"validate.io-integer":104}],104:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],105:[function(require,module,exports){
/**
*
*	COMPUTE: lpnorm
*
*
*	DESCRIPTION:
*		- Computes the Lp norm of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MODULES //

	var isInteger = require( 'validate.io-integer' ),
		l1norm = require( 'compute-l1norm' ),
		l2norm = require( 'compute-l2norm' ),
		linfnorm = require( 'compute-linfnorm' );


	// LPNORM //

	/**
	* FUNCTION: lpnorm( arr[, p] )
	*	Calculates the LP norm of an array of values.
	*
	* @param {Array} arr - array of values
	* @param {Number} [p] - norm
	* @returns {Number} LP norm
	*/
	function lpnorm( arr, p ) {
		var inf = Number.POSITIVE_INFINITY;
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'lpnorm()::invalid input argument. First argument must be an array.' );
		}
		if ( arguments.length === 1 ) {
			p = 2;
		} else if ( (!isInteger( p ) && p !== inf ) || p < 1 ) {
			throw new TypeError( 'lpnorm()::invalid input argument. Second argument should be a positive integer greater than 0.' );
		}
		if ( p === 1 ) {
			return l1norm( arr );
		}
		else if ( p === 2 ) {
			return l2norm( arr );
		}
		else if ( p === inf ) {
			return linfnorm( arr );
		}
		var len = arr.length,
			sum = 0,
			val;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( val < 0 ) {
				val = -val;
			}
			sum += Math.pow( val, p );
		}
		return Math.pow( sum, 1/p );
	} // end FUNCTION lpnorm()


	// EXPORTS //

	module.exports = lpnorm;

})();
},{"compute-l1norm":94,"compute-l2norm":95,"compute-linfnorm":99,"validate.io-integer":106}],106:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],107:[function(require,module,exports){
/**
*
*	COMPUTE: lt
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (less than) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// LESS THAN //

/**
* FUNCTION: lt( arr, x )
*	Computes an element-wise comparison (less than) of an array.
*
* @param {Array} arr - input array
* @param {Array|Number|String} x - comparator
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is less than a compared value and `0` indicates that an input array element is not less than a compared value
*/
function lt( arr, x ) {
	var isArray = Array.isArray( x ),
		type = typeof x,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'lt()::invalid input argument. Must provide an array.' );
	}
	if ( !isArray && ( type !== 'number' || x !== x ) && type !== 'string' ) {
		throw new TypeError( 'lt()::invalid input argument. Comparison input must either be an array, number, or string.' );
	}
	len = arr.length;
	out = new Array( len );
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'lt()::invalid input argument. Comparison array must have a length equal to that of the input array.' );
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] < x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] < x ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION lt()


// EXPORTS //

module.exports = lt;

},{}],108:[function(require,module,exports){
/**
*
*	COMPUTE: max
*
*
*	DESCRIPTION:
*		- Computes the maximum value of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: max( arr )
*	Computes the maximum value of a numeric array.
*
* @param {Array} arr - array of values
* @returns {Number} max value
*/
function max( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'max()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		val = arr[ 0 ];

	for ( var i = 1; i < len; i++ ) {
		if ( arr[ i ] > val ) {
			val = arr[ i ];
		}
	}
	return val;
} // end FUNCTION max()


// EXPORTS //

module.exports = max;

},{}],109:[function(require,module,exports){
/**
*
*	COMPUTE: mean
*
*
*	DESCRIPTION:
*		- Computes the arithmetic mean over an array of values.
*
*
*	NOTES:
*		[1] Based on Welford's method. http://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Incremental_algorithm
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MEAN //

	/**
	* FUNCTION: mean( arr )
	*	Computes the arithmetic mean over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} mean value
	*/
	function mean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mu = 0,
			diff = 0;

		for ( var i = 0; i < len; i++ ) {
			N += 1;
			diff = arr[ i ] - mu;
			mu += diff / N;
		}
		return mu;
	} // end FUNCTION mean()


	// EXPORTS //

	module.exports = mean;

})();
},{}],110:[function(require,module,exports){
/**
*
*	COMPUTE: median
*
*
*	DESCRIPTION:
*		- Computes the median of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MEDIAN //

/**
* FUNCTION: median( arr[, sorted] )
*	Computes the median of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Boolean} [sorted] - boolean flag indicating if the array is sorted in ascending order
* @returns {Number} median value
*/
function median( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'median()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean' ) {
		throw new TypeError( 'median()::invalid input argument. Second argument must be a boolean.' );
	}
	var len = arr.length,
		id;

	if ( !sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}

	// Get the middle index:
	id = Math.floor( len / 2 );

	if ( len % 2 ) {
		// The number of elements is not evenly divisible by two, hence we have a middle index:
		return arr[ id ];
	}
	// Even number of elements, so must take the mean of the two middle values:
	return ( arr[ id-1 ] + arr[ id ] ) / 2.0;
} // end FUNCTION median()


// EXPORTS //

module.exports = median;

},{}],111:[function(require,module,exports){
/**
*
*	COMPUTE: midhinge
*
*
*	DESCRIPTION:
*		- Computes the midhinge of a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	quantile = require( 'compute-quantile' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MIDHINGE //

/**
* FUNCTION: midhinge( arr[, opts] )
*	Computes the midhinge of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Object} [opts] - quantile options
* @returns {Number} midhinge
*/
function midhinge( arr, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'midhinge()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'midhinge()::invalid input argument. Options should be an object.' );
		}
	} else {
		opts = {
			'sorted': false
		};
	}
	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
		opts.sorted = true;
	}
	return ( quantile( arr, 0.25, opts ) + quantile( arr, 0.75, opts ) ) / 2.0;
} // end FUNCTION midhinge()


// EXPORTS //

module.exports = midhinge;

},{"compute-quantile":163,"validate.io-object":112}],112:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":113}],113:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],114:[function(require,module,exports){
/**
*
*	COMPUTE: midmean
*
*
*	DESCRIPTION:
*		- Computes the interquartile mean (midmean) of a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MIDMEAN //

/**
* FUNCTION: midmean( arr[, sorted] )
*	Computes the interquartile mean (midmean) of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Boolean} [sorted] - boolean flag indicating if the input array is sorted in ascending order
* @returns {Number} midmean
*/
function midmean( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'midmean()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean' ) {
		throw new TypeError( 'midmean()::invalid input argument. Second argument must be a boolean.' );
	}
	if ( arr.length < 3 ) {
		throw new TypeError( 'midmean()::invalid input argument. Midmean not applicable.' );
	}
	if ( !sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}
	var len = arr.length,
		mean = 0,
		N = 0,
		delta,
		low,
		high;

	// Quartiles sit between values...
	if ( len%4 === 0 ) {
		low = len*0.25;
		high = len*0.75 - 1;
	}
	else {
		low = Math.ceil( len*0.25 );
		high = Math.floor( len*0.75 ) - 1;
	}

	// Compute an arithmetic mean...
	for ( var i = low; i <= high; i++ ) {
		N += 1;
		delta = arr[ i ] - mean;
		mean += delta / N;
	}
	return mean;
} // end FUNCTION midmean()


// EXPORTS //

module.exports = midmean;

},{}],115:[function(require,module,exports){
/**
*
*	COMPUTE: midrange
*
*
*	DESCRIPTION:
*		- Computes the midrange of a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MIDRANGE //

/**
* FUNCTION: midrange( arr[, sorted] )
*	Computes the midrange of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Boolean} [sorted] - boolean flag indicating if the input array is already sorted in ascending order
* @returns {Number} midrange
*/
function midrange( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'midrange()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean') {
		throw new TypeError( 'midrange()::invalid input argument. Sorted flag should be a boolean.' );
	}
	var len = arr.length,
		val,
		min,
		max;

	if ( sorted ) {
		min = arr[ 0 ];
		max = arr[ len - 1 ];
	} else {
		// Find min and max values in the range...
		min = arr[ 0 ];
		max = arr[ 0 ];
		for ( var i = 1; i < len; i++) {
			val = arr[ i ];
			if ( val > max ) {
				max = val;
			}
			else if ( val < min ) {
				min = val;
			}
		}
	}
	return ( min + max ) / 2.0;
} // end FUNCTION midrange()


// EXPORTS //

module.exports = midrange;


},{}],116:[function(require,module,exports){
/**
*
*	COMPUTE: midsummary
*
*
*	DESCRIPTION:
*		- Computes a trimmed midrange of a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	quantile = require( 'compute-quantile' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MIDSUMMARY //

/**
* FUNCTION: midsummary( arr, n[, opts] )
*	Computes the midsummary of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Number} n - % value between 0 and 0.50 by which to trim the data set
* @param {Object} [opts] - quantile options
* @returns {Number} midsummary
*/
function midsummary( arr, n, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'midsummary()::invalid input argument. Must provide an array.' );
	}
	if ( typeof n !== 'number' || n !== n ) {
		throw new TypeError( 'midsummary()::invalid input argument. Percentage must be numeric.' );
	}
	if ( n < 0.0 || n > 0.50 ) {
		throw new TypeError( 'midsummary()::invalid input argument. Must provide a percentage between 0 and 0.5 inclusive.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'midsummary()::invalid input argument. Options should be an object.' );
		}
	} else {
		opts = {
			'sorted': false
		};
	}
	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
		opts.sorted = true;
	}
	var len = arr.length,
		el = 0;

	if ( n === 0 ) {
		// special case: midrange
		return ( arr[0] + arr[len-1] ) / 2.0;
	}
	else if ( n === 0.5 ) {
		// special case: median
		el = Math.floor( len / 2.0 );
 		if ( len % 2.0 ) {
 			// Middle index exists
 			return arr[ el ];
 		}
 		else {
 			return ( arr[ el ] + arr[ el-1 ] ) / 2.0;
 		}
	}	
	else {
		return ( quantile( arr, n, opts ) + quantile( arr, 1 - n, opts ) ) / 2.0;
	}
} // end FUNCTION midsummary()


// EXPORTS //

module.exports = midsummary;

},{"compute-quantile":163,"validate.io-object":117}],117:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":118}],118:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],119:[function(require,module,exports){
/**
*
*	COMPUTE: min
*
*
*	DESCRIPTION:
*		- Computes the minimum value of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: min( arr )
*	Computes the minimum value of an array.
*
* @param {Array} arr - array of values
* @returns {Number} min value
*/
function min( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'min()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		val = arr[ 0 ];

	for ( var i = 1; i < len; i++ ) {
		if ( arr[ i ] < val ) {
			val = arr[ i ];
		}
	}
	return val;
} // end FUNCTION min()


// EXPORTS //

module.exports = min;

},{}],120:[function(require,module,exports){
/**
*
*	COMPUTE: mmax
*
*
*	DESCRIPTION:
*		- Computes a moving maximum over a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

(function() {
	'use strict';

    /**
	* FUNCTION: mmax( arr , window )
	*	Computes a moving maximum over a numeric array.
	*
	* @param {Array} arr - array of data values
	* @param {Number} window - size of moving window
	* @returns {Array} array of maximum values
	*/
	function mmax( arr , W ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mmax()::invalid input argument. Must provide an array.' );
		}
		if ( typeof W !== 'number' || W !== W ) {
            throw new TypeError( 'mmax()::invalid input argument. Window must be numeric.' );
        }
        if ( Math.floor( W ) !== W || W < 1 ) {
            throw new TypeError( 'mmax()::invalid input argument. Window must be a positive integer.' );
        }
		if ( W > arr.length ) {
			throw new TypeError( 'mmax()::invalid input argument. Window cannot exceed array length.' );
		}
		var len = arr.length,
			out = new Array( len-W+1 ),
			max = arr[ 0 ],
			val,
			i, j, k, n;

		// Compute the maximum value for the first window...
		for ( i = 1; i < W; i++ ) {
			val = arr[ i ];
			if ( val > max ) {
				max = val;
			}
		}
		out[ 0 ] = max;

		// Compute the remaining window maximums...
		for ( j = W; j < len; j++ ) {
			val = arr[ j ];
			k = j - W;

			// Cases:
			// [1] Incoming value is greater than current maximum. New maximum value.
			// [2] Outgoing value is the current maximum and the new value is less than the maximum. Find a new maximum among the current values.
			// [3] Maximum does not change. Move along.
			
			if ( val > max ) {
				max = val;
			}
			else if ( arr[ k ] === max && val < max ) {
				max = arr[ k+1 ];
				for ( n = k+2; n <= j; n++ ) {
					val = arr[ n ];
					if ( val > max ) {
						max = val;
					}
				}
			}
			out[ k+1 ] = max;
		}
		return out;
	} // end FUNCTION mmax()


	// EXPORTS //

	module.exports = mmax;

})();
},{}],121:[function(require,module,exports){
/**
*
*	COMPUTE: mmean
*
*
*	DESCRIPTION:
*		- Compute a moving mean (sliding window average) over a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MOVING MEAN //

/**
* FUNCTION: mmean( arr , window )
*	Computes a moving mean over a numeric array.
*
* @param {Array} arr - array of data values
* @param {Number} window - size of moving window
* @returns {Array} array of window mean values
*/
function mmean( arr , W ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'mmean()::invalid input argument. Must provide an array.' );
	}
	if ( typeof W !== 'number' || W !== W ) {
        throw new TypeError( 'mmean()::invalid input argument. Window must be numeric.' );
    }
    if ( Math.floor( W ) !== W || W < 1 ) {
        throw new TypeError( 'mmean()::invalid input argument. Window must be a positive integer.' );
    }
	if ( W > arr.length ) {
		throw new TypeError( 'mmean()::invalid input argument. Window cannot exceed the array length.' );
	}
	var len = arr.length,
		out = new Array( len-W+1 ),
		mu = 0,
		delta,
		k;

	// Compute the mean for the first window...
	for ( var i = 0; i < W; i++ ) {
		delta = arr[ i ] - mu;
		mu += delta / (i+1);
	}
	out[ 0 ] = mu;

	// Compute the remaining window means...
	for ( var j = W; j < len; j++ ) {
		k = j - W;
		delta = arr[ j ] - arr[ k ];
		mu +=  delta / W;
		out[ k+1 ] = mu;
	}
	return out;
} // end FUNCTION mmean()


// EXPORTS //

module.exports = mmean;

},{}],122:[function(require,module,exports){
/**
*
*	COMPUTE: mmin
*
*
*	DESCRIPTION:
*		- Computes a moving minimum over a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MOVING MIN //

    /**
	* FUNCTION: mmin( arr , window )
	*	Computes a moving minimum over a numeric array.
	*
	* @param {Array} arr - array of data values
	* @param {Number} window - size of moving window
	* @returns {Array} array of minimum values
	*/
	function mmin( arr , W ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mmin()::invalid input argument. Must provide an array.' );
		}
		if ( typeof W !== 'number' || W !== W ) {
            throw new TypeError( 'mmin()::invalid input argument. Window must be numeric.' );
        }
        if ( Math.floor( W ) !== W || W < 1 ) {
            throw new TypeError( 'mmin()::invalid input argument. Window must be a positive integer.' );
        }
		if ( W > arr.length ) {
			throw new TypeError( 'mmin()::invalid input argument. Window cannot exceed array length.' );
		}
		var len = arr.length,
			out = new Array( len - W + 1 ),
			min = arr[ 0 ],
			val,
			i, j, k, n;

		// Compute the minimum for the first window...
		for ( i = 1; i < W; i++ ) {
			val = arr[ i ];
			if ( val < min ) {
				min = val;
			}
		}
		out[ 0 ] = min;

		// Compute the remaining window minimums..
		for ( j = W; j < len; j++ ) {
			val = arr[ j ];
			k = j - W;
			
			// Cases:
			// [1] Incoming value is less than current minimum. New minimum value.
			// [2] Outgoing value is the current minimum and the new value is greater than the minimum. Find a new minimum among the current values.
			// [3] Minimum does not change. Move along.

			if ( val < min ) {
				min = val;
			}
			else if ( arr[ k ] === min && val > min ) {
				min = arr[ k+1 ];
				for ( n = k+2; n <= j; n++ ) {
					val = arr[ n ];
					if ( val < min ) {
						min = val;
					}
				}
			}
			out[ k+1 ] = min;
		}
		return out;
	} // end FUNCTION mmin()


	// EXPORTS //

	module.exports = mmin;

})();
},{}],123:[function(require,module,exports){
/**
*
*	COMPUTE: mode
*
*
*	DESCRIPTION:
*		- Computes the mode of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: mode( arr )
	*	Computes the mode of an array.
	*
	* @param {Array} arr - array of values
	* @returns {Array} mode
	*/
	function mode( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mode()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			count = {},
			max = 0,
			vals = [],
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( !count[ val ] ) {
				count[ val ] = 0;
			}
			count[ val ] += 1;
			if ( count[ val ] === max ) {
				vals.push( val );
			} else {
				max = count[ val ];
				vals = [ val ];
			}
		}
		return vals.sort( function sort( a, b ) {
			return a - b;
		});
	} // end FUNCTION mode()


	// EXPORTS //

	module.exports = mode;

})();
},{}],124:[function(require,module,exports){
/**
*
*	COMPUTE: mprod
*
*
*	DESCRIPTION:
*		- Computes a moving product over an array.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isPositiveInteger = require( 'validate.io-positive-integer' );


// MOVING PRODUCT //

/**
* FUNCTION: mprod( arr, window[, accessor] )
*	Computes a moving product over an array.
*
* @param {Array} arr - array of values
* @param {Number} window - size of moving window
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Array} array of window products
*/
function mprod( arr, W, clbk ) {
	var len,
		out,
		val,
		p,
		i, j;
	if ( !isArray( arr ) ) {
		throw new TypeError( 'mprod()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	len = arr.length;
	if ( !isPositiveInteger( W ) ) {
		throw new TypeError( 'mprod()::invalid input argument. Window must be a positive integer. Value: `' + W + '`.' );
	}
	if ( W > len ) {
		throw new Error( 'mprod()::invalid input argument. Window cannot exceed the array length.' );
	}
	if ( arguments.length > 2 ) {
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'mprod()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	len = len - W + 1;
	out = new Array( len );

	// NOTE: unlike sum, mean, and other moving calculations, a simple in-place update procedure is hard to come by. Instead, the straightforward solution of two FOR loops is used. While possibly not optimal, this solution requires fewer conditionals and is arguably easier to maintain.
	if ( clbk ) {
		for ( i = 0; i < len; i++ ) {
			p = 1;
			for ( j = i; j < i+W; j++ ) {
				val = clbk( arr[ j ] );
				if ( val === 0 ) {
					p = 0;
					break;
				}
				p *= val;
			}
			out[ i ] = p;
		}
	} else {
		for ( i = 0; i < len; i++ ) {
			p = 1;
			for ( j = i; j < i+W; j++ ) {
				val = arr[ j ];
				if ( val === 0 ) {
					p = 0;
					break;
				}
				p *= val;
			}
			out[ i ] = p;
		}
	}
	return out;
} // end FUNCTION mprod()


// EXPORTS //

module.exports = mprod;

},{"validate.io-array":125,"validate.io-positive-integer":126}],125:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],126:[function(require,module,exports){
/**
*
*	VALIDATE: positive-integer
*
*
*	DESCRIPTION:
*		- Validates if a value is a positive integer.
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

var isInteger = require( 'validate.io-integer' );


// IS POSITIVE INTEGER //

/**
* FUNCTION: isPositiveInteger( value )
*	Validates if a value is a positive integer.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a positive integer
*/
function isPositiveInteger( value ) {
	return isInteger( value ) && value > 0;
} // end FUNCTION isPositiveInteger()


// EXPORTS //

module.exports = isPositiveInteger;

},{"validate.io-integer":127}],127:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],128:[function(require,module,exports){
/**
*
*	COMPUTE: mstdev
*
*
*	DESCRIPTION:
*		- Computes a moving sample standard deviation over a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MOVING SAMPLE STANDARD DEVIATION //

/**
* FUNCTION: mstdev( arr, window )
*	Computes a moving sample standard deviation over a numeric array.
*
* @param {Array} arr - array of data values
* @param {Number} window - size of moving window
* @returns {Array} array of sample standard deviation values
*/
function mstdev( arr, W ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'mstdev()::invalid input argument. Must provide an array.' );
	}
	if ( typeof W !== 'number' || W !== W ) {
        throw new TypeError( 'mstdev()::invalid input argument. Window must be numeric.' );
    }
    if ( (W%1) !== 0 || W < 1 ) {
        throw new TypeError( 'mstdev()::invalid input argument. Window must be a positive integer.' );
    }
	if ( W > arr.length ) {
		throw new TypeError( 'mstdev()::invalid input argument. Window cannot exceed the array length.' );
	}
	var len = arr.length,
		out = new Array( len-W+1 ),
		n = W - 1,
		mu = 0,
		M2 = 0,
		delta,
		x1,
		x2,
		d1,
		d2,
		i, j;

	if ( W === 1 ) {
		for ( i = 0; i < out.length; i++ ) {
			out[ i ] = 0;
		}
		return out;
	}

	// Compute the sample standard deviation for the first window...
	for ( i = 0; i < W; i++ ) {
		x1 = arr[ i ];
		delta = x1 - mu;
		mu += delta / (i+1);
		M2 += delta * (x1 - mu);
	}
	out[ 0 ] = Math.sqrt( M2 / n );

	// Compute the remaining sample standard deviations...
	for ( j = W; j < len; j++ ) {
		i = j - W;
		x1 = arr[ i ];
		x2 = arr[ j ];
		delta = x2 - x1;
		d1 = x1 - mu;
		mu += delta / W;
		d2 = x2 - mu;
		M2 += delta * (d1+d2);
		out[ i+1 ] = Math.sqrt( M2 / n );
	}
	return out;
} // end FUNCTION mstdev()


// EXPORTS //

module.exports = mstdev;

},{}],129:[function(require,module,exports){
/**
*
*	COMPUTE: msum
*
*
*	DESCRIPTION:
*		- Compute a moving sum over a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MOVING SUM //

    /**
	* FUNCTION: msum( arr , window )
	*	Computes a moving sum over an array of values.
	*
	* @param {Array} arr - array of data values
	* @param {Number} window - size of moving window
	* @returns {Array} array of window sum values
	*/
	function msum( arr , W ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'msum()::invalid input argument. Must provide an array.' );
		}
		if ( typeof W !== 'number' || W !== W ) {
            throw new TypeError( 'msum()::invalid input argument. Window must be numeric.' );
        }
        if ( Math.floor( W ) !== W || W < 1 ) {
            throw new TypeError( 'msum()::invalid input argument. Window must be a positive integer.' );
        }
		if ( W > arr.length ) {
			throw new Error( 'msum()::invalid input argument. Window cannot exceed the array length.' );
		}
		var len = arr.length,
			out = new Array( len - W + 1 ),
			sum = 0,
			k;

		// Compute the sum for the first window...
		for ( var i = 0; i < W; i++ ) {
			sum += arr[ i ];
		}
		out[ 0 ] = sum;

		// Compute the sum for the remaining windows...
		for ( var j = W; j < len; j++ ) {
			k = j - W;
			sum += arr[ j ] - arr[ k ];
			out[ k+1 ] = sum;
		}
		return out;
	} // end FUNCTION msum()


	// EXPORTS //

	module.exports = msum;

})();
},{}],130:[function(require,module,exports){
/**
*
*	COMPUTE: multiply
*
*
*	DESCRIPTION:
*		- Computes an element-wise multiplication of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MULTIPLY //

/**
* FUNCTION: multiply( arr, x )
*	Computes an element-wise multiplication of an array.
*
* @param {Array} arr - numeric array
* @param {Array|Number} x - either an array of equal length or a scalar
*/
function multiply( arr, x ) {
	var isArray = Array.isArray( x ),
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'multiply()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'multiply()::invalid input argument. Second argument must be either an array or a scalar.' );
	}
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'multiply()::invalid input argument. Arrays must be of equal length.' );
		}
		for ( i = 0; i < len; i++ ) {
			arr[ i ] *= x[ i ];
		}
		return;
	}
	for ( i = 0; i < len; i++ ) {
		arr[ i ] *= x;
	}
} // end FUNCTION multiply()


// EXPORTS //

module.exports = multiply;

},{}],131:[function(require,module,exports){
/**
*
*	COMPUTE: mvariance
*
*
*	DESCRIPTION:
*		- Computes a moving sample variance over a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MOVING SAMPLE VARIANCE //

/**
* FUNCTION: mvariance( arr , window )
*	Computes a moving sample variance over a numeric array.
*
* @param {Array} arr - array of data values
* @param {Number} window - size of moving window
* @returns {Array} array of sample variance values
*/
function mvariance( arr , W ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'mvariance()::invalid input argument. Must provide an array.' );
	}
	if ( typeof W !== 'number' || W !== W ) {
        throw new TypeError( 'mvariance()::invalid input argument. Window must be numeric.' );
    }
    if ( (W%1) !== 0 || W < 1 ) {
        throw new TypeError( 'mvariance()::invalid input argument. Window must be a positive integer.' );
    }
	if ( W > arr.length ) {
		throw new TypeError( 'mvariance()::invalid input argument. Window cannot exceed the array length.' );
	}
	var len = arr.length,
		out = new Array( len-W+1 ),
		n = W - 1,
		mu = 0,
		M2 = 0,
		delta,
		x1,
		x2,
		d1,
		d2,
		i, j;

	if ( W === 1 ) {
		for ( i = 0; i < out.length; i++ ) {
			out[ i ] = 0;
		}
		return out;
	}

	// Compute the sample variance for the first window...
	for ( i = 0; i < W; i++ ) {
		x1 = arr[ i ];
		delta = x1 - mu;
		mu += delta / (i+1);
		M2 += delta * (x1 - mu);
	}
	out[ 0 ] = M2 / n;

	// Compute the remaining sample variances...
	for ( j = W; j < len; j++ ) {
		i = j - W;
		x1 = arr[ i ];
		x2 = arr[ j ];
		delta = x2 - x1;
		d1 = x1 - mu;
		mu += delta / W;
		d2 = x2 - mu;
		M2 += delta * (d1+d2);
		out[ i+1 ] = M2 / n;
	}
	return out;
} // end FUNCTION mvariance()


// EXPORTS //

module.exports = mvariance;

},{}],132:[function(require,module,exports){
/**
*
*	COMPUTE: nangmean
*
*
*	DESCRIPTION:
*		- Computes the geometric mean of an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANGMEAN //

	/**
	* FUNCTION: nangmean( arr )
	*	Computes the geometric mean over an array of values ignoring non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} gmean value
	*/
	function nangmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'gmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			sum = 0,
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( typeof val !== 'number' || val !== val ) {
				continue;
			}
			if ( val <= 0 ) {
				return NaN;
			}
			N += 1;
			sum += Math.log( val );
		}
		return Math.exp( sum / N );
	} // end FUNCTION nangmean()


	// EXPORTS //

	module.exports = nangmean;

})();
},{}],133:[function(require,module,exports){
/**
*
*	COMPUTE: nanhmean
*
*
*	DESCRIPTION:
*		- Computes the harmonic mean of an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANHMEAN //

	/**
	* FUNCTION: nanhmean( arr )
	*	Computes the harmonic mean over an array of values ignoring non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} harmonic mean
	*/
	function nanhmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'hmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			sum = 0,
			N = 0,
			val;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( typeof val !== 'number' || val !== val ) {
				continue;
			}
			if ( val <= 0 ) {
				return NaN;
			}
			N += 1;
			sum += 1 / val;
		}
		return N / sum;
	} // end FUNCTION nanhmean()


	// EXPORTS //

	module.exports = nanhmean;

})();
},{}],134:[function(require,module,exports){
/**
*
*	COMPUTE: nanmax
*
*
*	DESCRIPTION:
*		- Computes the maximum value of an array ignoring non-numeric values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: nanmax( arr )
*	Computes the maximum value of an array ignoring any non-numeric values.
*
* @param {Array} arr - array of values
* @returns {Number} max value
*/
function nanmax( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'nanmax()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		max = null,
		val;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( typeof val !== 'number' || val !== val ) {
			continue;
		}
		if ( max === null || val > max ) {
			max = val;
		}
	}
	return max;
} // end FUNCTION nanmax()


// EXPORTS //

module.exports = nanmax;

},{}],135:[function(require,module,exports){
/**
*
*	COMPUTE: nanmean
*
*
*	DESCRIPTION:
*		- Computes the arithmetic mean over an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANMEAN //

	/**
	* FUNCTION: nanmean( arr )
	*	Computes the arithmetic mean over an array of values ignoring any non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} mean value
	*/
	function nanmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mu = 0,
			diff = 0,
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( typeof val !== 'number' || val !== val ) {
				continue;
			}
			N += 1;
			diff = val - mu;
			mu += diff / N;
		}
		return mu;
	} // end FUNCTION nanmean()


	// EXPORTS //

	module.exports = nanmean;

})();
},{}],136:[function(require,module,exports){
/**
*
*	COMPUTE: nanmedian
*
*
*	DESCRIPTION:
*		- Computes the median of an array ignoring non-numeric values.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isObject = require( 'validate.io-object' ),
	isBoolean = require( 'validate.io-boolean' ),
	isNumber = require( 'validate.io-number' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MEDIAN //

/**
* FUNCTION: nanmedian( arr[, options] )
*	Computes the median of an array ignoring non-numeric values.
*
* @param {Array} arr - input array
* @param {Object} [options] - function options
* @param {Boolean} [options.sorted] - boolean flag indicating if the array is sorted in ascending order
* @param {Function} [options.accessor] - accessor function for accessing array values
* @returns {Number|null} median value or null
*/
function nanmedian( arr, options ) {
	var sorted,
		clbk,
		len,
		id,
		d,
		x;
	if ( !isArray( arr ) ) {
		throw new TypeError( 'nanmedian()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( options ) ) {
			throw new TypeError( 'nanmedian()::invalid input argument. Options must be an object. Value: `' + options + '`.' );
		}
		if ( options.hasOwnProperty( 'sorted' ) ) {
			sorted = options.sorted;
			if ( !isBoolean( sorted ) ) {
				throw new TypeError( 'nanmedian()::invalid option. Sorted flag must be a boolean. Option: `' + sorted + '`.' );
			}
		}
		if ( options.hasOwnProperty( 'accessor' ) ) {
			clbk = options.accessor;
			if ( typeof clbk !== 'function' ) {
				throw new TypeError( 'nanmedian()::invalid option. Accessor must be a function. Option: `' + clbk + '`.' );
			}
		}
	}
	d = [];
	for ( var i = 0; i < arr.length; i++ ) {
		x = ( clbk ) ? clbk( arr[ i ] ) : arr[ i ];
		if ( isNumber( x ) ) {
			d.push( x );
		}
	}
	len = d.length;
	if ( !len ) {
		return null;
	}
	if ( !sorted ) {
		d.sort( ascending );
	}
	// Get the middle index:
	id = Math.floor( len / 2 );

	if ( len % 2 ) {
		// The number of elements is not evenly divisible by two, hence we have a middle index:
		return d[ id ];
	}
	// Even number of elements, so must take the mean of the two middle values:
	return ( d[ id-1 ] + d[ id ] ) / 2.0;
} // end FUNCTION nanmedian()


// EXPORTS //

module.exports = nanmedian;

},{"validate.io-array":137,"validate.io-boolean":138,"validate.io-number":200,"validate.io-object":139}],137:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],138:[function(require,module,exports){
/**
*
*	VALIDATE: boolean
*
*
*	DESCRIPTION:
*		- Validates if a value is a boolean.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isBoolean( value )
*	Validates if a value is a boolean.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a boolean
*/
function isBoolean( value ) {
	return ( typeof value === 'boolean' || Object.prototype.toString.call( value ) === '[object Boolean]' );
} // end FUNCTION isBoolean()


// EXPORTS //

module.exports = isBoolean;
},{}],139:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":137}],140:[function(require,module,exports){
/**
*
*	COMPUTE: nanmin
*
*
*	DESCRIPTION:
*		- Computes the minimum value of an array ignoring non-numeric values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: nanmin( arr )
*	Computes the minimum value of an array ignoring any non-numeric values.
*
* @param {Array} arr - array of values
* @returns {Number} min value
*/
function nanmin( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'nanmin()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length,
		min = null,
		val;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( typeof val !== 'number' || val !== val ) {
			continue;
		}
		if ( min === null || val < min ) {
			min = val;
		}
	}
	return min;
} // end FUNCTION nanmin()


// EXPORTS //

module.exports = nanmin;

},{}],141:[function(require,module,exports){
/**
*
*	COMPUTE: nanprod
*
*
*	DESCRIPTION:
*		- Computes the product of an array ignoring any non-numeric values.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isNumber = require( 'validate.io-number' );


// NANPROD //

/**
* FUNCTION: nanprod( arr[, accessor] )
*	Computes the product of an array ignoring any non-numeric values.
*
* @param {Array} arr - array of values
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Number|Null} product
*/
function nanprod( arr, clbk ) {
	if ( !isArray( arr ) ) {
		throw new TypeError( 'nanprod()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 ) {
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'nanprod()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	var len = arr.length,
		flg = false,
		p = 1,
		val,
		i;

	if ( !len ) {
		return null;
	}
	if ( clbk ) {
		for ( i = 0; i < len; i++ ) {
			val = clbk( arr[ i ] );
			if ( !isNumber( val ) ) {
				continue;
			} else {
				flg = true;
			}
			if ( val === 0 ) {
				return 0;
			}
			p *= val;
		}
	} else {
		for ( i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( !isNumber( val ) ) {
				continue;
			} else {
				flg = true;
			}
			if ( val === 0 ) {
				return 0;
			}
			p *= val;
		}
	}
	return ( flg ) ? p : NaN;
} // end FUNCTION nanprod()


// EXPORTS //

module.exports = nanprod;

},{"validate.io-array":142,"validate.io-number":200}],142:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],143:[function(require,module,exports){
/**
*
*	COMPUTE: nanqmean
*
*
*	DESCRIPTION:
*		- Computes the quadratic mean (root mean square) of an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANQMEAN //

	/**
	* FUNCTION: nanqmean( arr )
	*	Calculates the quadratic mean (root mean square) ignoring any non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} quadratic mean
	*/
	function nanqmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'nanqmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			t = 0,
			s = 1,
			r,
			val,
			abs;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( typeof val !== 'number' || val !== val ) {
				continue;
			}
			N += 1;
			abs = val;
			if ( abs < 0 ) {
				abs = -abs;
			}
			if ( abs > 0 ) {
				if ( abs > t ) {
					r = t / val;
					s = 1 + s*r*r;
					t = abs;
				} else {
					r = val / t;
					s = s + r*r;
				}
			}
		}
		return t * Math.sqrt( s/N );
	} // end FUNCTION nanqmean()


	// EXPORTS //

	module.exports = nanqmean;

})();
},{}],144:[function(require,module,exports){
/**
*
*	COMPUTE: nanquantiles
*
*
*	DESCRIPTION:
*		-  Computes quantiles for an array ignoring non-numeric values.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isObject = require( 'validate.io-object' ),
	isNonNegativeInteger = require( 'validate.io-nonnegative-integer' ),
	isNumber = require( 'validate.io-number' ),
	isBoolean = require( 'validate.io-boolean' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// NANQUANTILES //

/**
* FUNCTION: nanquantiles( arr, num[, opts] )
*	Computes quantiles for an array ignoring non-numeric values.
*
* @param {Array} arr - array of values
* @param {Number} num - number of quantiles
* @param {Object} [opts] - function options
* @param {Boolean} [opts.sorted=false] - boolean flag indicating if the input array is sorted in ascending order.
* @param {Function} [opts.accessor] - accessor function for accessing array values
* @returns {Array|null} array of quantiles or null
*/
function nanquantiles( arr, num, opts ) {
	var sorted,
		clbk,
		qValues,
		id,
		val,
		len,
		d,
		x,
		i;

	if ( !isArray( arr ) ) {
		throw new TypeError( 'nanquantiles()::invalid input argument. First argument must be an array. Value: `' + arr + '`.' );
	}
	if ( !isNonNegativeInteger( num ) ) {
		throw new TypeError( 'nanquantiles()::invalid input argument. Number of quantiles must be a nonnegative integer. Value: `' + num + '`.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'nanquantiles()::invalid input argument. Options must be an object. Value: `' + opts + '`.' );
		}
		if ( opts.hasOwnProperty( 'sorted' ) ) {
			sorted = opts.sorted;
			if ( !isBoolean( sorted ) ) {
				throw new TypeError( 'nanquantiles()::invalid option. Sorted flag must be a boolean. Option: `' + sorted + '`.' );
			}
		}
		if ( opts.hasOwnProperty( 'accessor' ) ) {
			clbk = opts.accessor;
			if ( typeof clbk !== 'function' ) {
				throw new TypeError( 'nanquantiles()::invalid option. Accessor must be a function. Option: `' + clbk + '`.' );
			}
		}
	}
	d = [];
	for ( i = 0; i < arr.length; i++ ) {
		x = ( clbk ) ? clbk( arr[i] ) : arr[ i ];
		if ( isNumber( x ) ) {
			d.push( x );
		}
	}
	len = d.length;
	if ( !len ) {
		return null;
	}
	if ( !sorted ) {
		d.sort( ascending );
	}
	qValues = new Array( num+1 );

	// 0th quantile is the min:
	qValues[ 0 ] = d[ 0 ];

	// Max defines the quantile upper bound:
	qValues[ num ] = d[ len-1 ];

	// Get the quantiles...
	for ( i = 1; i < num; i++ ) {
		// Calculate the vector index marking the quantile:
		id = ( len * i / num ) - 1;

		// Is the index an integer?
		if ( id%1 === 0 ) {
			// Value is the average between the value at id and id+1:
			val = ( d[ id ] + d[ id+1 ] ) / 2.0;
		} else {
			// Round up to the next index:
			id = Math.ceil( id );
			val = d[ id ];
		}
		qValues[ i ] = val;
	} // end FOR i
	return qValues;
} // end FUNCTION nanquantiles()


// EXPORTS //

module.exports = nanquantiles;

},{"validate.io-array":145,"validate.io-boolean":146,"validate.io-nonnegative-integer":147,"validate.io-number":200,"validate.io-object":149}],145:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],146:[function(require,module,exports){
arguments[4][138][0].apply(exports,arguments)
},{"dup":138}],147:[function(require,module,exports){
/**
*
*	VALIDATE: nonnegative-integer
*
*
*	DESCRIPTION:
*		- Validates if a value is a nonnegative integer.
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

var isInteger = require( 'validate.io-integer' );


// IS NONNEGATIVE INTEGER //

/**
* FUNCTION: isNonNegativeInteger( value )
*	Validates if a value is a nonnegative integer.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a nonnegative integer
*/
function isNonNegativeInteger( value ) {
	return isInteger( value ) && value >= 0;
} // end FUNCTION isNonNegativeInteger()


// EXPORTS //

module.exports = isNonNegativeInteger;

},{"validate.io-integer":148}],148:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],149:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":145}],150:[function(require,module,exports){
/**
*
*	COMPUTE: nanrange
*
*
*	DESCRIPTION:
*		- Computes the arithmetic range of an array ignoring non-numeric values.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),isNumber = require( 'validate.io-number' );


// NANRANGE //

/**
* FUNCTION: nanrange( arr[, accessor] )
*	Computes the arithmetic range of an array ignoring non-numeric values.
*
* @param {Array} arr - input array
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Array|null} arithmetic range or null
*/
function nanrange( arr, clbk ) {
	if ( !isArray( arr ) ) {
		throw new TypeError( 'range()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 && typeof clbk !== 'function' ) {
		throw new TypeError( 'range()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
	}
	var len = arr.length,
		min = null,
		max = min,
		flg = true,
		x;

	for ( var i = 0; i < len; i++ ) {
		x = ( clbk ) ? clbk( arr[i] ) : arr[ i ];
		if ( !isNumber( x ) ) {
			continue;
		}
		if ( flg ) {
			min = x;
			max = x;
			flg = false;
			continue;
		}
		if ( x < min ) {
			min = x;
		} else if ( x > max ) {
			max = x;
		}
	}
	return ( flg ) ? null : [ min, max ];
} // end FUNCTION nanrange()


// EXPORTS //

module.exports = nanrange;

},{"validate.io-array":151,"validate.io-number":200}],151:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],152:[function(require,module,exports){
/**
*
*	COMPUTE: nanstdev
*
*
*	DESCRIPTION:
*		- Computes the sample standard deviation over an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANSTDEV //

	/**
	* FUNCTION: nanstdev( arr )
	*	Computes the sample standard deviation over an array of values ignoring non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample standard deviation
	*/
	function nanstdev( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'nanstdev()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mean = 0,
			M2 = 0,
			delta = 0,
			x;

		for ( var i = 0; i < len; i++ ) {
			x = arr[ i ];
			if ( typeof x !== 'number' || x !== x ) {
				continue;
			}
			N += 1;
			delta = x - mean;
			mean += delta / N;
			M2 += delta * ( x - mean );
		}
		if ( N < 2 ) {
			return 0;
		}
		return Math.sqrt( M2 / ( N-1 ) );
	} // end FUNCTION nanstdev()


	// EXPORTS //

	module.exports = nanstdev;

})();
},{}],153:[function(require,module,exports){
/**
*
*	COMPUTE: nansum
*
*
*	DESCRIPTION:
*		- Computes the sum over an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANSUM //

	/**
	* FUNCTION: nansum( arr )
	*	Computes the sum over an array of values ignoring non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sum
	*/
	function nansum( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'sum()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			s = 0,
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( typeof val !== 'number' || val !== val ) {
				continue;
			}
			s += val;
		}
		return s;
	} // end FUNCTION nansum()


	// EXPORTS //

	module.exports = nansum;

})();
},{}],154:[function(require,module,exports){
/**
*
*	COMPUTE: nanvariance
*
*
*	DESCRIPTION:
*		- Computes the sample variance over an array of values ignoring any values which are not numeric.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// NANVARIANCE //

	/**
	* FUNCTION: nanvariance( arr )
	*	Computes the sample variance over an array of values ignoring non-numeric values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample variance
	*/
	function nanvariance( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'nanvariance()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mean = 0,
			M2 = 0,
			delta = 0,
			x;

		for ( var i = 0; i < len; i++ ) {
			x = arr[ i ];
			if ( typeof x !== 'number' || x !== x ) {
				continue;
			}
			N += 1;
			delta = x - mean;
			mean += delta / N;
			M2 += delta * ( x - mean );
		}
		if ( N < 2 ) {
			return 0;
		}
		return M2 / ( N-1 );
	} // end FUNCTION nanvariance()


	// EXPORTS //

	module.exports = nanvariance;

})();
},{}],155:[function(require,module,exports){
/**
*
*	COMPUTE: neq
*
*
*	DESCRIPTION:
*		- Computes an element-wise comparison (not equal) of an array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' );


// NOT EQUAL //

/**
* FUNCTION: neq( arr, x[, opts] )
*	Computes an element-wise comparison (not equal) of an array.
*
* @param {Array} arr - input array
* @param {*} x - comparator
* @param {Object} [opts] - function options
* @param {Boolean} [opts.strict] - option indicating whether to enforce type equality (default: true)
* @param {Boolean} [opts.array] - option indicating whether to not perform element-by-element comparison when provided arrays of equal length (default: false)
* @returns {Array} array of 1s and 0s, where a `1` indicates that an input array element is not equal to a compared value and `0` indicates that an input array element is equal to a compared value
*/
function neq( arr, x, opts ) {
	var isArray = Array.isArray( x ),
		strict = true,
		arrCompare = false,
		out,
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'neq()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'neq()::invalid input argument. Options must be an object.' );
		}
		if ( opts.hasOwnProperty( 'strict' ) ) {
			strict = opts.strict;
			if ( typeof strict !== 'boolean' ) {
				throw new TypeError( 'neq()::invalid input argument. Strict option must be a boolean.' );
			}
		}
		if ( opts.hasOwnProperty( 'array' ) ) {
			arrCompare = opts.array;
			if ( typeof arrCompare !== 'boolean' ) {
				throw new TypeError( 'neq()::invalid input argument. Array option must be a boolean.' );
			}
		}
	}
	len = arr.length;
	out = new Array( len );
	if ( strict ) {
		if ( !isArray || x.length !== len || arrCompare ) {
			for ( i = 0; i < len; i++ ) {
				if ( arr[ i ] !== x ) {
					out[ i ] = 1;
				} else {
					out[ i ] = 0;
				}
			}
			return out;
		}
		for ( i = 0; i < len; i++ ) {
			if ( arr[ i ] !== x[ i ] ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	if ( !isArray || x.length !== len || arrCompare ) {
		for ( i = 0; i < len; i++ ) {
			/* jshint eqeqeq:false */
			if ( arr[ i ] != x ) {
				out[ i ] = 1;
			} else {
				out[ i ] = 0;
			}
		}
		return out;
	}
	for ( i = 0; i < len; i++ ) {
		/* jshint eqeqeq:false */
		if ( arr[ i ] != x[ i ] ) {
			out[ i ] = 1;
		} else {
			out[ i ] = 0;
		}
	}
	return out;
} // end FUNCTION neq()


// EXPORTS //

module.exports = neq;

},{"validate.io-object":156}],156:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":157}],157:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],158:[function(require,module,exports){
/**
*
*	COMPUTE: pcorr
*
*
*	DESCRIPTION:
*		- Computes Pearson product-moment correlation coefficients between one or more numeric arrays.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// LINEAR CORRELATION //

/**
* FUNCTION: pcorr( arr1[, arr2,...] )
*	Computes Pearson product-moment correlation coefficients between one or more numeric arrays.
*
* @param {...Array} arr - numeric array
* @returns {Array} correlation matrix
*/
function pcorr() {
	var args,
		nArgs,
		len,
		deltas,
		delta,
		means,
		stdevs,
		C,
		cov,
		corr,
		arr,
		N, r, A, B, sum, val, sigma,
		i, j, n;

	args = Array.prototype.slice.call( arguments );
	nArgs = args.length;

	if ( !nArgs ) {
		throw new Error( 'pcorr()::insufficient input arguments. Must provide array arguments.' );
	}
	for ( i = 0; i < nArgs; i++ ) {
		if ( !Array.isArray( args[i] ) ) {
			throw new TypeError( 'pcorr()::invalid input argument. Must provide array arguments.' );
		}
	}
	if ( Array.isArray( args[0][0] ) ) {
		// If the first argument is an array of arrays, calculate the correlation matrix over the nested arrays, disregarding any other arguments...
		args = args[ 0 ];
	}
	nArgs = args.length;
	len = args[ 0 ].length;
	for ( i = 1; i < nArgs; i++ ) {
		if ( args[i].length !== len ) {
			throw new Error( 'pcorr()::invalid input argument. All arrays must have equal length.' );
		}
	}
	// [0] Initialization...
	deltas = new Array( nArgs );
	means = new Array( nArgs );
	stdevs = new Array( nArgs );
	C = new Array( nArgs );
	cov = new Array( nArgs );
	corr = new Array( nArgs );
	for ( i = 0; i < nArgs; i++ ) {
		means[ i ] = args[ i ][ 0 ];
		arr = new Array( nArgs );
		for ( j = 0; j < nArgs; j++ ) {
			arr[ j ] = 0;
		}
		C[ i ] = arr;
		cov[ i ] = arr.slice(); // copy!
		corr[ i ] = arr.slice(); // copy!
	}
	if ( len < 2 ) {
		return corr;
	}
	// [1] Compute the covariance...
	for ( n = 1; n < len; n++ ) {

		N = n + 1;
		r = n / N;

		// [a] Extract the values and compute the deltas...
		for ( i = 0; i < nArgs; i++ ) {
			deltas[ i ] = args[ i ][ n ] - means[ i ];
		}

		// [b] Update the covariance between one array and every other array...
		for ( i = 0; i < nArgs; i++ ) {
			arr = C[ i ];
			delta = deltas[ i ];
			for ( j = i; j < nArgs; j++ ) {
				A = arr[ j ];
				B = r * delta * deltas[ j ];
				sum = A + B;
				// Exploit the fact that the covariance matrix is symmetric...
				if ( i !== j ) {
					C[ j ][ i ] = sum;
				}
				arr[ j ] = sum;
			} // end FOR j
		} // end FOR i

		// [c] Update the means...
		for ( i = 0; i < nArgs; i++ ) {
			means[ i ] += deltas[ i ] / N;
		}
	} // end FOR n

	// [2] Normalize the co-moments...
	n = N - 1;
	for ( i = 0; i < nArgs; i++ ) {
		arr = C[ i ];
		for ( j = i; j < nArgs; j++ ) {
			val = arr[ j ] / n;
			cov[ i ][ j ] = val;
			if ( i !== j ) {
				cov[ j ][ i ] = val;
			}
		}
	}

	// [3] Compute the standard deviations...
	for ( i = 0; i < nArgs; i++ ) {
		// Diagonal elements of covariance matrix...
		stdevs[ i ] = Math.sqrt( cov[i][i] );
	}

	// [4] Set the diagonal elements to 1:
	for ( i = 0; i < nArgs; i++ ) {
		corr[ i ][ i ] = 1;
	}

	// [5] Compute the correlation coefficients...
	for ( i = 0; i < nArgs; i++ ) {
		arr = cov[ i ];
		sigma = stdevs[ i ];
		for ( j = i+1; j < nArgs; j++ ) {
			val = arr[ j ] / ( sigma*stdevs[j] );
			// Address floating point errors introduced by taking the sqrt and enforce strict [-1,1] bounds...
			if ( val > 1 ) {
				val = 1;
			} else if ( val < -1 ) {
				val = -1;
			}
			corr[ i ][ j ] = val;
			corr[ j ][ i ] = val;
		}
	}
	return corr;
} // end FUNCTION pcorr()


// EXPORTS //

module.exports = pcorr;

},{}],159:[function(require,module,exports){
/**
*
*	COMPUTE: polynomial
*
*
*	DESCRIPTION:
*		- Evaluates a polynomial.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: polyval( coef, x )
	*	Evaluates a polynomial.
	*
	* @private
	* @param {Array} coef - array of coefficients sorted in descending degree
	* @param {Number} x - value at which to evaluate the polynomial
	* @return {Number} evaluated polynomial
	*/
	function polyval( c, x ) {
		var len = c.length,
			p = 0;

		// NaN check:
		if ( x !== x ) {
			throw new TypeError( 'polynomial()::invalid input argument. Value must be numeric.' );
		}

		for ( var i = 0; i < len; i++ ) {
			p = p*x + c[ i ];
		}
		return p;
	} // end FUNCTION polyval()


	// EXPORTS //

	/**
	* FUNCTION: polyval( coef, x )
	*	Evaluates a polynomial.
	*
	* @param {Array} coef - array of coefficients sorted in descending degree
	* @param {Array|Number} x - value(s) at which to evaluate the polynomial
	* @returns {Number|Array} evaluated polynomial
	*/
	module.exports = function( c, x ) {
		if ( !Array.isArray( c ) ) {
			throw new TypeError( 'polynomial()::invalid input argument. Coefficients must be an array.' );
		}
		if ( typeof x === 'number' ) {
			return polyval( c, x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'polynomial()::invalid input argument. Second argument must be either an array of numeric values or a single numeric value.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = polyval( c, x[ i ] );
		}
		return arr;
	};

})();
},{}],160:[function(require,module,exports){
/**
*
*	COMPUTE: prod
*
*
*	DESCRIPTION:
*		- Computes the product of an array.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );

// PROD //

/*
* FUNCTION: prod( arr[, accessor] )
*	Computes the product of an array.
*
* @param {Array} arr - array of values
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Number|Null} product
*/
function prod( arr, clbk ) {
	if ( !isArray( arr ) ) {
		throw new TypeError( 'prod()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 ) {
		if ( typeof clbk !== 'function' ) {
			throw new TypeError( 'prod()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	var len = arr.length,
		p = 1,
		val,
		i;

	if ( !len ) {
		return null;
	}
	if ( clbk ) {
		for ( i = 0; i < len; i++ ) {
			val = clbk( arr[ i ] );
			if ( val === 0 ) {
				return 0;
			}
			p *= val;
		}
	} else {
		for ( i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( val === 0 ) {
				return 0;
			}
			p *= val;
		}
	}
	return p;
} // end FUNCTION prod()


// EXPORTS //

module.exports = prod;

},{"validate.io-array":161}],161:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],162:[function(require,module,exports){
/**
*
*	COMPUTE: qmean
*
*
*	DESCRIPTION:
*		- Computes the quadratic mean (root mean square) of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// QMEAN //

	/**
	* FUNCTION: qmean( arr )
	*	Calculates the quadratic mean (root mean square) of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} quadratic mean
	*/
	function qmean( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'qmean()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			t = 0,
			s = 1,
			r,
			val,
			abs;
		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			abs = val;
			if ( abs < 0 ) {
				abs = -abs;
			}
			if ( abs > 0 ) {
				if ( abs > t ) {
					r = t / val;
					s = 1 + s*r*r;
					t = abs;
				} else {
					r = val / t;
					s = s + r*r;
				}
			}
		}
		return t * Math.sqrt( s/len );
	} // end FUNCTION qmean()


	// EXPORTS //

	module.exports = qmean;

})();
},{}],163:[function(require,module,exports){
/**
*
*	COMPUTE: quantile
*
*
*	DESCRIPTION:
*		- Computes a quantile for a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// QUANTILE //

/**
* FUNCTION: quantile( arr, prob[, opts] )
*	Computes a quantile for a numeric array.
*
* @private
* @param {Array} arr - 1d array
* @param {Number} prob - quantile prob [0,1]
* @param {Object} [opts] - method options:
	`method`: method used to interpolate a quantile value
	`sorted`: boolean flag indicating if the input array is sorted
* @returns {Number} quantile value
*/
function quantile( arr, p, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'quantile()::invalid input argument. First argument must be an array.' );
	}
	if ( typeof p !== 'number' || p !== p ) {
		throw new TypeError( 'quantile()::invalid input argument. Quantile probability must be numeric.' );
	}
	if ( p < 0 || p > 1 ) {
		throw new TypeError( 'quantile()::invalid input argument. Quantile probability must be on the interval [0,1].' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'quantile()::invalid input argument. Options must be an object.' );
		}
		if ( opts.hasOwnProperty( 'sorted' ) && typeof opts.sorted !== 'boolean' ) {
			throw new TypeError( 'quantile()::invalid input argument. Sorted flag must be a boolean.' );
		}
		if ( opts.hasOwnProperty( 'method' ) && typeof opts.method !== 'string' ) {
			throw new TypeError( 'quantile()::invalid input argument. Method must be a string.' );
		}
		// TODO: validate that the requested method is supported. list.indexOf( method )
	} else {
		opts = {};
	}
	var len = arr.length,
		id;

	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}

	// Cases...

	// [0] 0th percentile is the minimum value...
	if ( p === 0.0 ) {
		return arr[ 0 ];
	}
	// [1] 100th percentile is the maximum value...
	if ( p === 1.0 ) {
		return arr[ len-1 ];
	}
	// Calculate the vector index marking the quantile:
	id = ( len*p ) - 1;

	// [2] Is the index an integer?
	if ( id === Math.floor( id ) ) {
		// Value is the average between the value at id and id+1:
		return ( arr[ id ] + arr[ id+1 ] ) / 2.0;
	}
	// [3] Round up to the next index:
	id = Math.ceil( id );
	return arr[ id ];
} // end FUNCTION quantile()


// EXPORTS //

module.exports = quantile;

},{"validate.io-object":164}],164:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":165}],165:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],166:[function(require,module,exports){
/**
*
*	COMPUTE: quantiles
*
*
*	DESCRIPTION:
*		- Computes quantiles for numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	isInteger = require( 'validate.io-integer' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// QUANTILES //

/**
* FUNCTION: quantiles( arr, num[, opts] )
*	Computes quantiles for a numeric array.
*
* @param {Array} arr - array of values
* @param {Number} num - number of quantiles
* @param {Object} [options] - function options
* @returns {Array} quantiles
*/
function quantiles( arr, num, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'quantiles()::invalid input argument. First argument must be an array.' );
	}
	if ( !isInteger( num ) || num <= 0 ) {
		throw new TypeError( 'quantiles()::invalid input argument. Second argument must be a positive integer.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'quantiles()::invalid input argument. Options should be an object.' );
		}
		if ( opts.hasOwnProperty( 'sorted' ) && typeof opts.sorted !== 'boolean' ) {
			throw new TypeError( 'quantiles()::invalid input argument. Sorted flag must be a boolean.' );
		}
		if ( opts.hasOwnProperty( 'method' ) && typeof opts.method !== 'string' ) {
			throw new TypeError( 'quantiles()::invalid input argument. Method must be a string.' );
		}
		// TODO: validate that the requested method is supported. list.indexOf( method )
	} else {
		opts = {};
	}
	var len = arr.length,
		qValues = new Array( num+1 ),
		id,
		val;

	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}

	// 0th quantile is the min:
	qValues[ 0 ] = arr[ 0 ];

	// Max defines the quantile upper bound:
	qValues[ num ] = arr[ len-1 ];

	// Get the quantiles...
	for ( var i = 1; i < num; i++ ) {

		// Calculate the vector index marking the quantile:
		id = ( len * i / num ) - 1;

		// Is the index an integer?
		if ( id === Math.floor( id ) ) {
			// Value is the average between the value at id and id+1:
			val = ( arr[ id ] + arr[ id+1 ] ) / 2.0;
		} else {
			// Round up to the next index:
			id = Math.ceil( id );
			val = arr[ id ];
		}
		qValues[ i ] = val;
	} // end FOR i
	return qValues;
} // end FUNCTION quantiles()


// EXPORTS //

module.exports = quantiles;

},{"validate.io-integer":167,"validate.io-object":168}],167:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],168:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":169}],169:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],170:[function(require,module,exports){
/**
*
*	COMPUTE: rad2deg
*
*
*	DESCRIPTION:
*		- Converts radians to degrees.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// RADIANS-TO-DEGREES //

/**
* FUNCTION: rad2deg( x )
*	Converts radians to degrees. Note: if provided an array, the array is mutated.
*
* @param {Array|Number} x - value(s) to be converted to degrees
* @returns {Array|Number|Null} degree value(s). If `x` is an empty `array`, returns `null`.
*/
function rad2deg( x ) {
	var isArray = Array.isArray( x ),
		len;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'rad2deg()::invalid input argument. Must provide either a single numeric value or a numeric array.' );
	}
	if ( !isArray ) {
		return x * 180 / Math.PI;
	}
	len = x.length;
	if ( !len ) {
		return null;
	}
	for ( var i = 0; i < len; i++ ) {
		x[ i ] *= 180 / Math.PI;
	}
	return x;
} // end FUNCTION rad2deg()


// EXPORTS //

module.exports = rad2deg;

},{}],171:[function(require,module,exports){
/**
*
*	COMPUTE: range
*
*
*	DESCRIPTION:
*		- Computes the arithmetic range of an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: range( arr )
	*	Returns the arithmetic range of an array of values.
	*/
	function range( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'range()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			min = arr[ 0 ],
			max = min,
			x;

		for ( var i = 1; i < len; i++ ) {
			x = arr[ i ];
			if ( x < min ) {
				min = x;
			} else if ( x > max ) {
				max = x;
			}
		}
		return [ min, max ];
	} // end FUNCTION range()


	// EXPORTS //

	module.exports = range;

})();
},{}],172:[function(require,module,exports){
/**
*
*	COMPUTE: reverse
*
*
*	DESCRIPTION:
*		- Reverse an array in place.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: reverse( arr )
	*	Reverses an `array` in place. Note that the input `array` is mutated.
	*
	* @param {Array} arr - `array` to reverse
	*/
	function reverse( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'reverse()::invalid input argument. Argument must be an array.' );
		}
		var len = arr.length,
			half = Math.floor( len / 2 ),
			N = len - 1,
			tmp,
			j;
		for ( var i = 0; i < half; i++ ) {
			tmp = arr[ i ];
			j = N - i;
			arr[ i ] = arr[ j ];
			arr[ j ] = tmp;
		}
	} // end FUNCTION reverse()


	// EXPORTS //

	module.exports = reverse;

})();
},{}],173:[function(require,module,exports){
/**
*
*	COMPUTE: roundn
*
*
*	DESCRIPTION:
*		- Round values to the nearest multiple of 10^n.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: roundn( x, n )
*	Rounds values to the nearest multiple of 10^n. Notes: if provided an array, mutates the array.
*
* @param {Array|Number} x - value(s) to be rounded
* @param {Number} n - power of 10; should be an integer value
* @returns {Array|Number} rounded value(s). If `x` is an empty array, returns `null`.
*/
function roundn( x, n ) {
	var isArray = Array.isArray( x ),
		scalar,
		len;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'roundn()::invalid input argument. Must provide either a single numeric value or a numeric array.' );
	}
	if ( typeof n !== 'number' || n !== n || n !== ( n | 0) ) {
		throw new TypeError( 'roundn()::invalid input argument. Power of 10 must be an integer value.' );
	}
	n = -n;
	scalar = Math.pow( 10, n );
	if ( !isArray ) {
		return Math.round( x*scalar ) / scalar;
	}
	len = x.length;
	if ( !len ) {
		return null;
	}
	for ( var i = 0; i < len; i++ ) {
		x[ i ] = Math.round( x[i]*scalar ) / scalar;
	}
	return x;
} // end FUNCTION roundn()


// EXPORTS //

module.exports = roundn;

},{}],174:[function(require,module,exports){
/**
*
*	COMPUTE: shuffle
*
*
*	DESCRIPTION:
*		- Shuffles array elements in place.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// SHUFFLE //

	/**
	* FUNCTION: shuffle( arr )
	*	Mutates an input `array` to generate a random permutation of `array` elements.
	*
	* @param {Array} arr - `array` to shuffle
	*/
	function shuffle( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'shuffle()::invalid input argument. Must provide an array.' );
		}
		var N = arr.length,
			j,
			tmp;

		// Note: we skip the first element, as no further swaps are possible given that all other indices are excluded from swapping...
		for ( var i = N - 1; i > 0; i-- ) {
			// Generate an integer index on the interval: [0,i]
			j = Math.floor( Math.random() * (i+1) );

			// Swap elements:
			tmp = arr[ i ];
			arr[ i ] = arr[ j ];
			arr[ j ] = tmp;
		}
	} // end FUNCTION shuffle()


	// EXPORTS //

	module.exports = shuffle;

})();
},{}],175:[function(require,module,exports){
/**
*
*	COMPUTE: signum
*
*
*	DESCRIPTION:
*		- Signum function.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// SIGNUM //

	/**
	* FUNCTION: signum(x )
	*	Determines the sign of a numeric value.
	*/
	function signum( x ) {
		if ( typeof x !== 'number' ) {
			throw new TypeError( 'signum()::invalid input argument. Must provide a numeric value.' );
		}
		// Cases...

		// [0] NaN
		if ( x !== x ) {
			return NaN;
		}
		// [1] +-0
		if ( !x ) {
			return x;
		}
		// [2] x < 0
		if ( x < 0 ) {
			return -1;
		}
		// [3] x > 0
		return 1;
	} // end FUNCTION signum()


	// EXPORTS //

	module.exports = function( x ) {
		if ( typeof x === 'number' ) {
			return signum( x );
		}
		if ( !Array.isArray( x ) ) {
			throw new TypeError( 'signum()::invalid input argument. Must provide an array.' );
		}
		var len = x.length,
			arr = new Array( len );

		for ( var i = 0; i < len; i++ ) {
			arr[ i ] = signum( x[ i ] );
		}
		return arr;
	};

})();
},{}],176:[function(require,module,exports){
/**
*
*	COMPUTE: skewness
*
*
*	DESCRIPTION:
*		- Computes the sample skewness of an array of values.
*
*
*	NOTES:
*		[1] The formula for corrected sample skewness comes from: Jones and Gill (1998). Comparing measures of sample skewness and kurtosis. The Statistician. DOI: 10.1111/1467-9884.00122
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: skewness( arr )
	*	Computes the sample skewness of an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample skewness
	*/
	function skewness( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'skewness()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			delta = 0,
			delta_n = 0,
			term1 = 0,
			N = 0,
			mean = 0,
			M2 = 0,
			M3 = 0,
			g;

		for ( var i = 0; i < len; i++ ) {
			N += 1;

			delta = arr[ i ] - mean;
			delta_n = delta / N;

			term1 = delta * delta_n * (N-1);

			M3 += term1*delta_n*(N-2) - 3*delta_n*M2;
			M2 += term1;
			mean += delta_n;
		}
		// Calculate the population skewness:
		g = Math.sqrt( N )*M3 / Math.pow( M2, 3/2 );
		// Return the corrected sample skewness:
		return Math.sqrt( N*N-1)*g / (N-2);
	} // end FUNCTION skewness()


	// EXPORTS //

	module.exports = skewness;

})();
},{}],177:[function(require,module,exports){
/**
*
*	COMPUTE: sqrt
*
*
*	DESCRIPTION:
*		- Computes an element-wise principal square root for each element in a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// SQUARE ROOT //

/**
* FUNCTION: sqrt( arr )
*	Computes an element-wise principal square root for each element of a numeric array. Note: the input array is mutated.
*
* @param {Array} arr - numeric array
*/
function sqrt( arr ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'sqrt()::invalid input argument. Must provide an array.' );
	}
	var len = arr.length;
	for ( var i = 0; i < len; i++ ) {
		arr[ i ] = Math.sqrt( arr[ i ] );
	}
} // end FUNCTION sqrt()


// EXPORTS //

module.exports = sqrt;

},{}],178:[function(require,module,exports){
/**
*
*	COMPUTE: stdev
*
*
*	DESCRIPTION:
*		- Computes the sample standard deviation over an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: stdev( arr )
	*	Computes the sample standard deviation over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample standard deviation
	*/
	function stdev( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'stdev()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mean = 0,
			M2 = 0,
			delta = 0;

		if ( len < 2 ) {
			return 0;
		}
		for ( var i = 0; i < len; i++ ) {
			N += 1;
			delta = arr[ i ] - mean;
			mean += delta / N;
			M2 += delta * ( arr[i] - mean );
		}
		return Math.sqrt( M2 / ( N-1 ) );
	} // end FUNCTION stdev()


	// EXPORTS //

	module.exports = stdev;

})();
},{}],179:[function(require,module,exports){
/**
*
*	COMPUTE: subtract
*
*
*	DESCRIPTION:
*		- Computes an element-wise subtraction of a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// SUBTRACT //

/**
* FUNCTION: subtract( arr, x )
*	Computes an element-wise subtraction of an array.
*
* @param {Array} arr - numeric array
* @param {Array|Number} x - either an array of equal length or a scalar
*/
function subtract( arr, x ) {
	var isArray = Array.isArray( x ),
		len,
		i;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'subtract()::invalid input argument. Must provide an array.' );
	}
	len = arr.length;
	if ( !isArray && ( typeof x !== 'number' || x !== x ) ) {
		throw new TypeError( 'subtract()::invalid input argument. Second argument must be either an array or a scalar.' );
	}
	if ( isArray ) {
		if ( len !== x.length ) {
			throw new Error( 'subtract()::invalid input argument. Arrays must be of equal length.' );
		}
		for ( i = 0; i < len; i++ ) {
			arr[ i ] -= x[ i ];
		}
		return;
	}
	for ( i = 0; i < len; i++ ) {
		arr[ i ] -= x;
	}
} // end FUNCTION subtract()


// EXPORTS //

module.exports = subtract;

},{}],180:[function(require,module,exports){
/**
*
*	COMPUTE: sum
*
*
*	DESCRIPTION:
*		- Computes the sum over an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: sum( arr )
	*	Computes the sum over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sum
	*/
	function sum( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'sum()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			s = 0;

		for ( var i = 0; i < len; i++ ) {
			s += arr[ i ];
		}
		return s;
	} // end FUNCTION sum()


	// EXPORTS //

	module.exports = sum;

})();
},{}],181:[function(require,module,exports){
/**
*
*	COMPUTE: trimean
*
*
*	DESCRIPTION:
*		- Computes the trimean of a numeric array.
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	median = require( 'compute-median' ),
	quantile = require( 'compute-quantile' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// TRIMEAN //

/**
* FUNCTION: trimean( arr[, opts] )
*	Computes the trimean of a numeric array.
*
* @param {Array} arr - numeric array
* @param {Object} [opts] - quantile function options
* @returns {Number} trimean
*/
function trimean( arr, opts ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'trimean()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( opts ) ) {
			throw new TypeError( 'trimean()::invalid input argument. Options should be an object.' );
		}
	} else {
		opts = {
			'sorted': false
		};
	}
	if ( !opts.sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
		opts.sorted = true;
	}
	var q1 = quantile( arr, 0.25, opts ),
		q2 = median( arr, true ),
		q3 = quantile( arr, 0.75, opts );

	return ( q1 + 2*q2 + q3 ) / 4.0;
} // end FUNCTION trimean()


// EXPORTS //
module.exports = trimean;

},{"compute-median":110,"compute-quantile":163,"validate.io-object":182}],182:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":183}],183:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],184:[function(require,module,exports){
/**
*
*	COMPUTE: tversky-index
*
*
*	DESCRIPTION:
*   -	Computes the Tversky index between two sequences.
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
*	Copyright (c) 2015. Philipp Burckhardt.
*
*
*	AUTHOR:
*		Philipp Burckhardt. pburckhardt@outlook.com. 2015.
*
*/

'use strict';

// MODULES //

var intersect = require( 'intersect' ),
	isArray = require( 'validate.io-array' ),
	isString = require( 'validate.io-string' ),
	isBoolean = require( 'validate.io-boolean' ),
	isObject = require( 'validate.io-object' ),
	isNonNegative = require( 'validate.io-nonnegative' );


// FUNCTIONS //

/**
* FUNCTION: unique( arr )
*	Computes the unique elements of an array.
*
* @private
* @param {Array} arr - input array
* @returns {Array} array of unique elements
*/
function unique( arr ) {
	var len = arr.length,
		hash = {},
		vals = [],
		val;

	for ( var i = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( !hash.hasOwnProperty( val ) ) {
			hash[ val ] = true;
			vals.push( val );
		}
	}
	return vals;
} // end FUNCTION unique()


// TVERSKY INDEX //

/**
* FUNCTION: tversky( a, b[, options] )
*   Computes the Tversky index between two sequences. For alpha = beta = 0.5, the index is equal to Dice's coefficient. For alpha = beta = 1, the index is equal to the Tanimoto coefficient.
*
* @param {String|Array} a - array or string sequence
* @param {String|Array} b - array or string sequence
* @param {Object} [options] - method options
* @param {Number} [options.alpha=1] - weight of prototype
* @param {Number} [options.beta=1] - weight of variant
* @param {Boolean} [options.symmetric=false] - boolean specifying whether the index should be symmetric
* @returns {Number} Tversky index
*/
function tversky( a, b, options ) {
	var symmetric = false,
		alpha = 1,
		beta = 1,
		aType,
		bType,
		opts,
		anb,
		len,
		aCompl,
		bCompl,
		hash,
		min,
		max,
		i;

	aType = isString( a );
	if ( !isArray( a ) && !aType ) {
		throw new TypeError( 'tversky()::invalid input argument. Sequence must be either an array or a string. Value: `' + a + '`.' );
	}
	bType = isString( b );
	if ( !isArray( b )  && !bType ) {
		throw new TypeError( 'tversky()::invalid input argument. Sequence must be either an array or a string. Value: `' + b + '`.' );
	}
	if ( aType !== bType ) {
		throw new Error( 'tversky()::invalid input arguments. Sequences must be the same type; i.e., both strings or both arrays.' );
	}
	if ( arguments.length > 2 ) {
		opts = options;
		if ( !isObject( opts ) ) {
			throw new TypeError( 'tversky()::invalid input argument. Options must be an object. Value: `' + opts + '`.' );
		}
		if ( opts.hasOwnProperty( 'alpha' ) ) {
			alpha = opts.alpha;
			if ( !isNonNegative( alpha ) ) {
				throw new TypeError( 'tversky()::invalid option. Alpha must be a nonnegative number. Value: `' + alpha + '`.' );
			}
		}
		if ( opts.hasOwnProperty( 'beta' ) ) {
			beta = opts.beta;
			if ( !isNonNegative( beta ) ) {
				throw new TypeError( 'tversky()::invalid option. Beta must be a nonnegative number. Value: `' + beta + '`.' );
			}
		}
		if ( opts.hasOwnProperty( 'symmetric' ) ) {
			symmetric = opts.symmetric;
			if ( !isBoolean( symmetric ) ) {
				throw new TypeError( 'tversky()::invalid option. Symmetric flag must be a boolean. Value: `' + symmetric + '`.' );
			}
		}
	}
	if ( aType ){
		a = a.split( '' );
		b = b.split( '' );
	}
	// Determine the unique elements for each array:
	a = unique( a );
	b = unique( b );

	// Compute the intersection between the unique sets:
	anb = intersect( a, b );
	len = anb.length;

	// Create a hash...
	hash = {};
	for ( i = 0; i < len; i++ ) {
		hash[ anb[i] ] = true;
	}
	// Compute the relative complements...
	aCompl = 0;
	for ( i = 0; i < a.length; i++ ) {
		if ( !hash.hasOwnProperty( a[i] ) ) {
			aCompl++;
		}
	}
	bCompl = 0;
	for ( i = 0; i < b.length; i++ ) {
		if ( !hash.hasOwnProperty( b[i] ) ) {
			bCompl++;
		}
	}
	if ( symmetric ) {
		if ( aCompl > bCompl ) {
			min = bCompl;
			max = aCompl;
		} else {
			min = aCompl;
			max = bCompl;
		}
		return len / ( len + beta*(alpha*min + max*(1-alpha))  );
	}
	return len / ( len + alpha*aCompl + beta*bCompl );
} // end FUNCTION tversky()


// EXPORTS //

module.exports = tversky;

},{"intersect":185,"validate.io-array":186,"validate.io-boolean":187,"validate.io-nonnegative":188,"validate.io-object":189,"validate.io-string":190}],185:[function(require,module,exports){
module.exports = intersect;

function intersect (a, b) {
  var res = [];
  for (var i = 0; i < a.length; i++) {
    if (indexOf(b, a[i]) > -1) res.push(a[i]);
  }
  return res;
}

intersect.big = function(a, b) {
  var ret = [];
  var temp = {};
  
  for (var i = 0; i < b.length; i++) {
    temp[b[i]] = true;
  }
  for (var i = 0; i < a.length; i++) {
    if (temp[a[i]]) ret.push(a[i]);
  }
  
  return ret;
}

function indexOf(arr, el) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === el) return i;
  }
  return -1;
}

},{}],186:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],187:[function(require,module,exports){
arguments[4][138][0].apply(exports,arguments)
},{"dup":138}],188:[function(require,module,exports){
/**
*
*	VALIDATE: nonnegative
*
*
*	DESCRIPTION:
*		- Validates if a value is a nonnegative number.
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

var isNumber = require( 'validate.io-number' );


// IS NONNEGATIVE //

/**
* FUNCTION: isNonNegative( value )
*	Validates if a value is a nonnegative number.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a nonnegative number
*/
function isNonNegative( value ) {
	return isNumber( value ) && value >= 0;
} // end FUNCTION isNonNegative()


// EXPORTS //

module.exports = isNonNegative;

},{"validate.io-number":200}],189:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":186}],190:[function(require,module,exports){
/**
*
*	VALIDATE: string
*
*
*	DESCRIPTION:
*		- Validates if a value is a string.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isString( value )
*	Validates if a value is a string.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a string
*/
function isString( value ) {
	return typeof value === 'string' || Object.prototype.toString.call( value ) === '[object String]';
} // end FUNCTION isString()


// EXPORTS //

module.exports = isString;

},{}],191:[function(require,module,exports){
/**
*
*	COMPUTE: umidmean
*
*
*	DESCRIPTION:
*		- Computes the interquartile mean of the values above the median for a numeric array (upper midmean).
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
*	Copyright (c) 2014. Rebekah Smith.
*
*
*	AUTHOR:
*		Rebekah Smith. rebekahjs17@gmail.com. 2014.
*
*/

'use strict';

// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// UPPER MIDMEAN //

/**
* FUNCTION: umidmean( arr[, sorted] )
*	Computes the interquartile mean of the values above the median in a numeric array (upper midmean).
*
* @param {Array} arr - numeric array
* @param {Boolean} [sorted] - boolean flag indicating if the input array is sorted in ascending order
* @returns {Number} upper midmean
*/
function umidmean( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'umidmean()::invalid input argument. Must provide an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean' ) {
		throw new TypeError( 'umidmean()::invalid input argument. Second argument must be a boolean.' );
	}
	if ( arr.length < 6 ) {
		throw new Error( 'umidmean()::invalid input argument. Input array must have 6 or more elements.' );
	}
	if ( !sorted ) {
		arr = arr.slice();
		arr.sort( ascending );
	}
	var len = arr.length,
		mean = 0,
		N = 0,
		delta,
		low,
		high;

	// Quartiles sit between values
	if ( len%8 === 0 ) {
		low = len*0.625;
		high = len*0.875 - 1;
	}
	else {
		low = Math.ceil( len*0.625 );
		high = Math.floor( len*0.875 ) - 1;
	}

	// Compute an arithmetic mean...
	for ( var i = low; i <= high; i++ ) {
		N += 1;
		delta = arr[ i ] - mean;
		mean += delta / N;
	}

	return mean;
} // end FUNCTION umidmean()


// EXPORTS //

module.exports = umidmean;

},{}],192:[function(require,module,exports){
/**
*
*	COMPUTE: unique
*
*
*	DESCRIPTION:
*		- Removes duplicate values from a numeric array.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// UNIQUE //

/**
* FUNCTION: unique( arr, sorted )
*	Removes duplicate values from a numeric array. Note: the input array is mutated.
*
* @param {Array} arr - array to be deduped
* @param {Boolean} sorted - boolean flag indicating if the input array is sorted
*/
function unique( arr, sorted ) {
	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'unique()::invalid input argument. First argument must be an array.' );
	}
	if ( arguments.length > 1 && typeof sorted !== 'boolean' ) {
		throw new TypeError( 'unique()::invalid input argument. Second argument must be an array.' );
	}
	var len = arr.length,
		i, j,
		val;

	if ( !len ) {
		return;
	}
	if ( !sorted ) {
		arr.sort( ascending );
	}
	// Loop through the array, only incrementing a pointer when successive values are different. When a succeeding value is different, move the pointer and set the next value. In the trivial case where all array elements are unique, we incur a slight penalty in resetting the element value for each unique value. In other cases, we simply move a unique value to a new position in the array. The end result is a sorted array with unique values.
	for ( i = 1, j = 0; i < len; i++ ) {
		val = arr[ i ];
		if ( arr[ j ] !== val ) {
			j++;
			arr[ j ] = val;
		}
	}
	// Truncate the array:
	arr.length = j+1;
} // end FUNCTION unique()


// EXPORTS //

module.exports = unique;

},{}],193:[function(require,module,exports){
/**
*
*	COMPUTE: unzip
*
*
*	DESCRIPTION:
*		- Unzips a zipped array (i.e., a nested array of tuples).
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// UNZIP //

/**
* FUNCTION: unzip( arr[, idx] )
*	Unzips a zipped array (i.e., a nested array of tuples).
*
* @param {Array} arr - zipped array
* @param {Array} [idx] - array of indices specifying which tuple elements to unzip
* @returns {Array} array of unzipped arrays
*/
function unzip( arr, idx ) {
	var len,
		out,
		tmp,
		numVals,
		i, j, k;

	if ( !Array.isArray( arr ) ) {
		throw new TypeError( 'unzip()::invalid input argument. Must provide a zipped array.' );
	}
	len = arr.length;
	for ( i = 0; i < len; i++ ) {
		if ( !Array.isArray( arr[i] ) ) {
			throw new TypeError( 'unzip()::invalid input argument. Array must only contain arrays.' );
		}
	}
	// Assume that the first tuple is representative of all tuples...
	numVals = arr[ 0 ].length;
	if ( arguments.length > 1 ) {
		if ( !Array.isArray( idx ) ) {
			throw new TypeError( 'unzip()::invalid input argument. Indices must be specified as an array.' );
		}
		for ( i = 0; i < idx.length; i++ ) {
			k = idx[ i ];
			if ( !isInteger( k ) ) {
				throw new TypeError( 'unzip()::invalid input argument. All indices must be integers.' );
			}
			if ( k < 0 || k > numVals ) {
				throw new Error( 'unzip()::invalid input argument. Must provide valid indices; i.e., an index must be on the interval [0,len], where len is the tuple length.' );
			}
		}
		numVals = idx.length;
	} else {
		idx = new Array( numVals );
		for ( i = 0; i < numVals; i++ ) {
			idx[ i ] = i;
		}
	}
	out = new Array( numVals );
	for ( j = 0; j < numVals; j++ ) {
		tmp = new Array( len );
		k = idx[ j ];
		for ( i = 0; i < len; i++ ) {
			tmp[ i ] = arr[ i ][ k ];
		}
		out[ j ] = tmp;
	}
	return out;
} // end FUNCTION unzip()


// EXPORTS //

module.exports = unzip;

},{"validate.io-integer":194}],194:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"validate.io-number":200}],195:[function(require,module,exports){
/**
*
*	COMPUTE: variance
*
*
*	DESCRIPTION:
*		- Computes the sample variance over an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// FUNCTIONS //

	/**
	* FUNCTION: variance( arr )
	*	Computes the sample variance over an array of values.
	*
	* @param {Array} arr - array of values
	* @returns {Number} sample variance
	*/
	function variance( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'variance()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			N = 0,
			mean = 0,
			M2 = 0,
			delta = 0;

		if ( len < 2 ) {
			return 0;
		}
		for ( var i = 0; i < len; i++ ) {
			N += 1;
			delta = arr[ i ] - mean;
			mean += delta / N;
			M2 += delta * ( arr[i] - mean );
		}
		return M2 / ( N-1 );
	} // end FUNCTION variance()


	// EXPORTS //

	module.exports = variance;

})();
},{}],196:[function(require,module,exports){
/**
*
*	COMPUTE: wmean
*
*
*	DESCRIPTION:
*		- Computes a weighted mean over an array of values.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: wmean( arr, weights )
	*	Computes a weighted mean over an array of values.
	*
	* @param {Array} arr - array of values
	* @param {Array} weights - array of weights
	* @returns {Number} weighted mean value
	*/
	function wmean( arr, weights ) {
		if ( !Array.isArray( arr ) || !Array.isArray( weights ) ) {
			throw new TypeError( 'wmean()::invalid input argument. Must provide arrays.' );
		}
		if ( arr.length !== weights.length ) {
			throw new Error( 'wmean()::invalid input arguments. Value array and weights array must be the same length.' );
		}
		var len = arr.length,
			sum = 0,
			mu = 0,
			w;

		// Normalize the weights to sum to 1 and calculate the weighted mean...
		for ( var i = 0; i < len; i++ ) {
			sum += weights[ i ];
		}
		for ( var j = 0; j < len; j++ ) {
			w = weights[ j ] / sum;
			mu += arr[ j ] * w;
		}
		return mu;
	} // end FUNCTION wmean()


	// EXPORTS //

	module.exports = wmean;

})();
},{}],197:[function(require,module,exports){
/**
*
*	COMPUTE: zip
*
*
*	DESCRIPTION:
*		- Generates array tuples from input arrays.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isObject = require( 'validate.io-object' );


// ZIP //

/**
* FUNCTION: zip( arr1, arr2,...[, opts] )
*	Generates array tuples from input arrays.
*
* @param {...Array} arr - input arrays to be zipped
* @param {Object} [opts] - function options
* @param {Boolean} [opts.trunc] - boolean indicating whether to truncate arrays longer than the shortest input array
* @param {*} [opts.fill] - fill value used for arrays of unequal length
* @param {Boolean} [opts.arrays] - boolean indicating whether an input array should be interpreted as an array of arrays to be zipped
*/
function zip() {
	var args = Array.prototype.slice.call( arguments ),
		numArgs = args.length,
		opts = {},
		fill = null,
		arg,
		flg,
		len,
		out,
		arr,
		val,
		i, j;

	for ( i = 0; i < numArgs-1; i++ ) {
		if ( !Array.isArray( args[i] ) ) {
			throw new TypeError( 'zip()::invalid input argument. Must provide array arguments.' );
		}
	}
	arg = args[ numArgs-1 ];
	flg = isObject( arg );
	if ( !flg && !Array.isArray( arg ) ) {
		throw new TypeError( 'zip()::invalid input argument. Last argument must be either an array or an options object.' );
	}
	if ( flg ) {
		opts = args.pop();
	}
	numArgs = args.length;
	if ( numArgs === 0 ) {
		throw new Error( 'zip()::insufficient input arguments. Must provide at least one array.' );
	}
	if ( opts.hasOwnProperty( 'trunc' ) ) {
		if ( typeof opts.trunc !== 'boolean' ) {
			throw new TypeError( 'zip()::invalid input argument. `trunc` option must be a boolean.' );
		}
	} else {
		opts.trunc = true;
	}
	if ( opts.hasOwnProperty( 'fill' ) ) {
		fill = opts.fill;
	}
	if ( opts.hasOwnProperty( 'arrays' ) && typeof opts.arrays !== 'boolean' ) {
		throw new TypeError( 'zip()::invalid input argument. `arrays` option must be a boolean.' );
	}
	if ( numArgs === 1 && opts.arrays ) {
		// Treat the lone array argument as an array of arrays to be zipped...
		args = args[ 0 ];
		numArgs = args.length;
	}
	len = args[ 0 ].length;
	if ( opts.trunc ) {
		// Find the min array length...
		for ( i = 0; i < numArgs; i++ ) {
			val = args[ i ].length;
			if ( val < len ) {
				len = val;
			}
		}
	} else {
		// Find the max array length...
		for ( i = 0; i < numArgs; i++ ) {
			val = args[ i ].length;
			if ( val > len ) {
				len = val;
			}
		}
	}
	out = new Array( len );
	for ( j = 0; j < len; j++ ) {
		// Temporary array to store tuples...
		arr = new Array( numArgs );

		// Create the tuples...
		for ( i = 0; i < numArgs; i++ ) {
			arg = args[ i ];

			// If an array is too short, use a fill value...
			if ( arg.length <= j ) {
				arr[ i ] = fill;
				continue;
			}
			arr[ i ] = arg[ j ];
		}
		out[ j ] = arr;
	}
	return out;
} // end FUNCTION zip()


// EXPORTS //

module.exports = zip;

},{"validate.io-object":198}],198:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"validate.io-array":199}],199:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],200:[function(require,module,exports){
/**
*
*	VALIDATE: number
*
*
*	DESCRIPTION:
*		- Validates if a value is a number.
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
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isNumber( value )
*	Validates if a value is a number.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a number
*/
function isNumber( value ) {
	return ( typeof value === 'number' || Object.prototype.toString.call( value ) === '[object Number]' ) && value.valueOf() === value.valueOf();
} // end FUNCTION isNumber()


// EXPORTS //

module.exports = isNumber;

},{}],201:[function(require,module,exports){
'use strict';

// MODULES //

var CodeMirror = require( 'codemirror' );


// EXPORTS //

module.exports = {
	'value': '',

	// The syntax highlighting mode to use:
	'mode': {
		'name': 'javascript',
		// 'json': true
	},

	// Theme by which to style the editor:
	'theme': 'default',

	// How many spaces a block (whatever that means in the edited language) should be indented:
	'indentUnit': 4,

	// Whether to use the context-sensitive indentation that the mode provides (or just indent the same as the line before):
	'smartIndent': true,

	// The width of a tab character:
	'tabSize': 4,

	// Whether CodeMirror should scroll or wrap for long lines. Defaults to false (scroll).
	'lineWrapping': true,

	// Whether to show line numbers to the left of the editor:
	'lineNumbers': true,

	// Number from which to start counting lines:
	'firstLineNumber': 1,

	// Amount of lines that are rendered above and below the part of the document that's currently scrolled into view:
	'viewportMargin': Number.POSITIVE_INFINITY,

	// What key map should the editor use:
	'keyMap': 'sublime',

	// Extra key bindings for the editor, alongside the ones defined by keyMap:
	'extraKeys': {
		'Cmd-Enter': function onKey( cm ) {
			var code = cm.doc.getValue();
			code = code.replace( /print\((.*)\)/, 'return print($1)' );

			var fcn = new Function( code );

			var val = fcn();

			// console.log( 'the answer is ' + val );

			var el = document.querySelector( '.print' );

			el.innerHTML = val;
		} // end FUNCTION onKey()
	},

	// Source for linting:
	'lint': true,

	// Whether to highlight the active line:
	'styleActiveLine': true,

	// Placeholder text when the editor is empty or not focused:
	'placeholder': 'Code goes here...',

	// Highlight matching brackets when the cursor is next to one:
	'matchBrackets': true,

	// Auto-close brackets and quotes:
	'autoCloseBrackets': true,

	// Array of class names for adding additional gutters:
	'gutters': [
		'CodeMirror-lint-markers'
	],

};

},{"codemirror":11}],202:[function(require,module,exports){


'use strict';

// MODULES //

var CodeMirror = require( 'codemirror' );


// MODES //

require( 'codemirror/mode/javascript/javascript.js' );
require( 'codemirror/mode/shell/shell.js' );
require( 'codemirror/mode/http/http.js' );


// KEYMAPS //

require( 'codemirror/keymap/sublime.js' );


// ADDONS //

// Defines an option autoCloseBrackets that will auto-close brackets and quotes when typed:
require( 'codemirror/addon/edit/closeBrackets.js' );

// Defines an option matchBrackets which, when set to true, causes matching brackets to be highlighted whenever the cursor is next to them:
require( 'codemirror/addon/edit/matchBrackets' );

// Addon for commenting and uncommenting code:
require( 'codemirror/addon/comment/comment.js' );

// Defines a styleActiveLine option that, when enabled, gives the wrapper of the active line the class `CodeMirror-activeline`, and adds a background with the class `CodeMirror-activeline-background:
require( 'codemirror/addon/selection/active-line.js' );

// Adds a placeholder option that can be used to make text appear in the editor when it is empty and not focused:
require( 'codemirror/addon/display/placeholder.js' );

// Defines an interface component for showing lint warnings:
require( 'codemirror/addon/lint/lint.js' );
require( 'codemirror/addon/lint/javascript-lint.js' );
// require( 'codemirror/addon/lint/json-lint.js' );


// CONFIGURATION //

var config = require( './codemirror-config.js' );


// SCRIPT //

var textArea = document.querySelector( '.cell' );

CodeMirror.fromTextArea( textArea, config );

},{"./codemirror-config.js":201,"codemirror":11,"codemirror/addon/comment/comment.js":1,"codemirror/addon/display/placeholder.js":2,"codemirror/addon/edit/closeBrackets.js":3,"codemirror/addon/edit/matchBrackets":4,"codemirror/addon/lint/javascript-lint.js":6,"codemirror/addon/lint/lint.js":7,"codemirror/addon/selection/active-line.js":9,"codemirror/keymap/sublime.js":10,"codemirror/mode/http/http.js":12,"codemirror/mode/javascript/javascript.js":13,"codemirror/mode/shell/shell.js":14}],203:[function(require,module,exports){
/**
*
*	SCRIPT: compute-io
*
*
*	DESCRIPTION:
*		- Binds all compute methods to the global `window` object; e.g., `compute.mean()` => `mean()`.
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

/* global window */
'use strict';

// MODULES //

var compute = require( 'compute.io' );


// SCRIPT //

var keys,
	i;

keys = Object.keys( compute );

for ( i = 0; i < keys.length; i++ ) {
	window[ keys[i] ] = compute[ keys[i] ];
}

},{"compute.io":16}],204:[function(require,module,exports){
/**
*
*	SCRIPT: main
*
*
*	DESCRIPTION:
*		- Main application script.
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

/* global window */
'use strict';

// MODULES //

/**
* Code editor.
*/
require( './codemirror.js' );

/**
* Compute methods.
*/
require( './compute-io.js' );


// MISC //

window.print = function( val ) {
	return val;
};

},{"./codemirror.js":202,"./compute-io.js":203}]},{},[204]);
