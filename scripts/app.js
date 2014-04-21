(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/*global define:false require:false */
module.exports = (function(){
  // Import Events
  var events = require('events');

  // Export Domain
  var domain = {};
  domain.create = function(){
    var d = new events.EventEmitter();
    d.run = function(fn){
      try {
        fn();
      }
      catch (err) {
        this.emit('error', err);
      }
      return this;
    };
    d.dispose = function(){
      this.removeAllListeners();
      return this;
    };
    return d;
  };
  return domain;
}).call(this);
},{"events":3}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var typeChecker,
    __hasProp = {}.hasOwnProperty;

  typeChecker = {
    getObjectType: function(value) {
      return Object.prototype.toString.call(value);
    },
    getType: function(value) {
      var result, type, _i, _len, _ref;
      result = 'object';
      _ref = ['Array', 'RegExp', 'Date', 'Function', 'Boolean', 'Number', 'Error', 'String', 'Null', 'Undefined'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        if (typeChecker['is' + type](value)) {
          result = type.toLowerCase();
          break;
        }
      }
      return result;
    },
    isPlainObject: function(value) {
      return typeChecker.isObject(value) && value.__proto__ === Object.prototype;
    },
    isObject: function(value) {
      return value && typeof value === 'object';
    },
    isError: function(value) {
      return value instanceof Error;
    },
    isDate: function(value) {
      return typeChecker.getObjectType(value) === '[object Date]';
    },
    isArguments: function(value) {
      return typeChecker.getObjectType(value) === '[object Arguments]';
    },
    isFunction: function(value) {
      return typeChecker.getObjectType(value) === '[object Function]';
    },
    isRegExp: function(value) {
      return typeChecker.getObjectType(value) === '[object RegExp]';
    },
    isArray: function(value) {
      var _ref;
      return (_ref = typeof Array.isArray === "function" ? Array.isArray(value) : void 0) != null ? _ref : typeChecker.getObjectType(value) === '[object Array]';
    },
    isNumber: function(value) {
      return typeof value === 'number' || typeChecker.getObjectType(value) === '[object Number]';
    },
    isString: function(value) {
      return typeof value === 'string' || typeChecker.getObjectType(value) === '[object String]';
    },
    isBoolean: function(value) {
      return value === true || value === false || typeChecker.getObjectType(value) === '[object Boolean]';
    },
    isNull: function(value) {
      return value === null;
    },
    isUndefined: function(value) {
      return typeof value === 'undefined';
    },
    isEmpty: function(value) {
      return value != null;
    },
    isEmptyObject: function(value) {
      var empty, key;
      empty = true;
      if (value != null) {
        for (key in value) {
          if (!__hasProp.call(value, key)) continue;
          value = value[key];
          empty = false;
          break;
        }
      }
      return empty;
    }
  };

  module.exports = typeChecker;

}).call(this);

},{}],6:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
var extendr, typeChecker,
  __slice = [].slice,
  __hasProp = {}.hasOwnProperty;

typeChecker = require('typechecker');

extendr = {
  clone: function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    args.unshift({});
    return this.shallowExtendPlainObjects.apply(this, args);
  },
  deepClone: function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    args.unshift({});
    return this.deepExtendPlainObjects.apply(this, args);
  },
  extend: function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return this.shallowExtendPlainObjects.apply(this, args);
  },
  deepExtend: function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return this.deepExtendPlainObjects.apply(this, args);
  },
  shallowExtendPlainObjects: function() {
    var key, obj, objs, target, value, _i, _len;
    target = arguments[0], objs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objs.length; _i < _len; _i++) {
      obj = objs[_i];
      obj || (obj = {});
      for (key in obj) {
        if (!__hasProp.call(obj, key)) continue;
        value = obj[key];
        target[key] = value;
      }
    }
    return target;
  },
  safeShallowExtendPlainObjects: function() {
    var key, obj, objs, target, value, _i, _len;
    target = arguments[0], objs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objs.length; _i < _len; _i++) {
      obj = objs[_i];
      obj || (obj = {});
      for (key in obj) {
        if (!__hasProp.call(obj, key)) continue;
        value = obj[key];
        if (value == null) {
          continue;
        }
        target[key] = value;
      }
    }
    return target;
  },
  deepExtendPlainObjects: function() {
    var key, obj, objs, target, value, _i, _len;
    target = arguments[0], objs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objs.length; _i < _len; _i++) {
      obj = objs[_i];
      obj || (obj = {});
      for (key in obj) {
        if (!__hasProp.call(obj, key)) continue;
        value = obj[key];
        if (typeChecker.isPlainObject(value)) {
          if (!typeChecker.isPlainObject(target[key])) {
            target[key] = {};
          }
          this.deepExtendPlainObjects(target[key], value);
        } else if (typeChecker.isArray(value)) {
          target[key] = value.slice();
        } else {
          target[key] = value;
        }
      }
    }
    return target;
  },
  safeDeepExtendPlainObjects: function() {
    var key, obj, objs, target, value, _i, _len;
    target = arguments[0], objs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objs.length; _i < _len; _i++) {
      obj = objs[_i];
      obj || (obj = {});
      for (key in obj) {
        if (!__hasProp.call(obj, key)) continue;
        value = obj[key];
        if (value == null) {
          continue;
        }
        if (typeChecker.isPlainObject(value)) {
          if (!typeChecker.isPlainObject(target[key])) {
            target[key] = {};
          }
          this.safeDeepExtendPlainObjects(target[key], value);
        } else if (typeChecker.isArray(value)) {
          target[key] = value.slice();
        } else {
          target[key] = value;
        }
      }
    }
    return target;
  },
  dereference: function(source) {
    var target;
    target = JSON.parse(JSON.stringify(source));
    return target;
  }
};

module.exports = extendr;

},{"typechecker":5}],7:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports.extendOnClass = function(proto) {
    var key, klass, value;
    klass = (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        if (proto.hasOwnProperty('constructor')) {
          proto.constructor.apply(this, arguments);
        } else {
          _Class.__super__.constructor.apply(this, arguments);
        }
      }

      return _Class;

    })(this);
    for (key in proto) {
      if (!__hasProp.call(proto, key)) continue;
      value = proto[key];
      klass.prototype[key] = value;
    }
    return klass;
  };

}).call(this);

},{}],8:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var $, View, extendOnClass,
    __hasProp = {}.hasOwnProperty;

  $ = this.$ || (typeof window !== "undefined" && window !== null ? window.$ : void 0) || ((function() {
    try {
      return typeof require === "function" ? require('jquery') : void 0;
    } catch (_error) {}
  })());

  extendOnClass = require('extendonclass').extendOnClass;

  View = (function() {
    View.extend = extendOnClass;

    View.prototype.events = null;

    View.prototype.elements = null;

    View.prototype.el = null;

    View.prototype.$el = null;

    function View(opts) {
      this.events = this.events ? JSON.parse(JSON.stringify(this.events)) : {};
      this.elements = this.elements ? JSON.parse(JSON.stringify(this.elements)) : {};
      this.setConfig(opts);
      this.refreshElement();
      this.refreshElements();
      this.refreshEvents();
      this;
    }

    View.prototype.setConfig = function(opts) {
      var key, value;
      if (opts == null) {
        opts = {};
      }
      for (key in opts) {
        if (!__hasProp.call(opts, key)) continue;
        value = opts[key];
        this[key] = value;
      }
      return this;
    };

    View.prototype.refreshElement = function(el) {
      if (el == null) {
        el = null;
      }
      this.el = el != null ? el : this.el;
      this.$el = $(this.el);
      this.el = this.$el.get(0);
      return this;
    };

    View.prototype.refreshElements = function() {
      var elementName, selector, _ref;
      _ref = this.elements;
      for (selector in _ref) {
        if (!__hasProp.call(_ref, selector)) continue;
        elementName = _ref[selector];
        this[elementName] = $(selector, this.$el);
      }
      return this;
    };

    View.prototype.refreshEvents = function(opts) {
      var eventMethod, eventName, key, methodName, selector, split, _ref;
      if (opts == null) {
        opts = {};
      }
      opts.detach = true;
      opts.attach = true;
      _ref = this.events;
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        methodName = _ref[key];
        if (this[methodName].toString().indexOf('[native code]') === -1) {
          this[methodName] = this[methodName].bind(this);
        }
        split = key.indexOf(' ');
        eventName = key.substr(0, split);
        selector = key.substr(split + 1);
        eventMethod = this[methodName];
        if (opts.detach === true) {
          this.$el.off(eventName, selector, eventMethod);
        }
        if (opts.attach === true) {
          this.$el.on(eventName, selector, eventMethod);
        }
      }
      return this;
    };

    View.prototype.destroy = function() {
      this.refreshEvents({
        detach: true,
        attach: false
      });
      this.$el.remove();
      return this;
    };

    return View;

  })();

  module.exports = {
    View: View
  };

}).call(this);

},{"extendonclass":7,"jquery":1}],9:[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.6.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.6.0",
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // moment internal properties
        momentProperties = {
            _isAMomentObject: null,
            _i : null,
            _f : null,
            _l : null,
            _strict : null,
            _isUTC : null,
            _offset : null,  // optional. Combine with _isUTC
            _pf : null,
            _lang : null  // optional
        },

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        parseTokenOrdinal = /\d{1,2}/,

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        function printMsg() {
            if (moment.suppressDeprecationWarnings === false &&
                    typeof console !== 'undefined' && console.warn) {
                console.warn("Deprecation warning: " + msg);
            }
        }
        return extend(function () {
            if (firstTime) {
                printMsg();
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function cloneMoment(m) {
        var result = {}, i;
        for (i in m) {
            if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
                result[i] = m[i];
            }
        }

        return result;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return  Object.prototype.toString.call(input) === '[object Date]' ||
                input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) { return parseTokenOneDigit; }
            /* falls through */
        case 'SS':
            if (strict) { return parseTokenTwoDigits; }
            /* falls through */
        case 'SSS':
            if (strict) { return parseTokenThreeDigits; }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return parseTokenOrdinal;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(input, 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gg':
        case 'gggg':
        case 'GG':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = input;
            }
            break;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate,
            yearToUse, fixYear, w, temp, lang, weekday, week;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            fixYear = function (val) {
                var intVal = parseInt(val, 10);
                return val ?
                  (val.length < 3 ? (intVal > 68 ? 1900 + intVal : 2000 + intVal) : intVal) :
                  (config._a[YEAR] == null ? moment().weekYear() : config._a[YEAR]);
            };

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                temp = dayOfYearFromWeeks(fixYear(w.GG), w.W || 1, w.E, 4, 1);
            }
            else {
                lang = getLangDefinition(config._l);
                weekday = w.d != null ?  parseWeekday(w.d, lang) :
                  (w.e != null ?  parseInt(w.e, 10) + lang._week.dow : 0);

                week = parseInt(w.w, 10) || 1;

                //if we're parsing 'd', then the low day numbers may be next week
                if (w.d != null && weekday < lang._week.dow) {
                    week++;
                }

                temp = dayOfYearFromWeeks(fixYear(w.gg), week, weekday, lang._week.doy, lang._week.dow);
            }

            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = config._a[YEAR] == null ? currentDate[YEAR] : config._a[YEAR];

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[HOUR] += toInt((config._tzm || 0) / 60);
        input[MINUTE] += toInt((config._tzm || 0) % 60);

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        }
        else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = cloneMoment(input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = lang;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
            "moment construction falls back to js Date. This is " +
            "discouraged and will be removed in upcoming major " +
            "release. Please refer to " +
            "https://github.com/moment/moment/issues/1407 for more info.",
            function (config) {
        config._d = new Date(config._i);
    });

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = lang;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null &&  obj.hasOwnProperty('_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function () {
            return this.zone(0);
        },

        local : function () {
            this.zone(0);
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var sod = makeAs(moment(), this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add({ d : input - day });
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: function (other) {
            other = moment.apply(null, arguments);
            return other < this ? this : other;
        },

        max: function (other) {
            other = moment.apply(null, arguments);
            return other > this ? this : other;
        },

        // keepTime = true means only change the timezone, without affecting
        // the local hour. So 5:31:26 +0300 --[zone(2, true)]--> 5:31:26 +0200
        // It is possible that 5:31:26 doesn't exist int zone +0200, so we
        // adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepTime) {
            var offset = this._offset || 0;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                this._offset = input;
                this._isUTC = true;
                if (offset !== input) {
                    if (!keepTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this._lang._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.lang().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);
            data.days = days % 30;

            months += absRound(days / 30);
            data.months = months % 12;

            years = absRound(months / 12);
            data.years = years;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            units = normalizeUnits(units);
            return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);
    moment.duration.fn.asMonths = function () {
        return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
    };


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    "Accessing Moment through the global scope is " +
                    "deprecated, and will be removed in an upcoming " +
                    "release.",
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === "function" && define.amd) {
        define("moment", function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
module.exports=require(7)
},{}],11:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var $, Pointer, extendOnClass, extendr,
    __hasProp = {}.hasOwnProperty;

  $ = this.$ || (typeof window !== "undefined" && window !== null ? window.$ : void 0) || ((function() {
    try {
      return typeof require === "function" ? require('jquery') : void 0;
    } catch (_error) {}
  })());

  extendr = require('extendr');

  extendOnClass = require('extendonclass').extendOnClass;

  Pointer = (function() {
    Pointer.extend = extendOnClass;

    Pointer.prototype.config = null;

    Pointer.prototype.bound = false;

    function Pointer(config) {
      this.elementChangeValueHandler = this.elementChangeValueHandler.bind(this);
      this.collectionAddHandler = this.collectionAddHandler.bind(this);
      this.collectionRemoveHandler = this.collectionRemoveHandler.bind(this);
      this.collectionResetHandler = this.collectionResetHandler.bind(this);
      this.modelChangeAttributeHandler = this.modelChangeAttributeHandler.bind(this);
      this.config = extendr.extend({}, {
        item: null,
        itemAttributes: null,
        viewClass: null,
        element: null,
        elementSetter: true,
        itemSetter: false
      }, config);
      this;
    }

    Pointer.prototype.get = function(attr) {
      return this.config[attr];
    };

    Pointer.prototype.getConfig = function() {
      return this.config;
    };

    Pointer.prototype.setConfig = function(config) {
      var key, value;
      if (config) {
        for (key in config) {
          if (!__hasProp.call(config, key)) continue;
          value = config[key];
          this.config[key] = value;
        }
      }
      return this;
    };

    Pointer.prototype.getItemType = function() {
      if (this.get('item').length != null) {
        return 'collection';
      } else {
        return 'model';
      }
    };

    Pointer.prototype.bind = function() {
      var $el, attribute, item, itemAttributes, _i, _len, _ref;
      if (this.bound === true) {
        return this;
      }
      this.bound = true;
      item = this.get('item');
      $el = this.get('element');
      if ((_ref = $el.data('pointer')) != null) {
        _ref.destroy();
      }
      $el.data('pointer', this);
      this.unbind();
      if (this.getItemType() === 'model') {
        if (itemAttributes = this.get('itemAttributes')) {
          for (_i = 0, _len = itemAttributes.length; _i < _len; _i++) {
            attribute = itemAttributes[_i];
            item.on('change:' + attribute, this.modelChangeAttributeHandler);
          }
          this.modelChangeAttributeHandler(item, null, {});
          if (this.get('itemSetter') === true) {
            $el.on('change', this.elementChangeValueHandler);
          }
        } else if (this.get('viewClass')) {
          this.createViewViaModel(item);
        }
      } else {
        item.on('add', this.collectionAddHandler).on('remove', this.collectionRemoveHandler).on('reset', this.collectionResetHandler);
        this.collectionResetHandler(item.models, item, {});
      }
      return this;
    };

    Pointer.prototype.unbind = function() {
      var attribute, item, itemAttributes, _i, _len;
      if (this.bound === false) {
        return this;
      }
      this.bound = false;
      item = this.get('item');
      itemAttributes = this.get('itemAttributes');
      if (itemAttributes) {
        for (_i = 0, _len = itemAttributes.length; _i < _len; _i++) {
          attribute = itemAttributes[_i];
          item.off('change:' + attribute, this.modelChangeAttributeHandler);
        }
      }
      item.off('add', this.collectionAddHandler).off('remove', this.collectionRemoveHandler).off('reset', this.collectionResetHandler);
      return this;
    };

    Pointer.prototype.destroy = function(opts) {
      var $el;
      this.unbind();
      $el = this.get('element');
      $el.children().each(function() {
        var $child, _ref;
        $child = $(this);
        return (_ref = $child.data('view')) != null ? _ref.destroy() : void 0;
      });
      return this;
    };

    Pointer.prototype.elementChangeValueHandler = function(opts) {
      var setter;
      setter = this.getSetter('itemSetter', this.defaultModelSetterFromElement);
      if (setter) {
        this.prepareEventOptions(opts);
        return setter(opts);
      } else {
        return true;
      }
    };

    Pointer.prototype.collectionAddHandler = function(model, collection, opts) {
      var setter;
      setter = this.getSetter('elementSetter', this.defaultElementSetterFromCollection);
      if (setter) {
        this.prepareEventOptions(extendr.extend(opts, {
          event: 'add',
          model: model,
          collection: collection
        }));
        return setter(opts);
      } else {
        return true;
      }
    };

    Pointer.prototype.collectionRemoveHandler = function(model, collection, opts) {
      var setter;
      setter = this.getSetter('elementSetter', this.defaultElementSetterFromCollection);
      if (setter) {
        this.prepareEventOptions(extendr.extend(opts, {
          event: 'remove',
          model: model,
          collection: collection
        }));
        return setter(opts);
      } else {
        return true;
      }
    };

    Pointer.prototype.collectionResetHandler = function(collection, opts) {
      var setter;
      setter = this.getSetter('elementSetter', this.defaultElementSetterFromCollection);
      if (setter) {
        this.prepareEventOptions(extendr.extend(opts, {
          event: 'reset',
          collection: collection
        }));
        return setter(opts);
      } else {
        return true;
      }
    };

    Pointer.prototype.modelChangeAttributeHandler = function(model, value, opts) {
      var setter;
      setter = this.getSetter('elementSetter', this.defaultElementSetterFromModel);
      if (setter) {
        if (value == null) {
          value = this.getFirstExistingAttributeValue();
        }
        this.prepareEventOptions(extendr.extend(opts, {
          event: 'change',
          model: model,
          value: value
        }));
        return setter(opts);
      } else {
        return true;
      }
    };

    Pointer.prototype.getSetter = function(name, defaultSetter) {
      var setter;
      setter = this.get(name);
      if (setter === true) {
        setter = defaultSetter.bind(this);
      }
      return setter || null;
    };

    Pointer.prototype.prepareEventOptions = function(opts) {
      opts.$el = opts.element = this.get('element');
      opts[this.getItemType()] = opts.item = this.get('item');
      return opts;
    };

    Pointer.prototype.defaultModelSetterFromElement = function(opts) {
      var attrs, element, model, primaryItemAttribute, value;
      model = opts.item;
      element = opts.element;
      primaryItemAttribute = this.get('itemAttributes')[0];
      value = element.val();
      attrs = {};
      attrs[primaryItemAttribute] = value;
      model.set(attrs);
      return true;
    };

    Pointer.prototype.defaultElementSetterFromModel = function(opts) {
      if (opts.value == null) {
        opts.value = this.getFirstExistingAttributeValue();
      }
      if (opts.$el.is(':input')) {
        opts.$el.val(opts.value);
      } else {
        opts.$el.text(opts.value);
      }
      return true;
    };

    Pointer.prototype.defaultElementSetterFromCollection = function(opts) {
      var $el, model, pointer, _i, _len, _ref;
      pointer = this;
      switch (opts.event) {
        case 'add':
          this.createViewViaModel(opts.model);
          break;
        case 'remove':
          $el = this.getElementViaModel(opts.model);
          this.destroyViewViaElement($el);
          break;
        case 'reset':
          this.get('element').children().each(function() {
            return pointer.destroyViewViaElement($(this));
          });
          _ref = opts.collection.models;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            model = _ref[_i];
            this.createViewViaModel(model);
          }
      }
      return true;
    };

    Pointer.prototype.createViewViaModel = function(model) {
      var $el, view, viewClass;
      if (model == null) {
        model = this.get('item');
      }
      viewClass = this.get('viewClass');
      $el = this.get('element');
      view = new viewClass({
        item: model,
        model: model
      });
      view.$el.data('view', view).data('model', model).addClass("model-" + model.cid);
      view.render().$el.appendTo($el);
      return view;
    };

    Pointer.prototype.destroyViewViaElement = function($el) {
      var _ref;
      if ((_ref = $el.data('view')) != null) {
        _ref.destroy();
      }
      return this;
    };

    Pointer.prototype.getFirstExistingAttributeValue = function() {
      var attribute, item, itemAttributes, value, _i, _len;
      item = this.get('item');
      itemAttributes = this.get('itemAttributes');
      value = null;
      for (_i = 0, _len = itemAttributes.length; _i < _len; _i++) {
        attribute = itemAttributes[_i];
        if ((value = item.get(attribute))) {
          break;
        }
      }
      return value;
    };

    Pointer.prototype.getElementViaModel = function(model) {
      var $el, _ref;
      if (model == null) {
        model = this.get('item');
      }
      $el = this.get('element');
      return (_ref = $el.find(".model-" + model.cid + ":first")) != null ? _ref : null;
    };

    Pointer.prototype.getViewViaModel = function(model) {
      var $el, _ref;
      $el = this.getElementViaModel(model);
      return (_ref = $el != null ? $el.data('view') : void 0) != null ? _ref : null;
    };

    Pointer.prototype.getElement = function() {
      return this.getElementViaModel();
    };

    Pointer.prototype.getView = function() {
      return this.getElement().data('view');
    };

    return Pointer;

  })();

  module.exports = {
    Pointer: Pointer
  };

}).call(this);

},{"extendonclass":10,"extendr":6,"jquery":1}],12:[function(require,module,exports){
(function() {
  var Backbone, Criteria, Hash, Pill, Query, QueryCollection, queryEngine, util, _ref,
    __hasProp = {}.hasOwnProperty,
    __slice = [].slice,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Backbone = this.Backbone || (typeof window !== "undefined" && window !== null ? window.Backbone : void 0) || ((function() {
    try {
      return typeof require === "function" ? require('backbone') : void 0;
    } catch (_error) {}
  })()) || ((function() {
    try {
      return typeof require === "function" ? require('exoskeleton') : void 0;
    } catch (_error) {}
  })()) || null;

  util = {
    toString: function(value) {
      return Object.prototype.toString.call(value);
    },
    isPlainObject: function(value) {
      return util.isObject(value) && value.__proto__ === Object.prototype;
    },
    isObject: function(value) {
      return value && typeof value === 'object';
    },
    isError: function(value) {
      return value instanceof Error;
    },
    isDate: function(value) {
      return util.toString(value) === '[object Date]';
    },
    isArguments: function(value) {
      return util.toString(value) === '[object Arguments]';
    },
    isFunction: function(value) {
      return util.toString(value) === '[object Function]';
    },
    isRegExp: function(value) {
      return util.toString(value) === '[object RegExp]';
    },
    isArray: function(value) {
      if (Array.isArray != null) {
        return Array.isArray(value);
      } else {
        return util.toString(value) === '[object Array]';
      }
    },
    isNumber: function(value) {
      return typeof value === 'number' || util.toString(value) === '[object Number]';
    },
    isString: function(value) {
      return typeof value === 'string' || util.toString(value) === '[object String]';
    },
    isBoolean: function(value) {
      return value === true || value === false || util.toString(value) === '[object Boolean]';
    },
    isNull: function(value) {
      return value === null;
    },
    isUndefined: function(value) {
      return typeof value === 'undefined';
    },
    isDefined: function(value) {
      return typeof value !== 'undefined';
    },
    isEmpty: function(value) {
      return value != null;
    },
    isObjectEmpty: function(object) {
      var empty, key, value;
      empty = true;
      for (key in object) {
        if (!__hasProp.call(object, key)) continue;
        value = object[key];
        empty = false;
        break;
      }
      return empty;
    },
    isComparable: function(value) {
      return util.isNumber(value) || util.isDate(value);
    },
    isEqual: function(value1, value2) {
      return JSON.stringify(value1) === JSON.stringify(value2);
    },
    clone: function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return util.shallowExtendPlainObjects.apply(util, [{}].concat(__slice.call(args)));
    },
    extend: function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return util.shallowExtendPlainObjects.apply(util, args);
    },
    shallowExtendPlainObjects: function() {
      var key, obj, objs, target, value, _i, _len;
      target = arguments[0], objs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      for (_i = 0, _len = objs.length; _i < _len; _i++) {
        obj = objs[_i];
        obj || (obj = {});
        for (key in obj) {
          if (!__hasProp.call(obj, key)) continue;
          value = obj[key];
          target[key] = value;
        }
      }
      return target;
    },
    get: function(obj, key) {
      var result;
      if (obj.get != null) {
        result = obj.get(key);
      } else {
        result = obj[key];
      }
      return result;
    },
    safeRegex: function(str) {
      if (str === false) {
        return 'false';
      } else if (str === true) {
        return 'true';
      } else if (str === null) {
        return 'null';
      } else {
        return (str || '').replace('(.)', '\\$1');
      }
    },
    createRegex: function(str) {
      return new RegExp(str, 'ig');
    },
    createSafeRegex: function(str) {
      return util.createRegex(util.safeRegex(str));
    },
    toArray: function(value) {
      var item, key, result, valueExists;
      result = [];
      valueExists = typeof value !== 'undefined';
      if (valueExists) {
        if (util.isArray(value)) {
          result = value.slice();
        } else if (util.isObject(value)) {
          for (key in value) {
            if (!__hasProp.call(value, key)) continue;
            item = value[key];
            result.push(item);
          }
        } else {
          result.push(value);
        }
      }
      return result;
    },
    toArrayGroup: function(value) {
      var item, key, obj, result, valueExists;
      result = [];
      valueExists = typeof value !== 'undefined';
      if (valueExists) {
        if (util.isArray(value)) {
          result = value.slice();
        } else if (util.isObject(value)) {
          for (key in value) {
            if (!__hasProp.call(value, key)) continue;
            item = value[key];
            obj = {};
            obj[key] = item;
            result.push(obj);
          }
        } else {
          result.push(value);
        }
      }
      return result;
    },
    generateComparator: function(input) {
      var generateFunction;
      generateFunction = function(comparator) {
        if (!comparator) {
          return null;
        } else if (util.isFunction(comparator)) {
          return comparator;
        } else if (util.isArray(comparator)) {
          return function(a, b) {
            var comparison, key, value, _i, _len;
            comparison = 0;
            for (key = _i = 0, _len = comparator.length; _i < _len; key = ++_i) {
              value = comparator[key];
              comparison = generateFunction(value)(a, b);
              if (comparison) {
                return comparison;
              }
            }
            return comparison;
          };
        } else if (util.isObject(comparator)) {
          return function(a, b) {
            var aValue, bValue, comparison, key, value;
            comparison = 0;
            for (key in comparator) {
              if (!__hasProp.call(comparator, key)) continue;
              value = comparator[key];
              aValue = util.get(a, key);
              bValue = util.get(b, key);
              if (aValue === bValue) {
                comparison = 0;
              } else if (aValue < bValue) {
                comparison = -1;
              } else if (aValue > bValue) {
                comparison = 1;
              }
              if (value === -1) {
                comparison *= -1;
              }
              if (comparison) {
                return comparison;
              }
            }
            return comparison;
          };
        } else {
          throw new Error('Unknown comparator type');
        }
      };
      return generateFunction(input);
    }
  };

  Hash = (function(_super) {
    __extends(Hash, _super);

    function Hash(value) {
      var item, key, _i, _len;
      value = util.toArray(value);
      for (key = _i = 0, _len = value.length; _i < _len; key = ++_i) {
        item = value[key];
        this.push(item);
      }
    }

    Hash.prototype.hasIn = function(options) {
      var value, _i, _len;
      options = util.toArray(options);
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        value = this[_i];
        if (__indexOf.call(options, value) >= 0) {
          return true;
        }
      }
      return false;
    };

    Hash.prototype.hasAll = function(options) {
      var empty, pass, value, _i, _len;
      options = util.toArray(options);
      empty = true;
      pass = true;
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        value = this[_i];
        empty = false;
        if (__indexOf.call(options, value) < 0) {
          pass = false;
        }
      }
      if (empty) {
        pass = false;
      }
      return pass;
    };

    Hash.prototype.isSame = function(options) {
      var pass;
      options = util.toArray(options);
      pass = this.sort().join() === options.sort().join();
      return pass;
    };

    return Hash;

  })(Array);

  if (Backbone == null) {
    QueryCollection = null;
  } else {
    QueryCollection = (function(_super) {
      __extends(QueryCollection, _super);

      function QueryCollection() {
        this.onParentReset = __bind(this.onParentReset, this);
        this.onParentAdd = __bind(this.onParentAdd, this);
        this.onParentRemove = __bind(this.onParentRemove, this);
        this.onParentChange = __bind(this.onParentChange, this);
        this.onChange = __bind(this.onChange, this);
        _ref = QueryCollection.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      QueryCollection.prototype.model = Backbone.Model;

      QueryCollection.prototype.initialize = function(models, options) {
        var key, me, value, _ref1;
        me = this;
        if (this.options == null) {
          this.options = {};
        }
        _ref1 = Criteria.prototype;
        for (key in _ref1) {
          if (!__hasProp.call(_ref1, key)) continue;
          value = _ref1[key];
          if (this[key] == null) {
            this[key] = value;
          }
        }
        if (this.comparator != null) {
          this.setComparator(this.comparator);
        }
        this.applyCriteriaOptions(options);
        if (options != null) {
          if (options.parentCollection != null) {
            this.options.parentCollection = options.parentCollection;
          }
          if (options.live != null) {
            this.options.live = options.live;
          }
          this.live();
        }
        return this;
      };

      QueryCollection.prototype.getComparator = function() {
        return this.comparator;
      };

      QueryCollection.prototype.setComparator = function(comparator) {
        comparator = util.generateComparator(comparator);
        this.comparator = comparator;
        return this;
      };

      QueryCollection.prototype.createChildCollection = function(models, options) {
        var collection;
        options || (options = {});
        options.parentCollection = this;
        if (options.collection == null) {
          options.collection = this.collection || QueryCollection;
        }
        if (options.comparator == null) {
          options.comparator = options.collection.prototype.comparator || this.comparator;
        }
        collection = new options.collection(models, options);
        return collection;
      };

      QueryCollection.prototype.createLiveChildCollection = function(models, options) {
        var collection;
        options || (options = {});
        options.live = true;
        collection = this.createChildCollection(models, options);
        return collection;
      };

      QueryCollection.prototype.hasParentCollection = function() {
        return this.options.parentCollection != null;
      };

      QueryCollection.prototype.getParentCollection = function() {
        return this.options.parentCollection;
      };

      QueryCollection.prototype.setParentCollection = function(parentCollection, skipCheck) {
        if (!skipCheck && this.options.parentCollection === parentCollection) {
          return this;
        }
        this.options.parentCollection = parentCollection;
        this.live();
        return this;
      };

      QueryCollection.prototype.hasModel = function(model) {
        var exists, _ref1, _ref2;
        model || (model = {});
        if ((model.id != null) && this.get(model.id)) {
          exists = true;
        } else if ((model.cid != null) && ((_ref1 = (_ref2 = this._byCid) != null ? _ref2[model.cid] : void 0) != null ? _ref1 : this.get(model.cid))) {
          exists = true;
        } else {
          exists = false;
        }
        return exists;
      };

      QueryCollection.prototype.safeRemove = function(model) {
        var exists;
        exists = this.hasModel(model);
        if (exists) {
          this.remove(model);
        }
        return this;
      };

      QueryCollection.prototype.safeAdd = function(model) {
        var exists;
        exists = this.hasModel(model);
        if (!exists) {
          this.add(model);
        }
        return this;
      };

      QueryCollection.prototype.sortCollection = function(comparator) {
        if (comparator) {
          comparator = util.generateComparator(comparator);
          this.models.sort(comparator);
        } else {
          comparator = this.getComparator();
          if (comparator) {
            this.models.sort(comparator);
          } else {
            throw new Error('You need a comparator to sort');
          }
        }
        return this;
      };

      QueryCollection.prototype.sortArray = function(comparator) {
        var arr;
        arr = this.toJSON();
        if (comparator) {
          comparator = util.generateComparator(comparator);
          arr.sort(comparator);
        } else {
          comparator = this.getComparator();
          if (comparator) {
            arr.sort(comparator);
          } else {
            throw new Error('You need a comparator to sort');
          }
        }
        return arr;
      };

      QueryCollection.prototype.findAll = function() {
        var args, collection, comparator, criteriaOptions, paging, query;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (args.length) {
          if (args.length === 1 && args[0] instanceof Criteria) {
            criteriaOptions = args[0].options;
          } else {
            query = args[0], comparator = args[1], paging = args[2];
            criteriaOptions = {
              comparator: comparator,
              paging: paging,
              queries: {
                find: query
              }
            };
          }
        } else {
          criteriaOptions = null;
        }
        collection = this.createChildCollection([], criteriaOptions).query();
        return collection;
      };

      QueryCollection.prototype.findAllLive = function() {
        var args, collection, comparator, criteriaOptions, paging, query;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (args.length) {
          if (args.length === 1 && args[0] instanceof Criteria) {
            criteriaOptions = args[0].options;
          } else {
            query = args[0], comparator = args[1], paging = args[2];
            criteriaOptions = {
              comparator: comparator,
              paging: paging,
              queries: {
                find: query
              }
            };
          }
        } else {
          criteriaOptions = null;
        }
        collection = this.createLiveChildCollection([], criteriaOptions).query();
        return collection;
      };

      QueryCollection.prototype.findOne = function() {
        var args, comparator, criteriaOptions, paging, passed, query;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (args.length) {
          if (args.length === 1 && args[0] instanceof Criteria) {
            criteriaOptions = args[0].options;
          } else {
            query = args[0], comparator = args[1], paging = args[2];
            criteriaOptions = {
              comparator: comparator,
              paging: paging,
              queries: {
                find: query
              }
            };
          }
        } else {
          criteriaOptions = null;
        }
        passed = this.testModels(this.models, criteriaOptions);
        if ((passed != null ? passed.length : void 0) !== 0) {
          return passed[0];
        } else {
          return null;
        }
      };

      QueryCollection.prototype.query = function() {
        var args, criteria, passed;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (args.length === 1) {
          if (args[0] instanceof Criteria) {
            criteria = args[0].options;
          } else {
            criteria = {
              paging: args[0]
            };
          }
        }
        passed = this.queryModels(criteria);
        this.reset(passed);
        return this;
      };

      QueryCollection.prototype.queryModels = function() {
        var args, collection, criteriaOptions, models, passed;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        criteriaOptions = this.extractCriteriaOptions.apply(this, args);
        collection = this.getParentCollection() || this;
        models = collection.models;
        passed = this.testModels(models, criteriaOptions);
        return passed;
      };

      QueryCollection.prototype.queryArray = function() {
        var args, model, passed, result, _i, _len;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        result = [];
        passed = this.queryModels.apply(this, args);
        for (_i = 0, _len = passed.length; _i < _len; _i++) {
          model = passed[_i];
          result.push(model.toJSON());
        }
        return result;
      };

      QueryCollection.prototype.live = function(enabled) {
        var parentCollection;
        if (enabled == null) {
          enabled = this.options.live;
        }
        this.options.live = enabled;
        if (enabled) {
          this.on('change', this.onChange);
        } else {
          this.off('change', this.onChange);
        }
        parentCollection = this.getParentCollection();
        if (parentCollection != null) {
          if (enabled) {
            parentCollection.on('change', this.onParentChange);
            parentCollection.on('remove', this.onParentRemove);
            parentCollection.on('add', this.onParentAdd);
            parentCollection.on('reset', this.onParentReset);
          } else {
            parentCollection.off('change', this.onParentChange);
            parentCollection.off('remove', this.onParentRemove);
            parentCollection.off('add', this.onParentAdd);
            parentCollection.off('reset', this.onParentReset);
          }
        }
        return this;
      };

      QueryCollection.prototype.add = function(models, options) {
        var model, passedModels, _i, _len;
        options = options ? util.clone(options) : {};
        models = util.isArray(models) ? models.slice() : [models];
        passedModels = [];
        for (_i = 0, _len = models.length; _i < _len; _i++) {
          model = models[_i];
          model = this._prepareModel(model, options);
          if (model && this.test(model)) {
            passedModels.push(model);
          }
        }
        Backbone.Collection.prototype.add.apply(this, [passedModels, options]);
        return this;
      };

      QueryCollection.prototype.create = function(model, options) {
        options = options ? util.clone(options) : {};
        model = this._prepareModel(model, options);
        if (model && this.test(model)) {
          Backbone.Collection.prototype.create.apply(this, [model, options]);
        }
        return this;
      };

      QueryCollection.prototype.onChange = function(model) {
        var pass;
        if (this.getPaging()) {
          return this.query();
        }
        pass = this.test(model);
        if (!pass) {
          this.safeRemove(model);
        } else {
          if (this.comparator) {
            this.sortCollection();
          }
        }
        return this;
      };

      QueryCollection.prototype.onParentChange = function(model) {
        var pass;
        if (this.getPaging()) {
          return this.query();
        }
        pass = this.test(model) && this.getParentCollection().hasModel(model);
        if (pass) {
          this.safeAdd(model);
        } else {
          this.safeRemove(model);
        }
        return this;
      };

      QueryCollection.prototype.onParentRemove = function(model) {
        if (this.getPaging()) {
          return this.query();
        }
        this.safeRemove(model);
        return this;
      };

      QueryCollection.prototype.onParentAdd = function(model) {
        if (this.getPaging()) {
          return this.query();
        }
        this.safeAdd(model);
        return this;
      };

      QueryCollection.prototype.onParentReset = function(model) {
        this.reset(this.getParentCollection().models);
        return this;
      };

      return QueryCollection;

    })(Backbone.Collection);
  }

  Criteria = (function() {
    function Criteria() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.applyCriteriaOptions = __bind(this.applyCriteriaOptions, this);
      this.applyCriteriaOptions.apply(this, args);
      this;
    }

    Criteria.prototype.extractCriteriaOptions = function() {
      var args, comparator, criteriaOptions, paging, query;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (args.length === 1) {
        if (args[0] instanceof Criteria) {
          criteriaOptions = args[0].options;
        } else if (args[0]) {
          criteriaOptions = args[0];
        } else {
          criteriaOptions = null;
        }
      } else if (args.length > 1) {
        query = args[0], comparator = args[1], paging = args[2];
        criteriaOptions = {
          queries: {
            find: query || null
          },
          comparator: comparator,
          paging: paging
        };
      } else {
        criteriaOptions = null;
      }
      return criteriaOptions;
    };

    Criteria.prototype.applyCriteriaOptions = function() {
      var args, criteriaOptions, _base, _base1, _base2, _base3, _base4, _base5;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.options == null) {
        this.options = {};
      }
      if ((_base = this.options).filters == null) {
        _base.filters = {};
      }
      if ((_base1 = this.options).queries == null) {
        _base1.queries = {};
      }
      if ((_base2 = this.options).pills == null) {
        _base2.pills = {};
      }
      if ((_base3 = this.options).paging == null) {
        _base3.paging = null;
      }
      if ((_base4 = this.options).searchString == null) {
        _base4.searchString = null;
      }
      if ((_base5 = this.options).comparator == null) {
        _base5.comparator = null;
      }
      criteriaOptions = this.extractCriteriaOptions.apply(this, args);
      if (criteriaOptions) {
        if (criteriaOptions.filters != null) {
          this.setFilters(criteriaOptions.filters);
        }
        if (criteriaOptions.queries != null) {
          this.setQueries(criteriaOptions.queries);
        }
        if (criteriaOptions.pills != null) {
          this.setPills(criteriaOptions.pills);
        }
        if (criteriaOptions.paging != null) {
          this.setPaging(criteriaOptions.paging);
        }
        if (criteriaOptions.searchString != null) {
          this.setSearchString(criteriaOptions.searchString);
        }
        if (criteriaOptions.comparator != null) {
          this.setComparator(criteriaOptions.comparator);
        }
      }
      return this;
    };

    Criteria.prototype.getPaging = function() {
      return this.options.paging;
    };

    Criteria.prototype.setPaging = function(paging) {
      paging = util.extend(this.getPaging() || {}, paging || {});
      paging.page || (paging.page = null);
      paging.limit || (paging.limit = null);
      paging.offset || (paging.offset = null);
      if (paging.page || paging.limit || paging.offset) {
        this.options.paging = paging;
      } else {
        this.options.paging = null;
      }
      return this;
    };

    Criteria.prototype.getComparator = function() {
      return this.options.comparator;
    };

    Criteria.prototype.setComparator = function(comparator) {
      comparator = util.generateComparator(comparator);
      this.options.comparator = comparator;
      return this;
    };

    Criteria.prototype.getFilter = function(key) {
      return this.options.filters[key];
    };

    Criteria.prototype.getFilters = function() {
      return this.options.filters;
    };

    Criteria.prototype.setFilters = function(filters) {
      var key, value;
      filters || (filters = {});
      for (key in filters) {
        if (!__hasProp.call(filters, key)) continue;
        value = filters[key];
        this.setFilter(key, value);
      }
      return this;
    };

    Criteria.prototype.setFilter = function(name, value) {
      var filters;
      if (typeof value === 'undefined') {
        throw new Error('QueryCollection::setFilter was called without both arguments');
      }
      filters = this.options.filters;
      if (value != null) {
        filters[name] = value;
      } else if (filters[name] != null) {
        delete filters[name];
      }
      return this;
    };

    Criteria.prototype.getQuery = function(key) {
      return this.options.queries[key];
    };

    Criteria.prototype.getQueries = function() {
      return this.options.queries;
    };

    Criteria.prototype.setQueries = function(queries) {
      var key, value;
      queries || (queries = {});
      for (key in queries) {
        if (!__hasProp.call(queries, key)) continue;
        value = queries[key];
        this.setQuery(key, value);
      }
      return this;
    };

    Criteria.prototype.setQuery = function(name, value) {
      var queries;
      if (typeof value === 'undefined') {
        throw new Error('QueryCollection::setQuery was called without both arguments');
      }
      queries = this.options.queries;
      if (value != null) {
        if (!(value instanceof Query)) {
          value = new Query(value);
        }
        queries[name] = value;
      } else if (queries[name] != null) {
        delete queries[name];
      }
      return this;
    };

    Criteria.prototype.getPill = function(key) {
      return this.options.pills[key];
    };

    Criteria.prototype.getPills = function() {
      return this.options.pills;
    };

    Criteria.prototype.setPills = function(pills) {
      var key, value;
      pills || (pills = {});
      for (key in pills) {
        if (!__hasProp.call(pills, key)) continue;
        value = pills[key];
        this.setPill(key, value);
      }
      return this;
    };

    Criteria.prototype.setPill = function(name, value) {
      var pills, searchString;
      if (typeof value === 'undefined') {
        throw new Error('QueryCollection::setPill was called without both arguments');
      }
      pills = this.getPills();
      searchString = this.getSearchString();
      if (value != null) {
        if (!(value instanceof Pill)) {
          value = new Pill(value);
        }
        if (searchString) {
          value.setSearchString(searchString);
        }
        pills[name] = value;
      } else if (pills[name] != null) {
        delete pills[name];
      }
      return this;
    };

    Criteria.prototype.getCleanedSearchString = function() {
      return this.options.cleanedSearchString;
    };

    Criteria.prototype.getSearchString = function() {
      return this.options.searchString;
    };

    Criteria.prototype.setSearchString = function(searchString) {
      var cleanedSearchString, pill, pillName, pills;
      pills = this.options.pills;
      cleanedSearchString = searchString;
      for (pillName in pills) {
        if (!__hasProp.call(pills, pillName)) continue;
        pill = pills[pillName];
        cleanedSearchString = pill.setSearchString(cleanedSearchString);
      }
      this.options.searchString = searchString;
      this.options.cleanedSearchString = cleanedSearchString;
      return this;
    };

    Criteria.prototype.test = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.testModel.apply(this, args);
    };

    Criteria.prototype.testModel = function(model, criteriaOptions) {
      var passed;
      if (criteriaOptions == null) {
        criteriaOptions = {};
      }
      passed = this.testQueries(model, criteriaOptions.queries) && this.testFilters(model, criteriaOptions.filters) && this.testPills(model, criteriaOptions.pills);
      return passed;
    };

    Criteria.prototype.testModels = function(models, criteriaOptions) {
      var comparator, finish, me, model, paging, pass, passed, start, _i, _len;
      if (criteriaOptions == null) {
        criteriaOptions = {};
      }
      me = this;
      passed = [];
      paging = criteriaOptions.paging, comparator = criteriaOptions.comparator;
      if (paging == null) {
        paging = this.getPaging();
      }
      if (comparator != null) {
        if (comparator) {
          comparator = util.generateComparator(comparator);
        }
      } else {
        comparator = this.getComparator();
      }
      for (_i = 0, _len = models.length; _i < _len; _i++) {
        model = models[_i];
        pass = me.testModel(model, criteriaOptions);
        if (pass) {
          passed.push(model);
        }
      }
      if (comparator) {
        passed.sort(comparator);
      }
      if (paging) {
        start = paging.offset || 0;
        if ((paging.limit != null) && paging.limit > 0) {
          start = start + paging.limit * ((paging.page || 1) - 1);
          finish = start + paging.limit;
          passed = passed.slice(start, finish);
        } else if (start) {
          passed = passed.slice(start);
        }
      }
      return passed;
    };

    Criteria.prototype.testQueries = function(model, queries) {
      var passed, query, queryName;
      passed = true;
      if (queries == null) {
        queries = this.getQueries();
      }
      if (queries) {
        for (queryName in queries) {
          if (!__hasProp.call(queries, queryName)) continue;
          query = queries[queryName];
          if (!(query instanceof Query)) {
            query = new Query(query);
            queries[queryName] = query;
          }
          if (query.test(model) === false) {
            passed = false;
            return false;
          }
        }
      }
      return passed;
    };

    Criteria.prototype.testFilters = function(model, filters) {
      var cleanedSearchString, filter, filterName, passed;
      passed = true;
      cleanedSearchString = this.getCleanedSearchString();
      if (filters == null) {
        filters = this.getFilters();
      }
      if (filters) {
        for (filterName in filters) {
          if (!__hasProp.call(filters, filterName)) continue;
          filter = filters[filterName];
          if (filter(model, cleanedSearchString) === false) {
            passed = false;
            return false;
          }
        }
      }
      return passed;
    };

    Criteria.prototype.testPills = function(model, pills) {
      var passed, pill, pillName, searchString;
      passed = true;
      searchString = this.getSearchString();
      if (pills == null) {
        pills = this.getPills();
      }
      if ((searchString != null) && pills) {
        for (pillName in pills) {
          if (!__hasProp.call(pills, pillName)) continue;
          pill = pills[pillName];
          if (!(pill instanceof Pill)) {
            pill = new Pill(query);
            pill.setSearchString(searchString);
            pills[pillName] = pill;
          }
          if (pill.test(model) === false) {
            passed = false;
            return false;
          }
        }
      }
      return passed;
    };

    return Criteria;

  })();

  Pill = (function() {
    Pill.prototype.callback = null;

    Pill.prototype.regex = null;

    Pill.prototype.prefixes = null;

    Pill.prototype.searchString = null;

    Pill.prototype.values = null;

    Pill.prototype.logicalOperator = 'OR';

    function Pill(pill) {
      var prefix, regexString, safePrefixes, safePrefixesStr, _i, _len, _ref1;
      pill || (pill = {});
      this.callback = pill.callback;
      this.prefixes = pill.prefixes;
      if (pill.logicalOperator != null) {
        this.logicalOperator = pill.logicalOperator;
      }
      safePrefixes = [];
      _ref1 = this.prefixes;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        prefix = _ref1[_i];
        safePrefixes.push(util.safeRegex(prefix));
      }
      safePrefixesStr = safePrefixes.join('|');
      regexString = "(" + safePrefixesStr + ")\\s*('[^']+'|\\\"[^\\\"]+\\\"|[^'\\\"\\s]\\S*)";
      this.regex = util.createRegex(regexString);
      this;
    }

    Pill.prototype.setSearchString = function(searchString) {
      var cleanedSearchString, match, value, values;
      cleanedSearchString = searchString;
      values = [];
      while (match = this.regex.exec(searchString)) {
        value = match[2].trim().replace(/(^['"]\s*|\s*['"]$)/g, '');
        switch (value) {
          case 'true':
          case 'TRUE':
            value = true;
            break;
          case 'false':
          case 'FALSE':
            value = false;
            break;
          case 'null':
          case 'NULL':
            value = null;
        }
        values.push(value);
        cleanedSearchString = cleanedSearchString.replace(match[0], '').trim();
      }
      this.searchString = searchString;
      this.values = values;
      return cleanedSearchString;
    };

    Pill.prototype.test = function(model) {
      var pass, value, _i, _j, _len, _len1, _ref1, _ref2, _ref3;
      if ((_ref1 = this.values) != null ? _ref1.length : void 0) {
        if (this.logicalOperator === 'OR') {
          pass = false;
          _ref2 = this.values;
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            value = _ref2[_i];
            pass = this.callback(model, value);
            if (pass) {
              break;
            }
          }
        } else if (this.logicalOperator === 'AND') {
          pass = false;
          _ref3 = this.values;
          for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
            value = _ref3[_j];
            pass = this.callback(model, value);
            if (!pass) {
              break;
            }
          }
        } else {
          throw new Error('Unkown logical operator type');
        }
      } else {
        pass = null;
      }
      return pass;
    };

    return Pill;

  })();

  Query = (function() {
    Query.prototype.source = null;

    Query.prototype.compiledSelectors = null;

    Query.prototype.selectors = {
      '$or': {
        compile: function(opts) {
          var queries, query, queryGroup, querySource, _i, _len;
          queries = [];
          queryGroup = util.toArrayGroup(opts.selectorValue);
          if (!queryGroup.length) {
            throw new Error("Query called with an empty " + selectorName + " statement");
          }
          for (_i = 0, _len = queryGroup.length; _i < _len; _i++) {
            querySource = queryGroup[_i];
            query = new Query(querySource);
            queries.push(query);
          }
          return {
            queries: queries
          };
        },
        test: function(opts) {
          var query, _i, _len, _ref1;
          _ref1 = opts.queries;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            query = _ref1[_i];
            if (query.test(opts.model)) {
              return true;
            }
          }
          return false;
        }
      },
      '$nor': {
        compile: function(opts) {
          return opts.selector('$or', opts);
        },
        test: function(opts) {
          return !opts.selector('$or', opts);
        }
      },
      '$and': {
        compile: function(opts) {
          return opts.selector('$or', opts);
        },
        test: function(opts) {
          var query, _i, _len, _ref1;
          _ref1 = opts.queries;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            query = _ref1[_i];
            if (query.test(opts.model) === false) {
              return false;
            }
          }
          return true;
        }
      },
      '$not': {
        compile: function(opts) {
          return opts.selector('$and', opts);
        },
        test: function(opts) {
          return !opts.selector('$and', opts);
        }
      },
      'string': {
        test: function(opts) {
          return opts.modelValueExists && opts.modelValue === opts.selectorValue;
        }
      },
      'number': {
        test: function(opts) {
          return opts.selector('string', opts);
        }
      },
      'boolean': {
        test: function(opts) {
          return opts.selector('string', opts);
        }
      },
      'array': {
        test: function(opts) {
          return opts.modelValueExists && (new Hash(opts.modelValue)).isSame(opts.selectorValue);
        }
      },
      'date': {
        test: function(opts) {
          return opts.modelValueExists && opts.modelValue.toString() === opts.selectorValue.toString();
        }
      },
      'regexp': {
        test: function(opts) {
          return opts.modelValueExists && opts.selectorValue.test(opts.modelValue);
        }
      },
      'null': {
        test: function(opts) {
          return opts.modelValue === opts.selectorValue;
        }
      },
      'model': {
        test: function(opts) {
          var _ref1, _ref2;
          return (((_ref1 = opts.modelValue) != null ? _ref1.cid : void 0) || opts.modelValue) === (((_ref2 = opts.selectorValue) != null ? _ref2.cid : void 0) || opts.selectorValue);
        }
      },
      'collection': {
        test: function(opts) {
          return opts.modelValue === opts.selectorValue;
        }
      },
      '$beginsWith': {
        test: function(opts) {
          var beginsWithParts, beginsWithValue, _i, _len;
          if (opts.selectorValue && opts.modelValueExists && util.isString(opts.modelValue)) {
            beginsWithParts = util.toArray(opts.selectorValue);
            for (_i = 0, _len = beginsWithParts.length; _i < _len; _i++) {
              beginsWithValue = beginsWithParts[_i];
              if (opts.modelValue.substr(0, beginsWithValue.length) === beginsWithValue) {
                return true;
                break;
              }
            }
          }
          return false;
        }
      },
      '$startsWith': {
        test: function(opts) {
          return opts.selector('$beginsWith', opts);
        }
      },
      '$endsWith': {
        test: function(opts) {
          var endsWithParts, endsWithValue, _i, _len;
          if (opts.selectorValue && opts.modelValueExists && util.isString(opts.modelValue)) {
            endsWithParts = util.toArray(opts.selectorValue);
            for (_i = 0, _len = endsWithParts.length; _i < _len; _i++) {
              endsWithValue = endsWithParts[_i];
              if (opts.modelValue.substr(endsWithValue.length * -1) === endsWithValue) {
                return true;
                break;
              }
            }
          }
          return false;
        }
      },
      '$finishesWith': {
        test: function(opts) {
          return opts.selector('$endsWith', opts);
        }
      },
      '$all': {
        test: function(opts) {
          if ((opts.selectorValue != null) && opts.modelValueExists) {
            if ((new Hash(opts.modelValue)).hasAll(opts.selectorValue)) {
              return true;
            }
          }
          return false;
        }
      },
      '$in': {
        test: function(opts) {
          if ((opts.selectorValue != null) && opts.modelValueExists) {
            if ((new Hash(opts.modelValue)).hasIn(opts.selectorValue) || (new Hash(opts.selectorValue)).hasIn(opts.modelValue)) {
              return true;
            }
          }
          return false;
        }
      },
      '$nin': {
        test: function(opts) {
          if ((opts.selectorValue != null) && opts.modelValueExists) {
            if ((new Hash(opts.modelValue)).hasIn(opts.selectorValue) === false && (new Hash(opts.selectorValue)).hasIn(opts.modelValue) === false) {
              return true;
            }
          }
          return false;
        }
      },
      '$has': {
        test: function(opts) {
          if (opts.modelValueExists) {
            if ((new Hash(opts.modelValue)).hasIn(opts.selectorValue)) {
              return true;
            }
          }
          return false;
        }
      },
      '$hasAll': {
        test: function(opts) {
          if (opts.modelValueExists) {
            if ((new Hash(opts.modelValue)).hasIn(opts.selectorValue)) {
              return true;
            }
          }
          return false;
        }
      },
      '$size': {
        test: function(opts) {
          if (opts.modelValue.length != null) {
            if (opts.modelValue.length === opts.selectorValue) {
              return true;
            }
          }
          return false;
        }
      },
      '$length': {
        test: function(opts) {
          return opts.selector('$size', opts);
        }
      },
      '$type': {
        test: function(opts) {
          if (typeof opts.modelValue === opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$like': {
        test: function(opts) {
          if (util.isString(opts.modelValue) && opts.modelValue.toLowerCase().indexOf(opts.selectorValue.toLowerCase()) !== -1) {
            return true;
          }
          return false;
        }
      },
      '$likeSensitive': {
        test: function(opts) {
          if (util.isString(opts.modelValue) && opts.modelValue.indexOf(opts.selectorValue) !== -1) {
            return true;
          }
          return false;
        }
      },
      '$exists': {
        test: function(opts) {
          if (opts.selectorValue === opts.modelValueExists) {
            return true;
          }
          return false;
        }
      },
      '$mod': {
        test: function(opts) {
          var $mod;
          if (opts.modelValueExists) {
            $mod = opts.selectorValue;
            if (!util.isArray($mod)) {
              $mod = [$mod];
            }
            if ($mod.length === 1) {
              $mod.push(0);
            }
            if ((opts.modelValue % $mod[0]) === $mod[1]) {
              return true;
            }
          }
          return false;
        }
      },
      '$eq': {
        test: function(opts) {
          if (util.isEqual(opts.modelValue, opts.selectorValue)) {
            return true;
          }
          return false;
        }
      },
      '$equal': {
        test: function(opts) {
          return opts.selector('$eq', opts);
        }
      },
      '$ne': {
        test: function(opts) {
          if (opts.modelValue !== opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$lt': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.modelValue < opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$gt': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.modelValue > opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$bt': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.selectorValue[0] < opts.modelValue && opts.modelValue < opts.selectorValue[1]) {
            return true;
          }
          return false;
        }
      },
      '$lte': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.modelValue <= opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$gte': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.modelValue >= opts.selectorValue) {
            return true;
          }
          return false;
        }
      },
      '$bte': {
        test: function(opts) {
          if ((opts.selectorValue != null) && util.isComparable(opts.modelValue) && opts.selectorValue[0] <= opts.modelValue && opts.modelValue <= opts.selectorValue[1]) {
            return true;
          }
          return false;
        }
      }
    };

    function Query(source) {
      if (source == null) {
        source = {};
      }
      this.source = source;
      this.compileQuery();
    }

    Query.prototype.compileSelector = function(selectorName, selectorOpts) {
      var compileOpts, compiledSelector, key, opts, query, selector, selectors, value;
      if (selectorOpts == null) {
        selectorOpts = {};
      }
      query = this;
      selectors = this.selectors;
      opts = {
        selectorName: selectorName
      };
      selector = selectors[selectorName];
      if (!selector) {
        throw new Error("Couldn't find the selector " + selectorName);
      }
      for (key in selectorOpts) {
        if (!__hasProp.call(selectorOpts, key)) continue;
        value = selectorOpts[key];
        opts[key] = value;
      }
      if (selector.compile != null) {
        opts.selector = function(selectorName, opts) {
          return selectors[selectorName].compile(opts);
        };
        compileOpts = selector.compile(opts);
        for (key in compileOpts) {
          if (!__hasProp.call(compileOpts, key)) continue;
          value = compileOpts[key];
          opts[key] = value;
        }
      }
      opts.selector = function(selectorName, opts) {
        return selectors[selectorName].test(opts);
      };
      compiledSelector = {
        opts: opts,
        test: selector.test
      };
      return compiledSelector;
    };

    Query.prototype.testCompiledSelector = function(compiledSelector, model) {
      var match, opts, test;
      opts = compiledSelector.opts;
      test = compiledSelector.test;
      opts.model = model;
      opts.modelValue = util.get(opts.model, opts.fieldName);
      opts.modelId = util.get(opts.model, 'id');
      opts.modelValueExists = typeof opts.modelValue !== 'undefined';
      if (!opts.modelValueExists) {
        opts.modelValue = false;
      }
      match = test(opts);
      return match;
    };

    Query.prototype.compileQuery = function() {
      var advancedSelectorName, advancedSelectorValue, compiledSelector, compiledSelectors, fieldName, query, selectorValue, _ref1;
      query = this;
      compiledSelectors = [];
      _ref1 = this.source;
      for (fieldName in _ref1) {
        if (!__hasProp.call(_ref1, fieldName)) continue;
        selectorValue = _ref1[fieldName];
        if (fieldName === '$or' || fieldName === '$nor' || fieldName === '$and' || fieldName === '$not') {
          compiledSelector = this.compileSelector(fieldName, {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isString(selectorValue)) {
          compiledSelector = this.compileSelector('string', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isNumber(selectorValue)) {
          compiledSelector = this.compileSelector('number', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isBoolean(selectorValue)) {
          compiledSelector = this.compileSelector('boolean', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isArray(selectorValue)) {
          compiledSelector = this.compileSelector('array', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isDate(selectorValue)) {
          compiledSelector = this.compileSelector('date', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isRegExp(selectorValue)) {
          compiledSelector = this.compileSelector('regexp', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isNull(selectorValue)) {
          compiledSelector = this.compileSelector('null', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (selectorValue instanceof Backbone.Model) {
          compiledSelector = this.compileSelector('model', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (selectorValue instanceof Backbone.Collection) {
          compiledSelector = this.compileSelector('collection', {
            fieldName: fieldName,
            selectorValue: selectorValue
          });
          compiledSelectors.push(compiledSelector);
        } else if (util.isObject(selectorValue)) {
          for (advancedSelectorName in selectorValue) {
            if (!__hasProp.call(selectorValue, advancedSelectorName)) continue;
            advancedSelectorValue = selectorValue[advancedSelectorName];
            compiledSelector = this.compileSelector(advancedSelectorName, {
              fieldName: fieldName,
              selectorValue: advancedSelectorValue
            });
            compiledSelectors.push(compiledSelector);
          }
        }
      }
      this.compiledSelectors = compiledSelectors;
      return this;
    };

    Query.prototype.test = function(model) {
      var compiledSelector, match, _i, _len, _ref1;
      match = true;
      _ref1 = this.compiledSelectors;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        compiledSelector = _ref1[_i];
        match = this.testCompiledSelector(compiledSelector, model);
        if (match === false) {
          break;
        }
      }
      return match;
    };

    return Query;

  })();

  queryEngine = {
    safeRegex: util.safeRegex,
    createRegex: util.createRegex,
    createSafeRegex: util.createSafeRegex,
    generateComparator: util.generateComparator,
    toArray: util.toArray,
    util: util,
    Backbone: Backbone,
    Hash: Hash,
    QueryCollection: QueryCollection,
    Criteria: Criteria,
    Query: Query,
    Pill: Pill,
    setQuerySelector: function(selectorHandle, selectorObject) {
      if (selectorObject != null) {
        Query.prototype.selectors[selectorHandle] = selectorObject;
      } else {
        delete Query.prototype.selectors[selectorHandle];
      }
      return this;
    },
    testModels: function() {
      var args, criteria, models, result;
      models = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      models = util.toArray(models);
      criteria = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Criteria, args, function(){});
      result = criteria.testModels(models);
      return result;
    },
    createCollection: function(models, options) {
      var collection;
      models = util.toArray(models);
      collection = new QueryCollection(models, options);
      return collection;
    },
    createLiveCollection: function(models, options) {
      var collection;
      models = util.toArray(models);
      collection = new QueryCollection(models, options).live(true);
      return collection;
    }
  };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = queryEngine;
  } else {
    this.QueryEngine = this.queryEngine = queryEngine;
  }

}).call(this);

},{"backbone":1,"exoskeleton":1}],13:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var $, Route, escapeRegExp, hashStrip, namedParam, splatParam,
    __slice = [].slice;

  $ = this.$ || (typeof window !== "undefined" && window !== null ? window.$ : void 0) || ((function() {
    try {
      return typeof require === "function" ? require('jquery') : void 0;
    } catch (_error) {}
  })());

  hashStrip = /^#*/;

  namedParam = /:([\w\d]+)/g;

  splatParam = /\*([\w\d]+)/g;

  escapeRegExp = /[-[\]{}()+?.,\\^$|#\s]/g;

  Route = (function() {
    var _ref;

    Route.historySupport = ((_ref = window.history) != null ? _ref.pushState : void 0) != null;

    Route.routes = [];

    Route.options = {
      trigger: true,
      history: false,
      shim: false,
      replace: false,
      redirect: false
    };

    Route.add = function(path, callback) {
      var key, value, _results;
      if (typeof path === 'object' && !(path instanceof RegExp)) {
        _results = [];
        for (key in path) {
          value = path[key];
          _results.push(this.add(key, value));
        }
        return _results;
      } else {
        return this.routes.push(new this(path, callback));
      }
    };

    Route.setup = function(options) {
      if (options == null) {
        options = {};
      }
      this.options = $.extend({}, this.options, options);
      if (this.options.history) {
        this.history = this.historySupport && this.options.history;
      }
      if (this.options.shim) {
        return;
      }
      if (this.history) {
        $(window).bind('popstate', this.change);
      } else {
        $(window).bind('hashchange', this.change);
      }
      return this.change();
    };

    Route.unbind = function() {
      if (this.options.shim) {
        return;
      }
      if (this.history) {
        return $(window).unbind('popstate', this.change);
      } else {
        return $(window).unbind('hashchange', this.change);
      }
    };

    Route.navigate = function() {
      var args, lastArg, options, path, route;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      options = {};
      lastArg = args[args.length - 1];
      if (typeof lastArg === 'object') {
        options = args.pop();
      } else if (typeof lastArg === 'boolean') {
        options.trigger = args.pop();
      }
      options = $.extend({}, this.options, options);
      path = args.join('/');
      if (this.path === path) {
        return;
      }
      this.path = path;
      if (options.trigger) {
        route = this.matchRoute(this.path, options);
      }
      if (options.shim) {
        return;
      }
      if (!route) {
        if (typeof options.redirect === 'function') {
          return options.redirect.apply(this, [this.path, options]);
        } else {
          if (options.redirect === true) {
            this.redirect(this.path);
          }
        }
      }
      if (this.history && options.replace) {
        return history.replaceState({}, document.title, this.path);
      } else if (this.history) {
        return history.pushState({}, document.title, this.path);
      } else {
        return window.location.hash = this.path;
      }
    };

    Route.getPath = function() {
      var path;
      if (this.history) {
        path = window.location.pathname;
        if (path.substr(0, 1) !== '/') {
          path = '/' + path;
        }
      } else {
        path = window.location.hash;
        path = path.replace(hashStrip, '');
      }
      return path;
    };

    Route.getHost = function() {
      return "" + window.location.protocol + "//" + window.location.host;
    };

    Route.change = function() {
      var path;
      path = Route.getPath();
      if (path === Route.path) {
        return;
      }
      Route.path = path;
      return Route.matchRoute(Route.path);
    };

    Route.matchRoute = function(path, options) {
      var route, _i, _len, _ref1;
      _ref1 = this.routes;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        route = _ref1[_i];
        if (route.match(path, options)) {
          return route;
        }
      }
    };

    Route.redirect = function(path) {
      return window.location = path;
    };

    function Route(path, callback) {
      var match;
      this.path = path;
      this.callback = callback;
      this.names = [];
      if (typeof path === 'string') {
        namedParam.lastIndex = 0;
        while ((match = namedParam.exec(path)) !== null) {
          this.names.push(match[1]);
        }
        splatParam.lastIndex = 0;
        while ((match = splatParam.exec(path)) !== null) {
          this.names.push(match[1]);
        }
        path = path.replace(escapeRegExp, '\\$&').replace(namedParam, '([^\/]*)').replace(splatParam, '(.*?)');
        this.route = new RegExp("^" + path + "$");
      } else {
        this.route = path;
      }
    }

    Route.prototype.match = function(path, options) {
      var i, match, param, params, _i, _len;
      if (options == null) {
        options = {};
      }
      match = this.route.exec(path);
      if (!match) {
        return false;
      }
      options.match = match;
      params = match.slice(1);
      if (this.names.length) {
        for (i = _i = 0, _len = params.length; _i < _len; i = ++_i) {
          param = params[i];
          options[this.names[i]] = param;
        }
      }
      return this.callback.call(null, options) !== false;
    };

    return Route;

  }).call(this);

  module.exports = {
    Route: Route
  };

}).call(this);

},{"jquery":1}],14:[function(require,module,exports){
module.exports=require(5)
},{}],15:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var ambi, typeChecker,
    __slice = [].slice;

  typeChecker = require('typechecker');

  ambi = function() {
    var args, completionCallback, err, fireMethod, introspectMethod, isAsynchronousMethod, method, result;
    method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (typeChecker.isArray(method)) {
      fireMethod = method[0], introspectMethod = method[1];
    } else {
      fireMethod = introspectMethod = method;
    }
    isAsynchronousMethod = introspectMethod.length === args.length;
    completionCallback = args[args.length - 1];
    if (!typeChecker.isFunction(completionCallback)) {
      err = new Error('ambi was called without a completion callback');
      throw err;
    }
    if (isAsynchronousMethod) {
      fireMethod.apply(null, args);
    } else {
      result = fireMethod.apply(null, args);
      if (typeChecker.isError(result)) {
        err = result;
        completionCallback(err);
      } else {
        completionCallback(null, result);
      }
    }
    return null;
  };

  module.exports = ambi;

}).call(this);

},{"typechecker":14}],16:[function(require,module,exports){
(function (process,global){
// Generated by CoffeeScript 1.7.1
(function() {
  var EventEmitter, Task, TaskGroup, ambi, domain, events, setImmediate, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  setImmediate = (typeof global !== "undefined" && global !== null ? global.setImmediate : void 0) || process.nextTick;

  ambi = require('ambi');

  events = require('events');

  domain = (_ref = ((function() {
    try {
      return require('domain');
    } catch (_error) {}
  })())) != null ? _ref : null;

  EventEmitter = events.EventEmitter;

  Task = (function(_super) {
    __extends(Task, _super);

    Task.prototype.type = 'task';

    Task.prototype.result = null;

    Task.prototype.running = false;

    Task.prototype.completed = false;

    Task.prototype.taskDomain = null;

    Task.prototype.config = null;


    /*
    		name: null
    		method: null
    		args: null
    		parent: null
     */

    function Task() {
      var args, _base, _base1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      Task.__super__.constructor.apply(this, arguments);
      if (this.config == null) {
        this.config = {};
      }
      if ((_base = this.config).name == null) {
        _base.name = "Task " + (Math.random());
      }
      if ((_base1 = this.config).run == null) {
        _base1.run = false;
      }
      this.setConfig(args);
      this;
    }

    Task.prototype.setConfig = function(opts) {
      var arg, args, key, value, _i, _len;
      if (opts == null) {
        opts = {};
      }
      if (Array.isArray(opts)) {
        args = opts;
        opts = {};
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          switch (typeof arg) {
            case 'string':
              opts.name = arg;
              break;
            case 'function':
              opts.method = arg;
              break;
            case 'object':
              for (key in arg) {
                if (!__hasProp.call(arg, key)) continue;
                value = arg[key];
                opts[key] = value;
              }
          }
        }
      }
      for (key in opts) {
        if (!__hasProp.call(opts, key)) continue;
        value = opts[key];
        switch (key) {
          case 'next':
            if (value) {
              this.once('complete', value.bind(this));
            }
            break;
          default:
            this.config[key] = value;
        }
      }
      return this;
    };

    Task.prototype.getConfig = function() {
      return this.config;
    };

    Task.prototype.reset = function() {
      this.completed = false;
      this.running = false;
      this.result = null;
      return this;
    };

    Task.prototype.uncaughtExceptionCallback = function() {
      var args, err;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      err = args[0];
      if (!this.completed) {
        this.complete(args);
      }
      this.emit('error', err);
      return this;
    };

    Task.prototype.completionCallback = function() {
      var args, err;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (!this.completed) {
        this.complete(args);
        this.emit.apply(this, ['complete'].concat(__slice.call(this.result)));
      } else {
        err = new Error("A task's completion callback has fired when the task was already in a completed state, this is unexpected");
        this.emit('error', err);
      }
      return this;
    };

    Task.prototype.destroy = function() {
      this.removeAllListeners();
      return this;
    };

    Task.prototype.complete = function(result) {
      this.completed = true;
      this.running = false;
      this.result = result;
      return this;
    };

    Task.prototype.fire = function() {
      var args, fire, me;
      me = this;
      args = (this.config.args || []).concat([this.completionCallback.bind(this)]);
      if ((this.taskDomain != null) === false && ((domain != null ? domain.create : void 0) != null)) {
        this.taskDomain = domain.create();
        this.taskDomain.on('error', this.uncaughtExceptionCallback.bind(this));
      }
      fire = function() {
        var err, _ref1;
        try {
          if ((_ref1 = me.config.method) != null ? _ref1.bind : void 0) {
            return ambi.apply(null, [me.config.method.bind(me)].concat(__slice.call(args)));
          } else {
            throw new Error("The task " + me.config.name + " was fired but has no method to fire");
          }
        } catch (_error) {
          err = _error;
          return me.uncaughtExceptionCallback(err);
        }
      };
      if (this.taskDomain != null) {
        this.taskDomain.run(fire);
      } else {
        fire();
      }
      return this;
    };

    Task.prototype.run = function() {
      var err;
      if (this.completed) {
        err = new Error("A task was about to run but it has already completed, this is unexpected");
        this.emit('error', err);
      } else {
        this.reset();
        this.running = true;
        this.emit('run');
        setImmediate(this.fire.bind(this));
      }
      return this;
    };

    return Task;

  })(EventEmitter);

  TaskGroup = (function(_super) {
    __extends(TaskGroup, _super);

    TaskGroup.prototype.type = 'taskgroup';

    TaskGroup.prototype.running = 0;

    TaskGroup.prototype.remaining = null;

    TaskGroup.prototype.err = null;

    TaskGroup.prototype.results = null;

    TaskGroup.prototype.paused = true;

    TaskGroup.prototype.bubbleEvents = null;

    TaskGroup.prototype.config = null;


    /*
    		name: null
    		method: null
    		concurrency: 1  # use 0 for unlimited
    		pauseOnError: true
    		parent: null
     */

    function TaskGroup() {
      var args, me, _base, _base1, _base2, _base3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      me = this;
      TaskGroup.__super__.constructor.apply(this, arguments);
      if (this.config == null) {
        this.config = {};
      }
      if ((_base = this.config).name == null) {
        _base.name = "Task Group " + (Math.random());
      }
      if ((_base1 = this.config).concurrency == null) {
        _base1.concurrency = 1;
      }
      if ((_base2 = this.config).pauseOnError == null) {
        _base2.pauseOnError = true;
      }
      if ((_base3 = this.config).run == null) {
        _base3.run = false;
      }
      if (this.results == null) {
        this.results = [];
      }
      if (this.remaining == null) {
        this.remaining = [];
      }
      if (this.bubbleEvents == null) {
        this.bubbleEvents = ['complete', 'run', 'error'];
      }
      this.setConfig(args);
      process.nextTick(this.fire.bind(this));
      this.on('item.complete', this.itemCompletionCallback.bind(this));
      this.on('item.error', this.itemUncaughtExceptionCallback.bind(this));
      this;
    }

    TaskGroup.prototype.setConfig = function(opts) {
      var arg, args, key, value, _i, _len;
      if (opts == null) {
        opts = {};
      }
      if (Array.isArray(opts)) {
        args = opts;
        opts = {};
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          switch (typeof arg) {
            case 'string':
              opts.name = arg;
              break;
            case 'function':
              opts.method = arg;
              break;
            case 'object':
              for (key in arg) {
                if (!__hasProp.call(arg, key)) continue;
                value = arg[key];
                opts[key] = value;
              }
          }
        }
      }
      for (key in opts) {
        if (!__hasProp.call(opts, key)) continue;
        value = opts[key];
        switch (key) {
          case 'next':
            if (value) {
              this.once('complete', value.bind(this));
            }
            break;
          case 'task':
          case 'tasks':
            if (value) {
              this.addTasks(value);
            }
            break;
          case 'group':
          case 'groups':
            if (value) {
              this.addGroups(value);
            }
            break;
          case 'item':
          case 'items':
            if (value) {
              this.addItems(value);
            }
            break;
          default:
            this.config[key] = value;
        }
      }
      return this;
    };

    TaskGroup.prototype.getConfig = function() {
      return this.config;
    };

    TaskGroup.prototype.fire = function() {
      if (this.config.method) {
        this.addTask(this.config.method.bind(this), {
          args: [this.addGroup.bind(this), this.addTask.bind(this)],
          includeInResults: false
        });
        if (!this.config.parent) {
          this.run();
        }
      }
      if (this.config.run === true) {
        this.run();
      }
      return this;
    };

    TaskGroup.prototype.itemCompletionCallback = function() {
      var args, item;
      item = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (item.config.includeInResults !== false) {
        this.results.push(args);
      }
      if (args[0]) {
        this.err = args[0];
      }
      if (this.running > 0) {
        --this.running;
      }
      if (this.paused) {
        return;
      }
      if (!this.complete()) {
        this.nextItems();
      }
      return this;
    };

    TaskGroup.prototype.itemUncaughtExceptionCallback = function(item, err) {
      this.exit(err);
      return this;
    };

    TaskGroup.prototype.getTotals = function() {
      var completed, remaining, running, total;
      running = this.running;
      remaining = this.remaining.length;
      completed = this.results.length;
      total = running + remaining + completed;
      return {
        running: running,
        remaining: remaining,
        completed: completed,
        total: total
      };
    };

    TaskGroup.prototype.addItem = function(item) {
      var me;
      me = this;
      if (!item) {
        return null;
      }
      item.setConfig({
        parent: this
      });
      if (item.type === 'task') {
        this.bubbleEvents.forEach(function(bubbleEvent) {
          return item.on(bubbleEvent, function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            return me.emit.apply(me, ["task." + bubbleEvent, item].concat(__slice.call(args)));
          });
        });
        this.emit('task.add', item);
      }
      if (item.type === 'taskgroup') {
        this.bubbleEvents.forEach(function(bubbleEvent) {
          return item.on(bubbleEvent, function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            return me.emit.apply(me, ["group." + bubbleEvent, item].concat(__slice.call(args)));
          });
        });
        this.emit('group.add', item);
      }
      this.bubbleEvents.forEach(function(bubbleEvent) {
        return item.on(bubbleEvent, function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return me.emit.apply(me, ["item." + bubbleEvent, item].concat(__slice.call(args)));
        });
      });
      this.emit('item.add', item);
      this.remaining.push(item);
      if (!this.paused) {
        this.nextItems();
      }
      return item;
    };

    TaskGroup.prototype.addItems = function() {
      var args, item, items;
      items = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!Array.isArray(items)) {
        items = [items];
      }
      return (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          _results.push(this.addItem.apply(this, [item].concat(__slice.call(args))));
        }
        return _results;
      }).call(this);
    };

    TaskGroup.prototype.createTask = function() {
      var args, task, _ref1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (((_ref1 = args[0]) != null ? _ref1.type : void 0) === 'task') {
        task = args[0];
        task.setConfig(args.slice(1));
      } else {
        task = (function(func, args, ctor) {
          ctor.prototype = func.prototype;
          var child = new ctor, result = func.apply(child, args);
          return Object(result) === result ? result : child;
        })(Task, args, function(){});
      }
      return task;
    };

    TaskGroup.prototype.addTask = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.addItem(this.createTask.apply(this, args));
    };

    TaskGroup.prototype.addTasks = function() {
      var args, item, items;
      items = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!Array.isArray(items)) {
        items = [items];
      }
      return (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          _results.push(this.addTask.apply(this, [item].concat(__slice.call(args))));
        }
        return _results;
      }).call(this);
    };

    TaskGroup.prototype.createGroup = function() {
      var args, taskgroup, _ref1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (((_ref1 = args[0]) != null ? _ref1.type : void 0) === 'taskgroup') {
        taskgroup = args[0];
        taskgroup.setConfig(args.slice(1));
      } else {
        taskgroup = (function(func, args, ctor) {
          ctor.prototype = func.prototype;
          var child = new ctor, result = func.apply(child, args);
          return Object(result) === result ? result : child;
        })(TaskGroup, args, function(){});
      }
      return taskgroup;
    };

    TaskGroup.prototype.addGroup = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.addItem(this.createGroup.apply(this, args));
    };

    TaskGroup.prototype.addGroups = function() {
      var args, item, items;
      items = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!Array.isArray(items)) {
        items = [items];
      }
      return (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          _results.push(this.addGroup.apply(this, [item].concat(__slice.call(args))));
        }
        return _results;
      }).call(this);
    };

    TaskGroup.prototype.hasItems = function() {
      return this.remaining.length !== 0;
    };

    TaskGroup.prototype.isReady = function() {
      return !this.config.concurrency || this.running < this.config.concurrency;
    };

    TaskGroup.prototype.nextItems = function() {
      var item, items, result;
      items = [];
      while (true) {
        item = this.nextItem();
        if (item) {
          items.push(item);
        } else {
          break;
        }
      }
      result = items.length ? items : false;
      return result;
    };

    TaskGroup.prototype.nextItem = function() {
      var nextItem;
      if (this.hasItems()) {
        if (this.isReady()) {
          nextItem = this.remaining.shift();
          ++this.running;
          nextItem.run();
          return nextItem;
        }
      }
      return false;
    };

    TaskGroup.prototype.complete = function() {
      var completed, empty, pause;
      pause = this.config.pauseOnError && this.err;
      empty = this.hasItems() === false && this.running === 0;
      completed = pause || empty;
      if (completed) {
        if (pause) {
          this.pause();
        }
        this.emit('complete', this.err, this.results);
        this.err = null;
        this.results = [];
      }
      return completed;
    };

    TaskGroup.prototype.clear = function() {
      var item, _i, _len, _ref1;
      _ref1 = this.remaining.splice(0);
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        item.destroy();
      }
      return this;
    };

    TaskGroup.prototype.destroy = function() {
      this.stop();
      this.removeAllListeners();
      return this;
    };

    TaskGroup.prototype.stop = function() {
      this.pause();
      this.clear();
      return this;
    };

    TaskGroup.prototype.exit = function(err) {
      if (err) {
        this.err = err;
      }
      this.stop();
      this.running = 0;
      this.complete();
      return this;
    };

    TaskGroup.prototype.pause = function() {
      this.paused = true;
      return this;
    };

    TaskGroup.prototype.run = function() {
      var args, me;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      me = this;
      this.paused = false;
      this.emit('run');
      process.nextTick(function() {
        if (!me.complete()) {
          return me.nextItems();
        }
      });
      return this;
    };

    return TaskGroup;

  })(EventEmitter);

  module.exports = {
    Task: Task,
    TaskGroup: TaskGroup
  };

}).call(this);

}).call(this,require("/Users/balupton/Projects/inlinegui/node_modules/docpad-plugin-browserifydocs/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"/Users/balupton/Projects/inlinegui/node_modules/docpad-plugin-browserifydocs/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":4,"ambi":15,"domain":2,"events":3}],17:[function(require,module,exports){
(function() {
  var $, App, app;

  $ = window.$;

  App = require('./views/app').App;

  window.app = app = new App({
    el: $('.app')
  });

  $(window).on('resize', app.onWindowResize.bind(app)).on('message', app.onMessage.bind(app));

  window.debug = function() {
    debugger;
  };

}).call(this);

},{"./views/app":23}],18:[function(require,module,exports){
(function() {
  var Backbone, Collection, Model, TaskGroup, extractData, ignoreSync, queryEngine, thrower, wait, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Backbone = window.Backbone;

  queryEngine = require('query-engine');

  _ref = require('../util'), wait = _ref.wait, thrower = _ref.thrower, extractData = _ref.extractData, ignoreSync = _ref.ignoreSync;

  TaskGroup = require('taskgroup').TaskGroup;

  Model = (function(_super) {
    __extends(Model, _super);

    function Model() {
      return Model.__super__.constructor.apply(this, arguments);
    }

    Model.prototype.syncing = null;

    Model.prototype.synced = null;

    Model.prototype.ignoreSync = ignoreSync;

    Model.prototype.getSyncUrl = function() {
      throw new Error('should be implemented by the inheriting model');
    };

    Model.prototype.parse = function(response) {
      var data;
      data = extractData(response);
      return data;
    };

    Model.prototype.sync = function(opts, next) {
      var isNew;
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (this.ignoreSync(opts)) {
        console.log('sync ignored', this, opts);
        next();
      } else {
        console.log('sync performing', this, opts);
        this.syncing = true;
        this.synced = new Date();
        isNew = this.isNew();
        if (opts.method == null) {
          opts.method = isNew ? 'put' : 'post';
        }
        if (opts.method !== 'destroy') {
          if (opts.data == null) {
            opts.data = this.toJSON();
          }
        }
        if (opts.url == null) {
          opts.url = this.getSyncUrl();
        }
        app.request(opts, (function(_this) {
          return function(err, data) {
            if (err) {
              return next(err);
            }
            if (opts.method !== 'destroy') {
              _this.set(_this.parse(data));
              _this.trigger('sync', _this, data, opts);
            }
            _this.syncing = false;
            return next();
          };
        })(this));
      }
      return this;
    };

    Model.prototype.fetch = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'fetch';
      }
      if (opts.sync == null) {
        opts.sync = true;
      }
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    Model.prototype.save = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'save';
      }
      if (opts.sync == null) {
        opts.sync = true;
      }
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    Model.prototype.destroy = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'destroy';
      }
      if (opts.sync == null) {
        opts.sync = false;
      }
      this.trigger('destroy', this, this.collection, opts);
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    return Model;

  })(window.Backbone.Model);

  Collection = (function(_super) {
    __extends(Collection, _super);

    function Collection() {
      return Collection.__super__.constructor.apply(this, arguments);
    }

    Collection.prototype.collection = Collection;

    Collection.prototype.syncing = null;

    Collection.prototype.synced = null;

    Collection.prototype.ignoreSync = ignoreSync;

    Collection.prototype.fetchItem = function(opts, next) {
      var result, slug, _base;
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      slug = (typeof (_base = opts.item).get === "function" ? _base.get('slug') : void 0) || opts.item;
      result = this.get(slug);
      if (result) {
        return next(null, result);
      } else {
        wait(1000, (function(_this) {
          return function() {
            return _this.sync({}, function(err) {
              if (err) {
                return next(err);
              }
              return _this.fetchItem(opts, next);
            });
          };
        })(this));
      }
      return this;
    };

    Collection.prototype.sync = function(opts, next) {
      var err, items, key, models, tasks;
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (this.ignoreSync(opts)) {
        console.log('sync ignored', this, opts);
        next();
      } else {
        console.log('sync performing', this, opts);
        key = this.getLocalStorageKey();
        if (opts.method === 'create') {
          console.log('Create model in collection', this, opts, opts.model);
          opts.model = this._prepareModel(opts.model, opts);
          if (!opts.model) {
            err = new Error('Model creation failed');
            return next(err);
          }
          opts.model.save(opts, (function(_this) {
            return function(err) {
              if (err) {
                return next(err);
              }
              _this.add(opts.model);
              opts.method = 'save';
              return _this.sync(opts, next);
            };
          })(this));
        } else if (opts.method === 'fetch') {
          items = JSON.parse(localStorage.getItem(key) || 'null') || [];
          models = [];
          console.log('Fetch models in collection', this, opts, items);
          tasks = new TaskGroup({
            concurrency: 0,
            next: (function(_this) {
              return function(err) {
                if (err) {
                  return next(err);
                }
                _this.add(models);
                console.log('Added models to the collection', _this, opts, models, _this.length);
                opts.method = 'save';
                return _this.sync(opts, next);
              };
            })(this)
          });
          items.forEach((function(_this) {
            return function(item, index) {
              return tasks.addTask(function(complete) {
                var model;
                item.id = index;
                model = new _this.model(item).fetch({}, complete);
                return models.push(model);
              });
            };
          })(this));
          tasks.run();
        } else if (opts.method === 'save') {
          items = JSON.stringify(this.toJSON());
          console.log('Save models in collection', this, opts, items);
          localStorage.setItem(key, items);
          next();
        } else {
          err = new Error('Unknown sync method');
          next(err);
        }
      }
      return this;
    };

    Collection.prototype.fetch = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'fetch';
      }
      if (opts.sync == null) {
        opts.sync = true;
      }
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    Collection.prototype.save = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'save';
      }
      if (opts.sync == null) {
        opts.sync = true;
      }
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    Collection.prototype.create = function(model, opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (opts.method == null) {
        opts.method = 'create';
      }
      opts.model = model;
      if (opts.sync == null) {
        opts.sync = true;
      }
      if (opts.sync === true) {
        this.sync(opts, next);
      }
      return this;
    };

    return Collection;

  })(queryEngine.QueryCollection);

  module.exports = {
    Model: Model,
    Collection: Collection
  };

}).call(this);

},{"../util":22,"query-engine":12,"taskgroup":16}],19:[function(require,module,exports){
(function() {
  var Collection, CustomFileCollection, CustomFileCollections, File, Model, slugify, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = window._;

  _ref = require('./base'), Model = _ref.Model, Collection = _ref.Collection;

  File = require('./file').File;

  slugify = require('../util').slugify;

  CustomFileCollection = (function(_super) {
    __extends(CustomFileCollection, _super);

    function CustomFileCollection() {
      return CustomFileCollection.__super__.constructor.apply(this, arguments);
    }

    CustomFileCollection.prototype.defaults = {
      name: null,
      relativePaths: null,
      files: null,
      site: null
    };

    CustomFileCollection.prototype.get = function(key) {
      switch (key) {
        case 'slug':
          return slugify(this.get('name'));
        default:
          return CustomFileCollection.__super__.get.apply(this, arguments);
      }
    };

    CustomFileCollection.prototype.toJSON = function() {
      return _.omit(CustomFileCollection.__super__.toJSON.call(this), ['files', 'site']);
    };

    CustomFileCollection.prototype.getSyncUrl = function() {
      var collectionName, site, siteToken, siteUrl;
      site = this.get.get('site');
      siteUrl = site.get('url');
      siteToken = site.get('token');
      collectionName = this.get('name');
      return "" + siteUrl + "/restapi/collection/" + collectionName + "/?securityToken=" + siteToken;
    };

    CustomFileCollection.prototype.initialize = function() {
      var _base;
      CustomFileCollection.__super__.initialize.apply(this, arguments);
      if ((_base = this.attributes).files == null) {
        _base.files = File.collection.createLiveChildCollection();
      }
      if (this.attributes.relativePaths) {
        this.updateQuery();
      }
      this.on('change:relativePaths', this.updateQuery.bind(this));
      return this;
    };

    CustomFileCollection.prototype.updateQuery = function() {
      var query;
      query = {
        site: this.get('site'),
        relativePath: {
          $in: this.get('relativePaths')
        }
      };
      this.attributes.files.setQuery('CustomFileCollection Limiter', query).query();
      return this;
    };

    return CustomFileCollection;

  })(Model);

  CustomFileCollections = (function(_super) {
    __extends(CustomFileCollections, _super);

    function CustomFileCollections() {
      return CustomFileCollections.__super__.constructor.apply(this, arguments);
    }

    CustomFileCollections.prototype.model = CustomFileCollection;

    CustomFileCollections.prototype.collection = CustomFileCollections;

    CustomFileCollections.prototype.get = function(id) {
      var item;
      item = CustomFileCollections.__super__.get.apply(this, arguments) || this.findOne({
        $or: {
          slug: id,
          name: id
        }
      });
      return item;
    };

    return CustomFileCollections;

  })(Collection);

  CustomFileCollection.collection = new CustomFileCollections([], {
    name: 'Global CustomFileCollection Collection'
  });

  module.exports = {
    CustomFileCollection: CustomFileCollection,
    CustomFileCollections: CustomFileCollections
  };

}).call(this);

},{"../util":22,"./base":18,"./file":20}],20:[function(require,module,exports){
(function() {
  var Collection, File, Files, Model, slugify, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = window._;

  _ref = require('./base'), Model = _ref.Model, Collection = _ref.Collection;

  slugify = require('../util').slugify;

  File = (function(_super) {
    __extends(File, _super);

    File.prototype["default"] = {
      slug: null,
      filename: null,
      relativePath: null,
      url: null,
      urls: null,
      contentType: null,
      encoding: null,
      content: null,
      contentRendered: null,
      source: null,
      title: null,
      layout: null,
      author: null,
      site: null
    };

    function File() {
      if (this.metaAttributes == null) {
        this.metaAttributes = ['title', 'content', 'date', 'author', 'layout'];
      }
      File.__super__.constructor.apply(this, arguments);
    }

    File.prototype.get = function(key) {
      switch (key) {
        case 'slug':
          return slugify(this.get('relativePath'));
        default:
          return File.__super__.get.apply(this, arguments);
      }
    };

    File.prototype.getSyncUrl = function() {
      var file, fileRelativePath, site, siteToken, siteUrl;
      file = this;
      fileRelativePath = file.get('relativePath');
      site = file.get('site');
      siteUrl = site.get('url');
      siteToken = site.get('token');
      return "" + siteUrl + "/restapi/collection/database/" + fileRelativePath + "?securityToken=" + siteToken;
    };

    File.prototype.reset = function() {
      var data, key, value, _ref1, _ref2;
      data = {};
      _ref1 = this.attributes;
      for (key in _ref1) {
        if (!__hasProp.call(_ref1, key)) continue;
        value = _ref1[key];
        data[key] = null;
      }
      _ref2 = this.lastSync;
      for (key in _ref2) {
        if (!__hasProp.call(_ref2, key)) continue;
        value = _ref2[key];
        data[key] = value;
      }
      this.set(data);
      return this;
    };

    File.prototype.toJSON = function() {
      return _.omit(File.__super__.toJSON.call(this), ['site']);
    };

    File.prototype.parse = function() {
      var data, key, value, _ref1;
      data = File.__super__.parse.apply(this, arguments);
      _ref1 = data.meta;
      for (key in _ref1) {
        if (!__hasProp.call(_ref1, key)) continue;
        value = _ref1[key];
        data[key] = value;
      }
      delete data.meta;
      if (data.date) {
        data.date = new Date(data.date);
      }
      this.lastSync = data;
      return data;
    };

    File.prototype.initialize = function() {
      File.__super__.initialize.apply(this, arguments);
      if (this.id == null) {
        this.id = this.cid;
      }
      return this;
    };

    return File;

  })(Model);

  Files = (function(_super) {
    __extends(Files, _super);

    function Files() {
      return Files.__super__.constructor.apply(this, arguments);
    }

    Files.prototype.model = File;

    Files.prototype.collection = Files;

    Files.prototype.get = function(id) {
      var item;
      item = Files.__super__.get.apply(this, arguments) || this.findOne({
        $or: {
          slug: id,
          relativePath: id
        }
      });
      return item;
    };

    return Files;

  })(Collection);

  File.collection = new Files([], {
    name: 'Global File Collection'
  });

  module.exports = {
    File: File,
    Files: Files
  };

}).call(this);

},{"../util":22,"./base":18}],21:[function(require,module,exports){
(function() {
  var Collection, CustomFileCollection, File, Model, Site, Sites, TaskGroup, slugify, thrower, wait, _, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = window._;

  _ref = require('./base'), Model = _ref.Model, Collection = _ref.Collection;

  File = require('./file').File;

  CustomFileCollection = require('./customfilecollection').CustomFileCollection;

  TaskGroup = require('taskgroup').TaskGroup;

  _ref1 = require('../util'), thrower = _ref1.thrower, slugify = _ref1.slugify, wait = _ref1.wait;

  Site = (function(_super) {
    __extends(Site, _super);

    function Site() {
      return Site.__super__.constructor.apply(this, arguments);
    }

    Site.prototype.defaults = {
      name: null,
      slug: null,
      url: null,
      token: null,
      customFileCollections: null,
      files: null
    };

    Site.prototype.sync = function(opts, next) {
      var result, site, siteToken, siteUrl, tasks;
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      if (this.ignoreSync(opts)) {
        console.log('sync ignored', this, opts);
        next();
      } else {
        console.log('sync performing', this, opts);
        if (opts.method === 'destroy') {
          next();
        } else {
          site = this;
          siteUrl = site.get('url');
          siteToken = site.get('token');
          result = {};
          tasks = new TaskGroup({
            concurrency: 0,
            next: (function(_this) {
              return function(err) {
                if (err) {
                  return next(err);
                }
                console.log('site model fetched', _this, opts, result);
                _this.set(_this.parse(result));
                return next();
              };
            })(this)
          });
          tasks.addTask((function(_this) {
            return function(complete) {
              return app.request({
                url: "" + siteUrl + "/restapi/collections/?securityToken=" + siteToken
              }, function(err, data) {
                if (err) {
                  return complete(err);
                }
                result.customFileCollections = data;
                return complete();
              });
            };
          })(this));
          tasks.addTask((function(_this) {
            return function(complete) {
              return app.request({
                url: "" + siteUrl + "/restapi/files/?securityToken=" + siteToken
              }, function(err, data) {
                if (err) {
                  return complete(err);
                }
                result.files = data;
                return complete();
              });
            };
          })(this));
          tasks.run();
        }
      }
      return this;
    };

    Site.prototype.get = function(key) {
      switch (key) {
        case 'name':
          return this.get('url').replace(/^.+?\/\//, '');
        case 'slug':
          return slugify(this.get('name'));
        default:
          return Site.__super__.get.apply(this, arguments);
      }
    };

    Site.prototype.getCollection = function(name) {
      return this.get('customFileCollections').findOne({
        name: name
      });
    };

    Site.prototype.getCollectionFiles = function(name) {
      var _ref2;
      return (_ref2 = this.getCollection(name)) != null ? _ref2.get('files') : void 0;
    };

    Site.prototype.toJSON = function() {
      return _.omit(Site.__super__.toJSON.call(this), ['customFileCollections', 'files']);
    };

    Site.prototype.parse = function() {
      var collection, data, file, site, _i, _j, _len, _len1, _ref2, _ref3;
      site = this;
      data = Site.__super__.parse.apply(this, arguments);
      if (Array.isArray(data.customFileCollections)) {
        _ref2 = data.customFileCollections;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          collection = _ref2[_i];
          collection.site = site;
        }
        CustomFileCollection.collection.add(data.customFileCollections, {
          parse: true
        });
        delete data.customFileCollections;
      }
      if (Array.isArray(data.files)) {
        _ref3 = data.files;
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          file = _ref3[_j];
          file.site = this;
        }
        File.collection.add(data.files, {
          parse: true
        });
        delete data.files;
      }
      return data;
    };

    Site.prototype.initialize = function() {
      var _base, _base1;
      Site.__super__.initialize.apply(this, arguments);
      if ((_base = this.attributes).customFileCollections == null) {
        _base.customFileCollections = CustomFileCollection.collection.createLiveChildCollection().setQuery('Site Limited', {
          site: this
        }).query();
      }
      if ((_base1 = this.attributes).files == null) {
        _base1.files = File.collection.createLiveChildCollection().setQuery('Site Limiter', {
          site: this
        }).query();
      }
      return this;
    };

    return Site;

  })(Model);

  Sites = (function(_super) {
    __extends(Sites, _super);

    Sites.prototype.model = Site;

    Sites.prototype.collection = Sites;

    Sites.prototype.getLocalStorageKey = function() {
      return 'sites';
    };

    function Sites() {
      Sites.__super__.constructor.apply(this, arguments);
      this.on('remove', (function(_this) {
        return function(model) {
          console.log('remove site from collection', _this, model);
          return _this.sync();
        };
      })(this));
    }

    Sites.prototype.get = function(id) {
      var item;
      item = Sites.__super__.get.apply(this, arguments) || this.findOne({
        $or: {
          slug: id,
          name: id
        }
      });
      return item;
    };

    return Sites;

  })(Collection);

  Site.collection = new Sites([], {
    name: 'Global Site Collection'
  });

  module.exports = {
    Site: Site,
    Sites: Sites
  };

}).call(this);

},{"../util":22,"./base":18,"./customfilecollection":19,"./file":20,"taskgroup":16}],22:[function(require,module,exports){
(function() {
  var extractData, ignoreSync, sendMessage, slugify, thrower, wait, waiter, within,
    __slice = [].slice;

  wait = function(delay, fn) {
    return setTimeout(fn, delay);
  };

  thrower = function() {
    var args, err;
    err = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (err) {
      console.log('Something has gone wrong', this, err, args);
      throw err;
    } else {
      console.log('Something has gone well', this, args);
    }
  };

  slugify = function(str) {
    return str.replace(/[^:-a-z0-9\.]/ig, '-').replace(/-+/g, '');
  };

  extractData = function(response) {
    var data;
    data = response;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    if (data.data != null) {
      data = data.data;
    }
    return data;
  };

  waiter = function(delay, fn) {
    return setInterval(fn, delay);
  };

  sendMessage = function(data) {
    return parent.postMessage(data, '*');
  };

  within = function(date, ms) {
    var now;
    now = new Date();
    return ((date != null) === false) || (now.getTime() < date.getTime() + ms);
  };

  ignoreSync = function(opts) {
    if (opts.method === 'save') {
      return false;
    } else if (this.syncing === true) {
      return true;
    } else if (this.synced && within(this.synced, 1000 * 10)) {
      return true;
    } else {
      return false;
    }
  };

  module.exports = {
    wait: wait,
    thrower: thrower,
    slugify: slugify,
    extractData: extractData,
    waiter: waiter,
    sendMessage: sendMessage,
    within: within,
    ignoreSync: ignoreSync
  };

}).call(this);

},{}],23:[function(require,module,exports){
(function() {
  var $, App, FileEditItem, FileListItem, Route, Site, SiteListItem, View, thrower, wait, _ref, _ref1, _ref2,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  $ = window.$;

  _ref = require('./base'), View = _ref.View, Route = _ref.Route;

  Site = require('../models/site').Site;

  SiteListItem = require('./site').SiteListItem;

  _ref1 = require('./file'), FileEditItem = _ref1.FileEditItem, FileListItem = _ref1.FileListItem;

  _ref2 = require('../util'), wait = _ref2.wait, thrower = _ref2.thrower;

  App = (function(_super) {
    __extends(App, _super);

    App.prototype.elements = {
      '.loadbar': '$loadbar',
      '.menu': '$menu',
      '.menu .link': '$links',
      '.menu .toggle': '$toggles',
      '.link-site': '$linkSite',
      '.link-page': '$linkPage',
      '.toggle-preview': '$togglePreview',
      '.toggle-meta': '$toggleMeta',
      '.collection-list': '$collectionList',
      '.content-table.files': '$filesList',
      '.content-table.sites': '$sitesList',
      '.content-row-file': '$files',
      '.content-row-site': '$sites',
      '.page-edit-container': '$pageEditContainer'
    };

    App.prototype.events = {
      'click .sites .content-cell-name': 'clickSite',
      'click .files .content-cell-name': 'clickFile',
      'change .collection-list': 'clickCollection',
      'click .menu .link': 'clickMenuLink',
      'click .menu .toggle': 'clickMenuToggle',
      'click .menu .button': 'clickMenuButton',
      'click .button-login': 'clickLogin',
      'click .button-add-site': 'clickAddSite',
      'submit .site-add-form': 'submitSite',
      'click .site-add-form .button-cancel': 'submitSiteCancel'
    };

    function App() {
      this.onMessage = __bind(this.onMessage, this);
      this.resizePreviewBar = __bind(this.resizePreviewBar, this);
      this.onWindowResize = __bind(this.onWindowResize, this);
      this.clickFile = __bind(this.clickFile, this);
      this.clickCollection = __bind(this.clickCollection, this);
      this.clickSite = __bind(this.clickSite, this);
      this.clickMenuLink = __bind(this.clickMenuLink, this);
      this.clickMenuToggle = __bind(this.clickMenuToggle, this);
      this.clickMenuButton = __bind(this.clickMenuButton, this);
      this.clickLogin = __bind(this.clickLogin, this);
      this.submitSiteCancel = __bind(this.submitSiteCancel, this);
      this.submitSite = __bind(this.submitSite, this);
      this.clickAddSite = __bind(this.clickAddSite, this);
      this.routeApp = __bind(this.routeApp, this);
      var currentUser, _ref3;
      App.__super__.constructor.apply(this, arguments);
      this.$el.on('click', '.collection-list', function(e) {
        return $(e.target).blur();
      });
      this.$sites.remove();
      this.$files.remove();
      this.point({
        item: Site.collection,
        viewClass: SiteListItem,
        element: this.$sitesList
      }).bind();
      this.onWindowResize();
      this.setAppMode('login');
      currentUser = localStorage.getItem('currentUser') || null;
      if ((_ref3 = navigator.id) != null) {
        _ref3.watch({
          loggedInUser: currentUser,
          onlogin: function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          },
          onlogout: function() {
            return localStorage.setItem('currentUser', '');
          }
        });
      }
      if (currentUser) {
        this.loginUser(currentUser);
      }
      wait(0, (function(_this) {
        return function() {
          return Site.collection.fetch(null, function(err) {
            var key, routes, value;
            if (err) {
              throw err;
            }
            routes = {
              '/': 'routeApp',
              '/site/:siteId/': 'routeApp',
              '/site/:siteId/:fileCollectionId': 'routeApp',
              '/site/:siteId/:fileCollectionId/*filePath': 'routeApp'
            };
            for (key in routes) {
              if (!__hasProp.call(routes, key)) continue;
              value = routes[key];
              Route.add(key, _this[value].bind(_this));
            }
            Route.setup();
            return _this.$el.addClass('app-ready');
          });
        };
      })(this));
      this;
    }

    App.prototype.routeApp = function(_arg) {
      var fileCollectionId, filePath, siteId;
      siteId = _arg.siteId, fileCollectionId = _arg.fileCollectionId, filePath = _arg.filePath;
      if (filePath) {
        this.openApp({
          site: siteId,
          fileCollection: fileCollectionId,
          file: filePath
        });
      } else {
        this.openApp({
          site: siteId,
          fileCollection: fileCollectionId
        });
      }
      return this;
    };

    App.prototype.mode = null;

    App.prototype.editView = null;

    App.prototype.currentSite = null;

    App.prototype.currentFileCollection = null;

    App.prototype.currentFile = null;

    App.prototype.setAppMode = function(mode) {
      this.mode = mode;
      this.$el.removeClass('app-login app-admin app-site app-page').addClass('app-' + mode);
      return this;
    };

    App.prototype.openApp = function(opts) {
      if (opts == null) {
        opts = {};
      }
      if (opts.navigate == null) {
        opts.navigate = true;
      }
      this.currentSite = opts.site || null;
      this.currentFileCollection = opts.fileCollection || 'database';
      this.currentFile = opts.file || null;
      if (!this.currentSite) {
        this.setAppMode('admin');
        if (opts.navigate) {
          this.navigate('/');
        }
        return this;
      }
      Site.collection.fetchItem({
        item: this.currentSite
      }, (function(_this) {
        return function(err, currentSite) {
          var customFileCollections;
          _this.currentSite = currentSite;
          if (err) {
            throw err;
          }
          if (!_this.currentSite) {
            throw new Error('could not find site');
          }
          _this.$linkSite.text(_this.currentSite.get('title') || _this.currentSite.get('name') || _this.currentSite.get('url'));
          customFileCollections = _this.currentSite.get('customFileCollections');
          return customFileCollections.fetchItem({
            item: _this.currentFileCollection
          }, function(err, currentFileCollection) {
            var $collectionList, files;
            _this.currentFileCollection = currentFileCollection;
            if (err) {
              throw err;
            }
            if (!_this.currentFileCollection) {
              throw new Error('could not find collection');
            }
            files = _this.currentFileCollection.get('files');
            if (!_this.currentFile) {
              $collectionList = _this.$el.find('.collection-list');
              if ($collectionList.data('site') !== _this.currentSite) {
                $collectionList.data('site', _this.currentSite);
                $collectionList.empty();
                customFileCollections.each(function(customFileCollection) {
                  return $collectionList.append($('<option>', {
                    text: customFileCollection.get('name')
                  }));
                });
                $collectionList.val(_this.currentFileCollection.get('name'));
              }
              _this.point({
                item: files,
                viewClass: FileListItem,
                element: _this.$filesList
              }).bind();
              _this.setAppMode('site');
              if (opts.navigate) {
                _this.navigate('/site/' + _this.currentSite.get('slug') + '/' + _this.currentFileCollection.get('slug'));
              }
              return _this;
            }
            return files.fetchItem({
              item: _this.currentFile
            }, function(err, currentFile) {
              var $el, $linkPage, $links, $toggleMeta, $togglePreview, $toggles, editView;
              _this.currentFile = currentFile;
              if (err) {
                throw err;
              }
              if (!_this.currentFile) {
                throw new Error('could not find file');
              }
              $el = _this.$el, $toggleMeta = _this.$toggleMeta, $links = _this.$links, $linkPage = _this.$linkPage, $toggles = _this.$toggles, $toggleMeta = _this.$toggleMeta, $togglePreview = _this.$togglePreview;
              _this.editView = editView = _this.point({
                item: _this.currentFile,
                viewClass: FileEditItem,
                element: _this.$pageEditContainer
              }).bind().getView();
              _this.point({
                item: _this.currentFile,
                itemAttributes: ['title', 'name', 'filename'],
                element: $linkPage
              }).bind();
              $toggles.removeClass('active');
              $toggleMeta.addClass('active');
              $togglePreview.addClass('active');
              editView.$metabar.show();
              editView.$previewbar.show();
              editView.$sourcebar.hide();
              _this.onWindowResize();
              _this.setAppMode('page');
              wait(10, function() {
                return _this.resizePreviewBar();
              });
              if (opts.navigate) {
                return _this.navigate('/site/' + _this.currentSite.get('slug') + '/' + _this.currentFileCollection.get('slug') + '/' + _this.currentFile.get('slug'));
              }
            });
          });
        };
      })(this));
      return this;
    };

    App.prototype.loginUser = function(email) {
      if (!email) {
        return this;
      }
      localStorage.setItem('currentUser', email);
      if (this.mode === 'login') {
        this.setAppMode('admin');
      }
      return this;
    };

    App.prototype.clickAddSite = function(e) {
      this.$el.find('.site-add.modal').show();
      return this;
    };

    App.prototype.submitSite = function(e) {
      var name, site, token, url;
      e.preventDefault();
      e.stopPropagation();
      url = (this.$el.find('.site-add .field-url :input').val() || '').replace(/\/+$/, '');
      token = this.$el.find('.site-add .field-token :input').val() || '';
      name = this.$el.find('.site-add .field-name :input').val() || url.toLowerCase().replace(/^.+?\/\//, '');
      url || (url = null);
      token || (token = null);
      name || (name = null);
      if (url && name) {
        site = Site.collection.create({
          url: url,
          token: token,
          name: name
        });
      } else {
        alert('need more site data');
      }
      this.$el.find('.site-add.modal').hide();
      return this;
    };

    App.prototype.submitSiteCancel = function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.$el.find('.site-add.modal').hide();
      return this;
    };

    App.prototype.clickLogin = function(e) {
      if (navigator.id == null) {
        throw new Error("Offline people can't login");
      }
      return navigator.id.request();
    };

    App.prototype.clickMenuButton = function(e) {
      var $loadbar, $target, activate, deactivate, target;
      $loadbar = this.$loadbar;
      target = e.currentTarget;
      $target = $(target);
      if ($loadbar.hasClass('active') === false || $loadbar.data('for') === target) {
        activate = (function(_this) {
          return function() {
            return $target.addClass('active').siblings('.button').addClass('disabled');
          };
        })(this);
        deactivate = (function(_this) {
          return function() {
            return $target.removeClass('active').siblings('.button').removeClass('disabled');
          };
        })(this);
        if ($target.hasClass('button-cancel')) {
          activate();
          this.editView.cancel({}, function() {
            return deactivate();
          });
        } else if ($target.hasClass('button-save')) {
          activate();
          this.editView.save({}, function() {
            return deactivate();
          });
        }
      }
      return this;
    };

    App.prototype.request = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      this.$loadbar.removeClass('put post get delete').addClass('active').addClass(opts.method);
      return wait(500, (function(_this) {
        return function() {
          return jQuery.ajax({
            url: opts.url,
            data: opts.data,
            dataType: 'json',
            cache: false,
            type: (opts.method || 'get').toUpperCase(),
            success: function(data, textStatus, jqXHR) {
              var err;
              _this.$loadbar.removeClass('active');
              if (typeof data === 'string') {
                data = JSON.parse(data);
              }
              if (data.success === false) {
                err = new Error(data.message || 'An error occured with the request');
                return next(err, data);
              }
              if (data.data != null) {
                data = data.data;
              }
              return next(null, data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
              _this.$loadbar.removeClass('active');
              return next(errorThrown, null);
            }
          });
        };
      })(this));
    };

    App.prototype.clickMenuToggle = function(e) {
      var $target, toggle, _ref3;
      $target = $(e.currentTarget);
      $target.toggleClass('active');
      toggle = $target.hasClass('active');
      switch (true) {
        case $target.hasClass('toggle-meta'):
          this.editView.$metabar.toggle(toggle);
          break;
        case $target.hasClass('toggle-preview'):
          this.editView.$previewbar.toggle(toggle);
          break;
        case $target.hasClass('toggle-source'):
          this.editView.$sourcebar.toggle(toggle);
          if ((_ref3 = this.editView.editor) != null) {
            _ref3.refresh();
          }
      }
      return this;
    };

    App.prototype.clickMenuLink = function(e) {
      var $target;
      $target = $(e.currentTarget);
      switch (true) {
        case $target.hasClass('link-admin'):
          this.openApp();
          break;
        case $target.hasClass('link-site'):
          this.openApp({
            site: this.currentSite,
            fileCollection: this.currentFileCollection
          });
      }
      return this;
    };

    App.prototype.clickSite = function(e) {
      var $row, $target, controller, item;
      e.preventDefault();
      e.stopPropagation();
      $target = $(e.target);
      $row = $target.parents('.content-row:first');
      item = $row.data('model');
      if ($target.parents().andSelf().filter('.button-delete').length === 1) {
        controller = $row.data('view');
        controller.item.destroy();
        controller.destroy();
      } else {
        this.openApp({
          site: item
        });
      }
      return this;
    };

    App.prototype.clickCollection = function(e) {
      var $target, item, value;
      $target = $(e.target);
      value = $target.val();
      item = this.currentSite.getCollection(value);
      this.openApp({
        site: this.currentSite,
        fileCollection: item
      });
      return this;
    };

    App.prototype.clickFile = function(e) {
      var $row, $target, item;
      e.preventDefault();
      e.stopPropagation();
      $target = $(e.target);
      $row = $target.parents('.content-row:first');
      item = $row.data('model');
      if ($target.parents().andSelf().filter('.button-delete').length === 1) {
        $row.fadeOut(5 * 1000);
        item.destroy({
          sync: true
        }, function(err) {
          if (err) {
            $row.show();
            throw err;
          }
          return $row.remove();
        });
      } else {
        this.openApp({
          site: this.currentSite,
          fileCollection: this.currentFileCollection,
          file: item
        });
      }
      return this;
    };

    App.prototype.onWindowResize = function() {
      return this.resizePreviewBar();
    };

    App.prototype.resizePreviewBar = function(height) {
      var $previewbar, $window, _ref3;
      $previewbar = (_ref3 = this.editView) != null ? _ref3.$previewbar : void 0;
      $window = $(window);
      if ($previewbar != null) {
        $previewbar.height(height || 'auto');
      }
      if ($previewbar != null) {
        $previewbar.css({
          minHeight: $window.height() - (this.$el.outerHeight() - $previewbar.outerHeight())
        });
      }
      return this;
    };

    App.prototype.onMessage = function(event) {
      var $previewbar, attrs, data, item, _ref3, _ref4, _ref5;
      data = ((_ref3 = event.originalEvent) != null ? _ref3.data : void 0) || event.data || {};
      try {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
      } catch (_error) {}
      if ((_ref4 = data.action) === 'resizeChild' || _ref4 === 'childLoaded') {
        this.resizePreviewBar(data.height + 'px');
      }
      if (data.action === 'change') {
        attrs = {};
        attrs[data.attribute] = data.value;
        item = this.currentFileCollection.get('files').findOne({
          url: data.url
        });
        item.set(attrs);
      }
      if (data.action === 'childLoaded') {
        $previewbar = this.editView.$previewbar;
        $previewbar.addClass('loaded');
      }
      if (((_ref5 = data.d) != null ? _ref5.assertion : void 0) != null) {
        this.loginUser(data.d.email);
      }
      return this;
    };

    return App;

  })(View);

  module.exports = {
    App: App
  };

}).call(this);

},{"../models/site":21,"../util":22,"./base":24,"./file":25,"./site":26}],24:[function(require,module,exports){
(function() {
  var MiniView, Pointer, Route, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Route = require('spine-route').Route;

  Pointer = require('pointers').Pointer;

  MiniView = require('miniview').View;

  View = (function(_super) {
    __extends(View, _super);

    function View() {
      return View.__super__.constructor.apply(this, arguments);
    }

    View.prototype.point = function() {
      var args, pointer;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      pointer = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Pointer, args, function(){});
      (this.pointers != null ? this.pointers : this.pointers = []).push(pointer);
      return pointer;
    };

    View.prototype.destroy = function() {
      var pointer, _i, _len, _ref;
      if (this.pointers) {
        _ref = this.pointers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          pointer = _ref[_i];
          pointer.destroy();
        }
      }
      this.pointers = null;
      return View.__super__.destroy.apply(this, arguments);
    };

    View.prototype.navigate = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return Route.navigate.apply(Route, args);
    };

    return View;

  })(MiniView);

  module.exports = {
    View: View,
    Route: Route
  };

}).call(this);

},{"miniview":8,"pointers":11,"spine-route":13}],25:[function(require,module,exports){
(function() {
  var $, CodeMirror, FileEditItem, FileListItem, View, moment, thrower, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CodeMirror = window.CodeMirror;

  _ = window._;

  $ = window.$;

  moment = require('moment');

  View = require('./base').View;

  thrower = require('../util').thrower;

  FileEditItem = (function(_super) {
    __extends(FileEditItem, _super);

    function FileEditItem() {
      this.render = __bind(this.render, this);
      return FileEditItem.__super__.constructor.apply(this, arguments);
    }

    FileEditItem.prototype.el = $('.page-edit').remove().first().prop('outerHTML');

    FileEditItem.prototype.elements = {
      '.field-title  :input': '$title',
      '.field-date   :input': '$date',
      '.field-author :input': '$author',
      '.field-layout :input': '$layout',
      '.page-source  :input': '$source',
      '.page-preview': '$previewbar',
      '.page-source': '$sourcebar',
      '.page-meta': '$metabar'
    };

    FileEditItem.prototype.getCollectionSelectValues = function(collectionName) {
      var item, model, selectValues, _i, _len, _ref, _ref1;
      item = this.item;
      selectValues = [];
      selectValues.push($('<option>', {
        text: 'None',
        value: ''
      }));
      _ref1 = ((_ref = item.get('site').getCollectionFiles(collectionName)) != null ? _ref.models : void 0) || [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        model = _ref1[_i];
        selectValues.push($('<option>', {
          text: model.get('title') || model.get('name') || model.get('relativePath'),
          value: model.get('relativePath')
        }));
      }
      return selectValues;
    };

    FileEditItem.prototype.getOtherSelectValues = function(fieldName) {
      var item, selectValues;
      item = this.item;
      selectValues = _.uniq(item.get('site').get('files').pluck(fieldName));
      return selectValues;
    };

    FileEditItem.prototype.render = function() {
      var $author, $date, $el, $layout, $previewbar, $source, $title, item;
      item = this.item, $el = this.$el, $source = this.$source, $date = this.$date, $title = this.$title, $layout = this.$layout, $author = this.$author, $previewbar = this.$previewbar, $source = this.$source;
      $author.empty().append(this.getCollectionSelectValues('authors').concat(this.getOtherSelectValues('author')));
      $layout.empty().append(this.getCollectionSelectValues('layouts').concat(this.getOtherSelectValues('author')));
      this.point({
        item: item,
        itemAttributes: ['layout'],
        element: $layout
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['author'],
        element: $author
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['source'],
        element: $source
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['title', 'name', 'filename'],
        element: $title,
        itemSetter: true
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['url'],
        element: $previewbar,
        elementSetter: function(_arg) {
          var $el;
          $el = _arg.$el;
          return $el.attr({
            'src': item.get('site').get('url') + item.get('url')
          });
        }
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['date'],
        element: $date,
        elementSetter: function(_arg) {
          var el, value;
          el = _arg.el, value = _arg.value;
          if (value != null) {
            return $el.val(moment(value).format('YYYY-MM-DD'));
          }
        }
      }).bind();
      this.editor = CodeMirror.fromTextArea($source.get(0), {
        mode: item.get('contentType')
      });
      return this;
    };

    FileEditItem.prototype.cancel = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      this.item.reset(opts);
      next();
      return this;
    };

    FileEditItem.prototype.save = function(opts, next) {
      if (opts == null) {
        opts = {};
      }
      if (next == null) {
        next = thrower.bind(this);
      }
      this.item.sync(opts, next);
      return this;
    };

    return FileEditItem;

  })(View);

  FileListItem = (function(_super) {
    __extends(FileListItem, _super);

    function FileListItem() {
      this.render = __bind(this.render, this);
      return FileListItem.__super__.constructor.apply(this, arguments);
    }

    FileListItem.prototype.el = $('.content-table.files .content-row:last').remove().first().prop('outerHTML');

    FileListItem.prototype.elements = {
      '.content-name': '$title',
      '.content-cell-tags': '$tags',
      '.content-cell-date': '$date'
    };

    FileListItem.prototype.render = function() {
      var $date, $el, $tags, $title, item;
      item = this.item, $el = this.$el, $title = this.$title, $tags = this.$tags, $date = this.$date;
      this.point({
        item: item,
        itemAttributes: ['title', 'name', 'relativePath'],
        element: $title,
        elementSetter: function(_arg) {
          var $el, relativePath, title;
          $el = _arg.$el;
          title = item.get('title') || item.get('name');
          relativePath = item.get('relativePath');
          if (title) {
            $el.text(title);
            return $el.append('<br>' + relativePath);
          } else {
            return $el.text(relativePath);
          }
        }
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['tags'],
        element: $tags,
        elementSetter: function(_arg) {
          var $el, value;
          $el = _arg.$el, value = _arg.value;
          return $el.text((value || []).join(', ') || '');
        }
      }).bind();
      this.point({
        item: item,
        itemAttributes: ['date'],
        element: $date,
        elementSetter: function(_arg) {
          var $el, value;
          $el = _arg.$el, value = _arg.value;
          return $date.text((value != null ? value.toLocaleDateString() : void 0) || '');
        }
      }).bind();
      return this;
    };

    return FileListItem;

  })(View);

  module.exports = {
    FileEditItem: FileEditItem,
    FileListItem: FileListItem
  };

}).call(this);

},{"../util":22,"./base":24,"moment":9}],26:[function(require,module,exports){
(function() {
  var $, SiteListItem, View, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = window._;

  $ = window.$;

  View = require('./base').View;

  SiteListItem = (function(_super) {
    __extends(SiteListItem, _super);

    function SiteListItem() {
      this.render = __bind(this.render, this);
      return SiteListItem.__super__.constructor.apply(this, arguments);
    }

    SiteListItem.prototype.el = $('.content-table.sites .content-row:last').remove().first().prop('outerHTML');

    SiteListItem.prototype.elements = {
      '.content-name': '$name'
    };

    SiteListItem.prototype.render = function() {
      var $el, $name, item;
      item = this.item, $el = this.$el, $name = this.$name;
      $name.text(item.get('name') || item.get('url') || '');
      return this;
    };

    return SiteListItem;

  })(View);

  module.exports = {
    SiteListItem: SiteListItem
  };

}).call(this);

},{"./base":24}]},{},[17])