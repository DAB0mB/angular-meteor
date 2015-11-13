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

    function $meteorCollection(arg1) {
      var reactiveFn, collection, cursor, collectionName;

      if (_.isFunction(arg1)) {
        reactiveFn = arg1;
        cursor = reactiveFn();
        collectionName = cursor.collection.name;
        collection = $meteorUtils.getCollectionByName(collectionName);
      } else {
        collection = arg1;
        reactiveFn = collection.find.bind(collection);
      }

      var data = [];
      _.extend(data, $meteorCollection);

      data._collection = collection;
      data._track(reactiveFn);

      return data;
    }

    $meteorCollection.find = function(selector, options) {
      return $meteorCursor(this._collection, selector, options);
    };

    $meteorCollection.findOne = function(selector, options) {
      options = _.extend({}, options, {
        limit: 1
      });

      return this.find(selector, options).fetch()[0];
    };

    $meteorCollection.getIndexById = function(doc) {
      var foundDoc = _.find(this, function(colDoc) {
        // EJSON.equals used to compare Mongo.ObjectIDs and Strings.
        return EJSON.equals(colDoc._id, doc._id);
      });

      return _.indexOf(this, foundDoc);
    };

    $meteorCollection.save = function() {
      var self = this;
      var promises = [];
      var changes = diffArray.getChanges();

      var addedDocs = _.pluck(changes.added, 'item');
      promises.push(self.insert(addedDocs));

      var removedDocs = _.pluck(changes.removed, 'item');
      promises.push(self.remove(removedDocs));

      // Updates changed documents
      changes.changed.forEach(function(descriptor) {
        promises.push(self._updateDiff(descriptor.selector, descriptor.modifier));
      });

      return $meteorUtils.promiseAll(promises);
    };

    $meteorCollection.stop = function() {
      this._stop('tracker');
      this._stop('observer');
    };

    $meteorCollection._track = function(reactiveFn) {
      var self = this;

      self._tracker = Tracker.autorun(function() {
        // When the reactive func gets recomputated we need to stop any previous observeChanges
        Tracker.onInvalidate(function() {
          self._stop('observer');
          self.splice(0);
        });

        var cursor = reactiveFn();
        self._observe(cursor);
      });
    };

    $meteorCollection._observe = function(cursor) {
      var self = this;
      this._stop('observer');

      self._observer = cursor.observe({
        addedAt: function(doc, atIndex) {
          self.splice(atIndex, 0, doc);
        },

        changedAt: function(doc, oldDoc, atIndex) {
          diffArray.deepCopyChanges(self[atIndex], doc);
          diffArray.deepCopyRemovals(self[atIndex], doc);
        },

        movedTo: function(doc, fromIndex, toIndex) {
          self.splice(fromIndex, 1);
          self.splice(toIndex, 0, doc);
        },

        removedAt: function(oldDoc) {
          var removedIndex = self.getIndexById(oldDoc);
          if (removedIndex != -1) self.splice(removedIndex, 1);
        }
      });
    };

    $meteorCollection._stop = function(threadName) {
      threadName = '_' + threadName;
      var thread = this[threadName];
      if (thread) thread.stop();
    };

    return $meteorCollection;
}]);
