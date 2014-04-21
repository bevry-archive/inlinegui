(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"events":2}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var dominject,
    __hasProp = {}.hasOwnProperty;

  dominject = function(opts) {
    var attrs, done, el, err, finish, img, key, next, onError, onLoad, onTimeout, parent, timeout, timer, type, url, value;
    type = opts.type, url = opts.url, attrs = opts.attrs, timeout = opts.timeout, next = opts.next;
    attrs || (attrs = {});
    if (timeout == null) {
      timeout = 60 * 1000;
    }
    done = false;
    timer = null;
    parent = null;
    if (next == null) {
      next = function(err) {
        if (err) {
          throw err;
        }
      };
    }
    el = document.getElementById(url) || null;
    if (el != null) {
      next(null, el);
      return el;
    }
    finish = function(err) {
      if (err == null) {
        err = null;
      }
      if (!!done) {
        return;
      }
      done = true;
      el.onload = el.onreadystatechange = null;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      if (err && el && parent) {
        parent.removeChild(el);
        el = null;
      }
      next(err, el);
      return el;
    };
    onLoad = function() {
      if (!(!done && (!this.readyState || this.readyState === 'loaded' || this.readyState || 'complete'))) {
        return;
      }
      return finish();
    };
    onError = function() {
      var err;
      if (!!done) {
        return;
      }
      err = new Error('the url ' + url + ' failed to be injected');
      return finish(err);
    };
    onTimeout = function() {
      var err;
      if (!!done) {
        return;
      }
      err = new Error('the url ' + url + ' took too long to be injected and timed out');
      return finish(err);
    };
    switch (type) {
      case 'script':
        el = document.createElement('script');
        if (attrs.defer == null) {
          attrs.defer = true;
        }
        if (attrs.src == null) {
          attrs.src = url;
        }
        if (attrs.id == null) {
          attrs.id = url;
        }
        for (key in attrs) {
          if (!__hasProp.call(attrs, key)) continue;
          value = attrs[key];
          el.setAttribute(key, value);
        }
        el.onload = el.onreadystatechange = onLoad;
        el.onerror = onError;
        parent = document.body;
        parent.appendChild(el);
        break;
      case 'style':
        el = document.createElement('link');
        if (attrs.rel == null) {
          attrs.rel = 'stylesheet';
        }
        if (attrs.href == null) {
          attrs.href = url;
        }
        if (attrs.id == null) {
          attrs.id = url;
        }
        for (key in attrs) {
          if (!__hasProp.call(attrs, key)) continue;
          value = attrs[key];
          el.setAttribute(key, value);
        }
        el.onload = el.onreadystatechange = onLoad;
        el.onerror = onError;
        parent = document.head;
        parent.appendChild(el);
        img = document.createElement('img');
        img.onerror = onLoad;
        img.src = url;
        break;
      default:
        err = new Error('the url ' + url + ' has an unknown inject type of ' + type);
        return finish(err);
    }
    if (timeout) {
      timer = setTimeout(onTimeout, timeout);
    }
    return el;
  };

  module.exports = dominject;

}).call(this);

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

},{"typechecker":5}],7:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Generated by CoffeeScript 1.7.1
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

},{"__browserify_process":3,"ambi":6,"domain":1,"events":2}],8:[function(require,module,exports){
(function() {
  var App, TaskGroup, dominject, sendMessage, wait, waiter, _ref;

  if (parent === self) {
    return;
  }

  TaskGroup = require('taskgroup').TaskGroup;

  dominject = require('dominject');

  _ref = require('./util'), wait = _ref.wait, waiter = _ref.waiter, sendMessage = _ref.sendMessage;

  App = (function() {
    function App() {}

    App.prototype.load = function(opts, next) {
      return new TaskGroup({
        concurrency: 0,
        tasks: [
          function(complete) {
            return dominject({
              type: 'script',
              url: '//cdnjs.cloudflare.com/ajax/libs/ckeditor/4.2/ckeditor.js',
              next: complete
            });
          }
        ],
        next: next
      }).run();
    };

    App.prototype.loaded = function(opts, next) {
      var editable, editables, _i, _len;
      document.body.className += ' inlinegui-actived';
      editables = document.getElementsByClassName('inlinegui-editable');
      for (_i = 0, _len = editables.length; _i < _len; _i++) {
        editable = editables[_i];
        editable.setAttribute('contenteditable', true);
      }
      if (typeof CKEDITOR !== "undefined" && CKEDITOR !== null) {
        CKEDITOR.disableAutoInline = true;
        [].slice.call(editables).forEach(function(editable) {
          var editor;
          editor = CKEDITOR.inline(editable);
          return editor.on('change', function() {
            return sendMessage({
              action: 'change',
              url: editable.getAttribute('about'),
              attribute: editable.getAttribute('property'),
              value: editor.getData()
            });
          });
        });
      }
      sendMessage({
        action: 'childLoaded',
        height: document.body.scrollHeight
      });
      waiter(100, function() {
        return sendMessage({
          action: 'resizeChild',
          height: document.body.scrollHeight
        });
      });
      return typeof next === "function" ? next() : void 0;
    };

    return App;

  })();

  window.onload = function() {
    var app;
    app = new App();
    return app.load({}, function(err) {
      if (err) {
        throw err;
      }
      return app.loaded({}, function(err) {
        if (err) {
          throw err;
        }
      });
    });
  };

}).call(this);

},{"./util":9,"dominject":4,"taskgroup":7}],9:[function(require,module,exports){
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

},{}]},{},[8])