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
