'use strict';

angular.module('angular-meteor.collection',
  ['angular-meteor.entity', 'angular-meteor.utils', 'angular-meteor.cursor', 'diffArray'])

// The reason angular meteor collection is a factory function and not something
// that inherit from array comes from here:
// http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
// We went with the direct extensions approach.
.factory('$meteorCollection', [
  '$meteorEntity', '$meteorUtils', '$meteorCursor', 'diffArray',
  function($meteorEntity, $meteorUtils, $meteorCursor, diffArray) {
    _.extend($meteorCollection, $meteorEntity);

    function $meteorCollection(reactiveFn) {
      var collection, cursor;

      if (_.isFunction(reactiveFn)) {
        cursor = reactiveFn();
        collection = $meteorUtils.getCollectionByName(cursor.collection.name);
      } else {
        collection = reactiveFn;
        reactiveFn = collection.find.bind(collection);
      }

      var data = [];
      _.extend(data, $meteorCollection);

      data._collection = collection;
      data._reactiveFn = reactiveFn;
      data._computation = data._autorun();

      return data;
    }

    $meteorCollection.save = function() {
      var self = this;
      var promises = [];
      var docs = self._reactiveFn().fetch();

      DiffArray(self, docs, function() {
        addedAt: function(item) {
          var promise = self._collection.insert(item);
          promises.push(promise);
        },

        removedAt: function(item) {
          var promise = self._collection.remove(item);
          promises.push(promise);
        },

        changedAt: function(id, modifer) {
          var promise = self._collection._differentialUpdate(id, modifier);
          promises.push(promise);
        }
      });

      return $meteorUtils.promiseAll(promises);
    };

    $meteorCollection.stop = function() {
      this._computation.stop();
      this._observation.stop();
    };

    $meteorCollection._autorun = function() {
      var self = this;

      return Tracker.autorun(function() {
        // When the reactive func gets recomputated we need to stop observations
        Tracker.onInvalidate(function() {
          self._observation.stop();
          self.splice(0);
        });

        var cursor = self._reactiveFn();
        self._observation = self._observe(cursor);
      });
    };

    $meteorCollection._observe = function(cursor) {
      var self = this;

      return cursor.observe({
        addedAt: function(doc, atIndex) {
          self.splice(atIndex, 0, doc);
        },

        changedAt: function(doc, oldDoc, atIndex) {
          Updater.update(self[atIndex], doc);
        },

        movedTo: function(doc, fromIndex, toIndex) {
          self.splice(fromIndex, 1);
          self.splice(toIndex, 0, doc);
        },

        removedAt: function(oldDoc) {
          var removedIndex = self._getIndexById(oldDoc);
          if (removedIndex != -1) self.splice(removedIndex, 1);
        }
      });
    };

    $meteorCollection._getIndexById = function(doc) {
      var foundDoc = _.find(this, function(colDoc) {
        // EJSON.equals used to compare Mongo.ObjectIDs and Strings.
        return EJSON.equals(colDoc._id, doc._id);
      });

      return _.indexOf(this, foundDoc);
    };

    return $meteorCollection;
}]);
