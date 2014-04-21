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
