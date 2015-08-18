'use strict';

var angularMeteorCursor = angular.module('angular-meteor.cursor', ['angular-meteor.object']);

angularMeteorCursor.factory('AngularMeteorCursor', [
  'AngularMeteorObject',
  function(AngularMeteorObject) {
    /*
      AngularMeteorCursor
      -------------------
      Wraps Mongo.Cursor and returns instances of AngularMeteorObject instead of raw documents.

      Although seems similiar in many ways, AngularMeteorCursor does not inherit from Mongo.Cursor
      due to problems implementing the API and many unnecessary methods that may cause conflicts.
     */
    function AngularMeteorCursor(collection, selector, options) {
      check(collection, Meteor.Collection);

      selector = selector || {};
      options = options || {};

      this._collection = collection;
      this._cursor = collection.find(selector, options);
    }

    AngularMeteorCursor.prototype.fetch = function() {
      return this._cursor.map(function(doc) {
        return new AngularMeteorObject(this._collection, doc._id);
      }, this);
    };

    // collection methods
    ['each', 'map', 'reduce', 'reduceRight', 'find', 'filter', 'where', 'findWhere', 'reject'].forEach(function(method) {
      AngularMeteorCursor.prototype[method] = function() {
        var collection = this.fetch();
        var chain = _.chain(collection);
        return chain[method].apply(chain, arguments).value();
      };
    });

    // native methods
    ['count', 'observe', 'observeChanges'].forEach(function(method) {
      AngularMeteorCursor.prototype[method] = function() {
        this._cursor[method].apply(this._cursor, arguments);
      };
    });

    return AngularMeteorCursor;
  }
]);