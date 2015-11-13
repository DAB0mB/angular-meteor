angular.module('diff-array', [
  'updater'
])


.factory('DiffArray', [
  'Updater',

function(Updater) {
  var LocalCollection = Package['minimongo'].LocalCollection;
  var MongoId = Package['mongo-id'].MongoID;
  var DiffSequence = Package['diff-sequence'].DiffSequence;

  var idStringify = LocalCollection._idStringify || MongoID.idStringify;
  var idParse = LocalCollection._idParse || MongoID.idParse;
  var diffFn = LocalCollection._diffQueryOrderedChanges || DiffSequence.diffQueryOrderedChanges;

  // Calculates the differences between `lastSeqArray` and
  // `seqArray` and calls appropriate functions from `callbacks`.
  // Reuses Minimongo's diff algorithm implementation.
  // XXX Should be replaced with the original diffArray function here:
  // https://github.com/meteor/meteor/blob/devel/packages/observe-sequence/observe_sequence.js#L152
  // When it will become nested as well, tracking here: https://github.com/meteor/meteor/issues/3764
  function DiffArray(lastSeqArray, seqArray, callbacks, preventNestedDiff) {
    preventNestedDiff = !!preventNestedDiff;

    var oldObjIds = [];
    var newObjIds = [];
    var posOld = {};
    var posNew = {};
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

        callbacks.addedAt(seqArray[posNew[idStringify(id)]]);
      },

      removed: function (id) {
        var prevPosition = posCur[idStringify(id)];

        _.each(posCur, function (pos, id) {
          if (pos >= prevPosition) posCur[id]--;
        });

        delete posCur[idStringify(id)];
        lengthCur--;

        callbacks.removedAt(lastSeqArray[posOld[idStringify(id)]]);
      }
    });

    _.each(posNew, function (pos, idString) {
      if (!_.has(posOld, idString)) return;

      var id = idParse(idString);
      var newItem = seqArray[pos] || {};
      var oldItem = lastSeqArray[posOld[idString]];
      var updates = Updater.getUpdates(oldItem, newItem, preventNestedDiff);

      if (!_.isEmpty(updates))
        callbacks.changedAt(id, updates);
    });
  }

  return DiffArray;
}]);