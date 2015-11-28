'use strict';

angular.module('angular-meteor.object', [])

.factory('$meteorObject', function() {
  // Blacklist of properties that should not be reseted
  var internalProps = [
    '$$hashkey', '_collection', '_eventEmitter', '_id', '_keys', '_options', '_track',
    '_tracker', 'bind', 'reset', 'stop'
  ];

  function $meteorObject (collection, selector, options){
    var helpers = collection._helpers;
    var obj = _.isFunction(helpers) ? Object.create(helpers.prototype) : {};
    _.extend(obj, $meteorObject);

    // Omit options that may spoil document finding
    // Common use in $meteorCollection.find()
    obj._options = _.omit(options, 'skip', 'limit');
    obj._collection = collection;
    obj._id = obj._getId(selector);

    obj.track();
    return obj;
  }

  $meteorObject.track = function() {
    var self = this;

    this._tracker = Tracker.autorun(function() {
      self._reset();
    });
  };

  $meteorObject.stop = function () {
    if (this._tracker) this._tracker.stop();
  };

  $meteorObject._reset = function() {
    var self = this;
    var doc = self._collection.findOne(self._id, self._options);

    self._keys().forEach(function(k) {
      delete self[k];
    });

    _.extend(self, doc);
  };

  $meteorObject._keys = function() {
    var rawKeys = _.keys(this);
    return _.difference(rawKeys, internalProps);
  };

  $meteorObject.prototype._getId = function(selector) {
    var options = _.extend({}, this._options, { 
      fields: { _id: 1 },
      reactive: false,
      transform: null
    });

    var doc = this._collection.findOne(selector, options);
    return doc._id;
  };

  return $meteorObject;
});
