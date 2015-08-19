'use strict';

var angularMeteorCursor = angular.module('angular-meteor.cursor', ['angular-meteor.object']);

angularMeteorCursor.factory('AngularMeteorCursor', [
  '$meteorObject',
  function($meteorObject) {
    /*
      AngularMeteorCursor
      -------------------
      Wraps Mongo.Cursor and returns instances of AngularMeteorObject instead of raw documents.

      Although seems similiar in many ways, AngularMeteorCursor does not inherit from Mongo.Cursor
      due to problems implementing the API and many unnecessary methods that may cause conflicts.
     */
    function AngularMeteorCursor(collection, selector, options) {
      check(collection, Meteor.Collection);

      selector = _.isObject(selector) ? selector : {};
      options = _.isObject(options) ? options : {};

      this._collection = collection;
      this._selector = selector;
      this._options = options;
      this._cursor = collection.find(selector, options);
      this._initIds();
    }

    // gets results wrapped with $meteorObject
    AngularMeteorCursor.prototype.fetch = function() {
      return this._ids.map(this._createObject.bind(this));
    };

    // counts the number of documents
    AngularMeteorCursor.prototype.count = function() {
      return this._ids.length;
    };

    // observes collection with documents wrapped by $meteorObject
    AngularMeteorCursor.prototype.observe = function(callbacks) {
      var self = this;
      var wrappers = {};

      if (callbacks.added) wrappers.added = function(doc) {
        var obj = self._createObject(doc);
        callbacks.added(obj);
      };

      if (callbacks.addedAt) wrappers.addedAt = function(doc, i, nextId) {
        var obj = self._createObject(doc);
        callbacks.addedAt(doc, i, nextId);
      };

      if (callbacks.changed) wrappers.changed = function(doc, oldDoc) {
        var obj = self._createObject(doc);
        var oldObj = self._createObject(oldDoc);
        callbacks.changed(obj, oldObj);
      };

      if (callbacks.changedAt) wrappers.changedAt = function(doc, oldDoc, i) {
        var obj = self._createObject(doc);
        var oldObj = self._createObject(oldDoc);
        callbacks.changedAt(obj, oldObj, i);
      };

      if (callbacks.removed) wrappers.removed = function(oldDoc) {
        var oldObj = self._createObject(oldDoc);
        callbacks.removed(oldObj);
      };

      if (callbacks.removedAt) wrappers.removedAt = function(oldDoc, oldIndex) {
        var oldObj = self._createObject(oldDoc);
        callbacks.removedAt(oldObj, oldIndex);
      };

      if (callbacks.movedTo) wrappers.movedTo = function(doc, oldIndex, i, nextId) {
        var obj = self._createObject(doc);
        callbacks.movedTo(doc, oldIndex, i, nextId);
      };

      this._cursor.observe(wrappers);
    };

    // observes collection changes
    AngularMeteorCursor.prototype.observeChanges = function(callbacks) {
      this._cursor.observeChanges(callbacks);
    };

    // initializes the ids of all the matching documents
    AngularMeteorCursor.prototype._initIds = function() {
      var options = _.omit(this._options, 'fields');
      _.extend(options, { fields: { _id: 1 } });

      var docs = this._collection.find(this._selector, options).fetch();
      this._ids = _.pluck(docs, '_id');
    };

    // creates $meteorObject out of own properties
    AngularMeteorCursor.prototype._createObject = function() {
      var id = arguments[0]._id || arguments[0];
      return $meteorObject(this._collection, id, this._collection._isAutoBind, this._options);
    };

    // collection methods
    ['each', 'map', 'reduce', 'reduceRight', 'find', 'filter', 'where', 'findWhere', 'reject'].forEach(function(method) {
      AngularMeteorCursor.prototype[method] = function() {
        var collection = this.fetch();
        var chain = _.chain(collection);
        return chain[method].apply(chain, arguments).value();
      };
    });

    return AngularMeteorCursor;
  }
]);