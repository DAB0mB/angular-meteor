'use strict';

angular.module('angular-meteor.object',
  ['angular-meteor.entity'])

.factory('$meteorObject', [
  '$meteorEntity',
  function($meteorEntity) {
    // A list of internals properties to not watch for, nor pass to the Document on update and etc.
    var internalProps = [
      '$$hashkey', '_collection', '_eventEmitter', '_id', '_keys', '_options',
      '_autorun', '_computation', '_differentialUpdate', '_getId', '_getDoc', '_updateParallel', 
      'bind', 'raw', 'save', 'stop'
    ];

    function $meteorObject (collection, selector, options){
      var helpers = collection._helpers;
      // Make collection helpers accessible
      var data = _.isFunction(helpers) ? Object.create(helpers.prototype) : {};
      _.extend(data, $meteorObject);
      _.extend(data, $meteorEntity);

      data._collection = collection;
      data._options = options;
      data._id = data._getId(selector);
      data._computation = data._autorun();

      return data;
    }

    $meteorObject.raw = function () {
      var raw = _.pick(this, this._keys());
      return angular.copy(raw);
    };

    $meteorObject.save = function() {
      var raw = this.raw();
      var doc = this._getDoc();
      return this._differentialUpdate(this._id, raw, doc);
    };

    $meteorObject.stop = function () {
      this._computation.stop();
    };

    $meteorObject._getDoc = function() {
      return this._collection.findOne(this._id, this._options);
    };

    AngularMeteorObject._getId = function(selector) {
      var options = _.extend({}, this._options, { 
        fields: { _id: 1 },
        reactive: false,
        transform: null
      });

      var doc = this._collection.findOne(selector, options);

      if (doc) return doc._id;
      if (selector instanceof Mongo.ObjectID) return selector;
      if (_.isString(selector)) return selector;
      return new Mongo.ObjectID();
    };

    $meteorObject._autorun = function() {
      var self = this;

      return Tracker.autorun(function() {
        var doc = self._getDoc();
        Updater.update(self, doc);
      });
    };

    $meteorObject._keys = function() {
      var rawKeys = _.keys(this);
      return _.difference(rawKeys, internalProps);
    };

    return $meteorObject;
}]);