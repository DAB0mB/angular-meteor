'use strict';

angular.module('angular-meteor.cursor', 
  ['angular-meteor.object'])

.factory('$meteorCursor', [
  '$timeout', '$meteorObject',
  function($timeout, $meteorObject) {
    var iterationMethods = ['each', 'map', 'reduce', 'filter', 'reject'];

    /*
      $meteorCursor
      -------------------
      Wraps Mongo.Cursor and returns instances of $meteorObject instead of raw documents.
      Although seems similiar in many ways, $meteorCursor does not inherit from Mongo.Cursor
      due to problems implementing the API and many unnecessary methods that may cause conflicts.
      Arguments:
      • collection - A Meteor.Collection or similiar.
      • selector (optional) - Cursor's selector object.
      • options (optional) - Cursor's options object.
     */
    function $meteorCursor(collection, selector, options) {
      if (!(this instanceof $meteorCursor))
        return new $meteorCursor(collection, selector, options);

      selector = _.isObject(selector) ? selector : {};
      options = _.isObject(options) ? options : {};

      this._collection = collection;
      this._selector = selector;
      this._options = options;
      this._cursor = collection.find(selector, options);
      this._initIds();
    }

    // gets results wrapped with $meteorObject
    $meteorCursor.prototype.fetch = function() {
      this._cursor.fetch(); // registering a dependency
      return this._ids.map(this._createObject.bind(this));
    };

    // counts the number of documents
    $meteorCursor.prototype.count = function() {
      return this._ids.length;
    };

    // rewinds cursor
    $meteorCursor.prototype.rewind = function() {
      return this._cursor.rewind();
    };

    // observes collection with documents wrapped by $meteorObject
    $meteorCursor.prototype.observe = function(callbacks) {
      var self = this;

      var wrappers = _.reduce(callbacks, function(wrappers, callback, k) {
        if (!_.isFunction(callback)) return wrappers;

        wrappers[k] = function(doc1, doc2) {
          var args = _.toArray(arguments);
          args[0] = self._createObject(doc1);
          args[1] = self._createObject(doc2);
          callback.apply(null, args);
          $timeout(angular.noop);
        };

        return wrappers;
      }, {});

      return this._cursor.observe(wrappers);
    };

    $meteorCursor.prototype.observeChanges = function() {
      return this._cursor.apply(this._cursor, arguments);
    };

    // initializes the ids of all the matching documents
    $meteorCursor.prototype._initIds = function() {
      var options = _.extend({}, this._options, { 
        fields: { _id: 1 },
        reactive: false,
        transform: null
      });

      var docs = this._collection.find(this._selector, options).fetch();
      this._ids = _.pluck(docs, '_id');
    };

    // creates AngularMeteorObject
    $meteorCursor.prototype._createObject = function(arg1) {
      if (!_.isObject(arg1)) return arg1;
      var id = arg1._id || arg1;
      return $meteorObject(this._collection, id, this._options);
    };

    // iteration methods
    iterationMethods.forEach(function(method) {
      $meteorCursor.prototype[method] = function() {
        var collection = this.fetch();
        var chain = _.chain(collection);
        return chain[method].apply(chain, arguments).value();
      };
    });

    return $meteorCursor;
}]);