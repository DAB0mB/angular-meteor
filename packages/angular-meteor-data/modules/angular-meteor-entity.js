'use strict';

angular.module('angular-meteor.entity', 
  ['angular-meteor.utils'])

.service('$meteorEntity', [
  '$q', '$meteorUtils',
  function($q, $meteorUtils) {
    var $meteorEntity = this;
    var modificationMethods = ['insert', 'update', 'remove'];

    // performs $pull operations parallely.
    // used for handling splice operations returned from getUpdates() to prevent conflicts.
    // see issue: https://github.com/Urigo/angular-meteor/issues/793
    $meteorEntity._updateDiff = function(selector, modifier) {
      var setters = _.omit(modifier, '$pull');
      var modifiers = [setters];

      _.each(modifier.$pull, function(pull, prop) {
        var puller = {};
        puller[prop] = pull;
        modifiers.push({ $pull: puller });
      });

      return $meteorEntity._updateParallel(selector, modifiers);
    };

    // performs each update operation parallely
    $meteorEntity._updateParallel = function(selector, modifiers) {
      var promises = modifiers.map(function(modifier) {
        return $meteorEntity.update(selector, modifier);
      });

      return $meteorUtils.promiseAll(promises);
    };

    modificationMethods.forEach(function(method) {
      $meteorEntity[method] = function(selectors) {
        var self = this;
        var restArgs = [].slice.call(arguments, 2);
        selectors = [].concat(selectors);

        var promises = selectors.map(function(selector) {
          var deferred = $q.defer();
          var callback = $meteorUtils.callbackPromise(deferred, false);
          var args = [].concat(selector, restArgs, callback);
          self._collection[method].apply(self._collection, args);
          return deferred.promise;
        });

        return $meteorUtils.promiseAll(promises);
      };
    });
}]);
