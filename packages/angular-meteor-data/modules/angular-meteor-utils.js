'use strict';

angular.module('angular-meteor.utils', [])

.service('$meteorUtils', [
  '$q', '$timeout',
  function ($q, $timeout) {
    var $meteorUtils = this;
    var helpers = {};

    $meteorUtils.call = function() {
      var deferred = $q.defer();
      var callback = $meteorUtils.callbackPromise(deferred);
      var args = _.toArray(arguments).concat(callback);
      Meteor.call.apply(Meteor, args);
      return deferred.promise;
    };

    $meteorUtils.autorun = function(fn) {
      // wrapping around Deps.autorun
      var tracker = Tracker.autorun(function(c) {
        fn(c);
        // this is run immediately for the first call
        // but after that, we need to $apply to start Angular digest
        if (!c.firstRun) $timeout(angular.noop);
      });

      // return autorun object so that it can be stopped manually
      return tracker;
    };

    $meteorUtils.subscribe = function(name) {
      var subscribeArgs = [].slice.call(arguments, 1);
      var readyDeffered = $q.defer();
      var stopDeffered = $q.defer();

      var callbacks = {
        onReady: $meteorUtils.callbackPromise(readyDeffered),
        onStop: $meteorUtils.callbackPromise(stopDeffered),
      };

      var args = [].concat(name, subscribeArgs, callbacks);
      var subscribe = Meteor.subscribe.apply(Meteor, args);
      $meteorUtils.bindPromise(subscribe.ready, readyDeffered.promise);
      $meteorUtils.bindPromise(subscribe.stop, stopDeffered.promise);
      return subscribe;
    };

    $meteorUtils.promise = function(digest) {
      var deferred = $q.deferred();
      var promise = deferred.promise;
      helpers.finallyDigest(promise, digest);
      return promise;
    };

    // creates a $q.all() promise and call digestion loop on fulfillment
    $meteorUtils.promiseAll = function(promises, digest) {
      var allPromise = $q.all(promises);
      helpers.finallyDigest(allPromise, digest);
      return allPromise;
    };

    // Returns a callback which fulfills promise
    $meteorUtils.callbackPromise = function(deferred, digest) {
      var promise = deferred.promise;
      helpers.finallyDigest(promise, digest);

      return function(err, result) {
        return err ? deferred.reject(err) : deferred.resolve(result);
      };
    };

    $meteorUtils.bindPromise = function(obj, promise) {
      var promiseMethods = ['then', 'catch', 'finally'];

      promiseMethods.forEach(function(k) {
        obj[k] = promise[k].bind(promise);
      }); 
    };

    $meteorUtils.getCollectionByName = function(string){
      return Mongo.Collection.get(string);
    };

    $meteorUtils.setDeep = function(obj, deepKey, v) {
      var split = deepKey.split('.');
      var initialKeys = _.initial(split);
      var lastKey = _.last(split);

      initialKeys.reduce(function(subObj, k, i) {
        var nextKey = split[i + 1];

        if ($meteorUtils.isNumStr(nextKey)) {
          if (subObj[k] == null) subObj[k] = [];
          if (subObj[k].length == parseInt(nextKey)) subObj[k].push(null);
        }

        else if (subObj[k] == null || !$meteorUtils.isHash(subObj[k])) {
          subObj[k] = {};
        }

        return subObj[k];
      }, obj);

      var deepObj = $meteorUtils.getDeep(obj, initialKeys);
      deepObj[lastKey] = v;
      return v;
    };

    $meteorUtils.unsetDeep = function(obj, deepKey) {
      var split = deepKey.split('.');
      var initialKeys = _.initial(split);
      var lastKey = _.last(split);
      var deepObj = $meteorUtils.getDeep(obj, initialKeys);

      if (_.isArray(deepObj) && $meteorUtils.isNumStr(lastKey))
        return !!deepObj.splice(lastKey, 1);
      else
        return delete deepObj[lastKey];
    };

    $meteorUtils.getDeep = function(obj, keys) {
      return keys.reduce(function(subObj, k) {
        return subObj[k];
      }, obj);
    };

    $meteorUtils.isHash = function(obj) {
      return _.isObject(obj) &&
        Object.getPrototypeOf(obj) === Object.prototype;
    };

    $meteorUtils.isNumStr = function(str) {
      return str.match(/^\d+$/);
    };

    helpers.finallyDigest = function(promise, digest) {
      digest = _.isBoolean(digest) ? digest : true;
      if (!digest) return;

      promise.finally(function() {
        $timeout(angular.noop);
      });
    };
}]);