'use strict';

angular.module('angular-meteor.cursor', ['angular-meteor.object'])

.factory('AngularMeteorCursor', [
  '$meteorObject',
  function($meteorObject) {
    /*
      AngularMeteorCursor
      -------------------
      Wraps Mongo.Cursor and returns instances of AngularMeteorObject instead of raw documents.

      Although seems similiar in many ways, AngularMeteorCursor does not inherit from Mongo.Cursor
      due to problems implementing the API and many unnecessary methods that may cause conflicts.

      Arguments:
      • collection - A Meteor.Collection or similiar.
      • selector (optional) - Cursor's selector object.
      • options (optional) - Cursor's options object. In addition, can set auto save for created
        AngularMeteorObjects using the 'autoSave' property. Will auto save by default.
     */
    function AngularMeteorCursor(collection, selector, options) {
      selector = _.isObject(selector) ? selector : {};
      options = _.isObject(options) ? options : {};

      this._collection = collection;
      this._selector = selector;
      this._autoSave = options.autoSave;
      this._options = _.omit(options, 'autoSave');
      this._cursor = collection.find(selector, options);
      this._initIds();
    }

    // gets results wrapped with $meteorObject
    AngularMeteorCursor.prototype.fetch = function() {
      this._cursor.fetch(); // registering a dependency
      return this._ids.map(this._createObject.bind(this));
    };

    // counts the number of documents
    AngularMeteorCursor.prototype.count = function() {
      return this._ids.length;
    };

    // observes collection with documents wrapped by $meteorObject
    AngularMeteorCursor.prototype.observe = function(callbacks) {
      var self = this;

      var wrappers = _.reduce(callbacks, function(wrappers, callback, k) {
        if (!_.isFunction(callback)) return wrappers;

        var wrapper = function(doc) {
          var args = _.toArray(arguments);
          args[0] = self._createObject(doc);
          callback.apply(null, args);
        };

        wrappers[k] = wrapper;
        return wrappers;
      }, {});

      return this._cursor.observe(wrappers);
    };

    // observes collection changes
    AngularMeteorCursor.prototype.observeChanges = function(callbacks) {
      return this._cursor.observeChanges(callbacks);
    };

    // initializes the ids of all the matching documents
    AngularMeteorCursor.prototype._initIds = function() {
      var options = _.extend({}, this._options, { 
        fields: { _id: 1 },
        reactive: false,
        transform: null
      });

      var docs = this._collection.find(this._selector, options).fetch();
      this._ids = _.pluck(docs, '_id');
    };

    // creates AngularMeteorObject
    AngularMeteorCursor.prototype._createObject = function() {
      var id = arguments[0]._id || arguments[0];
      return $meteorObject(this._collection, id, this._autoSave, this._options);
    };

    // collection methods
    ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'filter', 'where', 'findWhere', 'reject'].forEach(function(method) {
      AngularMeteorCursor.prototype[method] = function() {
        var collection = this.fetch();
        var chain = _.chain(collection);
        return chain[method].apply(chain, arguments).value();
      };
    });

    return AngularMeteorCursor;
  }
])

.factory('$meteorCursor', [
  'AngularMeteorCursor',
  function(AngularMeteorCursor) {
    // another optional form of creating a cursor
    function $meteorCursor(collection, selector, options) {
      return new AngularMeteorCursor(collection, selector, options);
    }

    return $meteorCursor;
  }
]);