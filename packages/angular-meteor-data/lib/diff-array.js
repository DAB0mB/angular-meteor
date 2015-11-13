'use strict';

angular.module('diffArray', 
  ['angular-meteor.utils', 'getUpdates'])

.factory('diffArray', [
  '$meteorUtils', 'getUpdates',
  function($meteorUtils, getUpdates) {
    var DiffSequence = Package['diff-sequence'].DiffSequence;
    var Minimongo = Package['minimongo'].Minimongo;
    var MongoID = Package['mongo-id'].MongoID;
    var idStringify = Minimongo.LocalCollection._idStringify || MongoID.idStringify;
    var idParse = Minimongo.LocalCollection._idParse || MongoID.idParse;

    // Calculates the differences between `lastSeqArray` and
    // `seqArray` and calls appropriate functions from `callbacks`.
    // Reuses Minimongo's diff algorithm implementation.
    // XXX Should be replaced with the original diffArray function here:
    // https://github.com/meteor/meteor/blob/devel/packages/observe-sequence/observe_sequence.js#L152
    // When it will become nested as well, tracking here: https://github.com/meteor/meteor/issues/3764
    function diffArray(lastSeqArray, seqArray, callbacks, level) {
      var diffFn = Minimongo.LocalCollection._diffQueryOrderedChanges ||
        DiffSequence.diffQueryOrderedChanges;

      var oldObjIds = [];
      var newObjIds = [];
      var posOld = {}; // maps from idStringify'd ids
      var posNew = {}; // ditto
      var posCur = {};
      var lengthCur = lastSeqArray.length;

      _.each(seqArray, function (doc, i) {
        newObjIds.push({_id: doc._id});
        posNew[idStringify(doc._id)] = i;
      });

      _.each(lastSeqArray, function (doc, i) {
        oldObjIds.push({_id: doc._id});
        posOld[idStringify(doc._id)] = i;
        posCur[idStringify(doc._id)] = i;
      });

      // Arrays can contain arbitrary objects. We don't diff the
      // objects. Instead we always fire 'changedAt' callback on every
      // object. The consumer of `observe-sequence` should deal with
      // it appropriately.
      diffFn(oldObjIds, newObjIds, {
        addedBefore: function (id, doc, before) {
          var position = before ? posCur[idStringify(before)] : lengthCur;

          _.each(posCur, function (pos, id) {
            if (pos >= position) posCur[id]++;
          });

          lengthCur++;
          posCur[idStringify(id)] = position;

          callbacks.addedAt(id,
            seqArray[posNew[idStringify(id)]],
            position,
            before
          );
        },

        movedBefore: function (id, before) {
          var prevPosition = posCur[idStringify(id)];
          var position = before ? posCur[idStringify(before)] : lengthCur - 1;

          _.each(posCur, function (pos, id) {
            if (pos >= prevPosition && pos <= position)
              posCur[id]--;
            else if (pos <= prevPosition && pos >= position)
              posCur[id]++;
          });

          posCur[idStringify(id)] = position;

          callbacks.movedTo(id,
            seqArray[posNew[idStringify(id)]],
            prevPosition,
            position,
            before
          );
        },

        removed: function (id) {
          var prevPosition = posCur[idStringify(id)];

          _.each(posCur, function (pos, id) {
            if (pos >= prevPosition) posCur[id]--;
          });

          delete posCur[idStringify(id)];
          lengthCur--;

          callbacks.removedAt(id,
            lastSeqArray[posOld[idStringify(id)]],
            prevPosition
          );
        }
      });

      _.each(posNew, function (pos, idString) {
        if (!_.has(posOld, idString)) return;

        var id = idParse(idString);
        var newItem = seqArray[pos] || {};
        var oldItem = lastSeqArray[posOld[idString]];
        var updates = getUpdates(oldItem, newItem, level);

        if (!_.isEmpty(updates))
          callbacks.changedAt(id, updates, pos, oldItem);
      });
    }

    diffArray.shallow = function(lastSeqArray, seqArray, callbacks) {
      return diffArray(lastSeqArray, seqArray, callbacks, true);
    };

    diffArray.deepCopyChanges = function (oldItem, newItem) {
      var setDiff = getUpdates(oldItem, newItem).$set;

      _.each(setDiff, function(v, deepKey) {
        $meteorUtils.setDeep(oldItem, deepKey, v);
      });
    };

    diffArray.deepCopyRemovals = function (oldItem, newItem) {
      var unsetDiff = getUpdates(oldItem, newItem).$unset;

      _.each(unsetDiff, function(v, deepKey) {
        $meteorUtils.unsetDeep(oldItem, deepKey);
      });
    };

    // Finds changes between two collections
    diffArray.getChanges = function(newCollection, oldCollection, diffMethod) {
      var changes = {added: [], removed: [], changed: []};

      diffMethod(oldCollection, newCollection, {
        addedAt: function(id, item, index) {
          changes.added.push({item: item, index: index});
        },

        removedAt: function(id, item, index) {
          changes.removed.push({item: item, index: index});
        },

        changedAt: function(id, updates, index, oldItem) {
          changes.changed.push({selector: id, modifier: updates});
        },

        movedTo: function(id, item, fromIndex, toIndex) {
          // XXX do we need this?
        }
      });

      return changes;
    };

    return diffArray;
}]);
