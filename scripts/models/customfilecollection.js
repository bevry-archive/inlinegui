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
