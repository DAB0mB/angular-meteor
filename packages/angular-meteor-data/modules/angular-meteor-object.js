'use strict';

angular.module('angular-meteor.object',
  ['angular-meteor.entity', 'angular-meteor.utils', 'getUpdates'])

.factory('$meteorObject', [
  '$q', '$meteorEntity', '$meteorUtils', 'getUpdates',
  function($q, $meteorEntity, $meteorUtils, getUpdates) {
    // A list of internals properties to not watch for, nor pass to the Document on update and etc.
    $meteorObject._internalProps = [
      '$$hashkey', '_collection', '_eventEmitter', '_id', '_internalProps', '_keys', '_modify', '_options',
      '_scope', '_track', '_tracker', '_updateDiff', '_updateParallel', 'bind', 'getRawObject', 'insert',
      'remove', 'reset', 'save', 'stop', 'update'
    ];

    function $meteorObject (collection, id, options){
      id = id || new Mongo.ObjectID();
      // Omit options that may spoil document finding
      // Common use in $meteorCollection.find()
      options = _.omit(options, 'skip', 'limit');

      var helpers = collection._helpers;
      // Make collection helpers accessible
      var data = _.isFunction(helpers) ? Object.create(helpers.prototype) : {};
      _.extend(data, $meteorObject);

      data._collection = collection;
      data._options = options;
      data._id = id;
      data._track();

      return data;
    }

    $meteorObject.getRawObject = function () {
      var raw = _.pick(this._keys());
      return angular.copy(raw);
    };

    $meteorObject.save = function() {
      var doc = this.getRawObject();
      var oldDoc = this._collection.findOne(this._id);
      // insert object if not exist
      if (!oldDoc) return this.insert(doc);

      var mods = getUpdates(oldDoc, doc);
      // do nothing if no changes were made
      if (_.isEmpty(mods)) return $q.when();

      // update object if changes were made
      return this._updateDiff(mods);
    };

    $meteorObject.reset = function() {
      var self = this;
      var doc = self._collection.findOne(self._id, self._options);

      self._keys().forEach(function(k) {
        delete self[k];
      });

      _.extend(self, doc);
    };

    $meteorObject.stop = function () {
      if (this._tracker) this._tracker.stop();
    };

    $meteorObject._track = function() {
      var self = this;

      this._tracker = Tracker.autorun(function() {
        self.reset();
      });
    };

    $meteorObject._keys = function() {
      var rawKeys = _.keys(this);
      return _.difference(rawKeys, this._internalProps);
    };

    _.each($meteorEntity, function(v, k) {
      $meteorObject[k] = function() {
        var args = [].concat(this._id, _.toArray(arguments));
        return v.apply(this, args);
      };
    });

    return $meteorObject;
}]);
