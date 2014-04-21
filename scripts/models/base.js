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
