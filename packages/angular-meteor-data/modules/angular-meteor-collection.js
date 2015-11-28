'use strict';

angular.module('angular-meteor.collection',
  ['angular-meteor.utils', 'angular-meteor.cursor', 'angular-meteor.object'])

// The reason angular meteor collection is a factory function and not something
// that inherit from array comes from here:
// http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
// We went with the direct extensions approach.
.factory('$meteorCollection', [
  '$meteorEntity', '$meteorUtils', '$meteorCursor', 'diffArray',
  function($meteorEntity, $meteorUtils, $meteorCursor, diffArray) {
    var modMethods = ['insert', 'update', 'remove'];

    modMethods.forEach(function(method) {
      $meteorCollection.prototype[method] = function(selectors) {
        var self = this;
        var restArgs = [].slice.call(arguments, 2);
        selectors = [].concat(selectors);

        var promises = selectors.map(function(selector) {
          var deferred = $q.defer();
          var callback = $meteorUtils.callbackPromise(deferred, false);
          var args = [].concat(selector, restArgs, callback);
          self._collection.apply(self._collection, args);
          return deferred.promise;
        });

        return $meteorUtils.promiseAll(promises);
      };
    });

    function $meteorCollection(collection) {
      if (!(this instanceof $meteorCollection)) 
        return new $meteorCollection(collection);

      if (_.isString(collection))
        collection = $meteorUtils.getCollectionByName(collection);

      if (!(collection instanceof Mongo.Collection))
        throw Error('first argument must be a name of a collection or an instance of Mongo.Collection');

      this._collection = collection;
    }

    $meteorCollection.prototype.find = function(selector, options) {
      options = options || {};

      if (options.raw)
        return this._collection.find(selector, options);

      return $meteorCursor(this._collection, selector, options);
    };

    $meteorCollection.prototype.findOne = function(selector, options) {
      options = options || {};

      if (options.raw)
        return this._collection.findOne(selector, options);

      return $meteorObject(this._collection, selector, options);
    };

    return $meteorCollection;
}]);
