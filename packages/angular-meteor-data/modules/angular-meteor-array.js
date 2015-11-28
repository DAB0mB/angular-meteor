'use strict';

angular.module('angular-meteor.collection', ['updater'])

// The reason angular meteor collection is a factory function and not something
// that inherit from array comes from here:
// http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
// We went with the direct extensions approach.
.factory('$meteorArray', ['Updater', function(Updater) {
  function $meteorArray(collection, selector, options) {
    var arr = [];
    _.extend(arr, $meteorArray);

    arr._collection = collection;
    arr._selector = selector;
    arr._options = options;

    arr.track();
    return arr;
  }

  $meteorArray.track = function() {
    var self = this;

    self._tracker = Tracker.autorun(function() {
      // When the reactive func gets recomputated we need to stop any previous observations
      Tracker.onInvalidate(function() {
        this._observer.stop();
        self.splice(0);
      });

      self._observe();
    });
  };

  $meteorArray.stop = function() {
    if (this._tracker) this._tracker.stop();
  };

  $meteorArray._observe = function() {
    var self = this;
    var cursor = this._collection.find(this._selector, this._options);

    self._observer = cursor.observe({
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

  $meteorArray._getIndexById = function(doc) {
    var foundDoc = _.find(this, function(colDoc) {
      // EJSON.equals used to compare Mongo.ObjectIDs and Strings.
      return EJSON.equals(colDoc._id, doc._id);
    });

    return _.indexOf(this, foundDoc);
  };

  return $meteorArray;
}]);
