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
