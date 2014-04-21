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
