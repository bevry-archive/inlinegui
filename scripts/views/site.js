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
