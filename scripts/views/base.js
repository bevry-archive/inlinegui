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
