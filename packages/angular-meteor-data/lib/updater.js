'use strict';

(function() {
  var module = angular.module('updater', []);

  var utils = (function() {
    var rip = function(obj, level) {
      if (level < 1) return {};

      return _.reduce(obj, function(clone, v, k) {
        v = _.isObject(v) ? rip(v, --level) : v;
        clone[k] = v;
        return clone;
      }, {});
    };

    var toPaths = function(obj) {
      var keys = getKeyPaths(obj);
      var values = getDeepValues(obj);
      return _.object(keys, values);
    };

    var getKeyPaths = function(obj) {
      var keys = _.keys(obj).map(function(k) {
        var v = obj[k];
        if (!_.isObject(v) || _.isEmpty(v) || _.isArray(v)) return k;

        return getKeyPaths(v).map(function(subKey) {
          return k + '.' + subKey;
        });
      });

      return _.flatten(keys);
    };

    var getDeepValues = function(obj, deepValues) {
      deepValues = deepValues || [];

      _.values(obj).forEach(function(v) {
        if (!_.isObject(v) || _.isEmpty(v) || _.isArray(v))
          deepValues.push(v);
        else
          getDeepValues(v, deepValues);
      });

      return deepValues;
    };

    var flatten = function(arr) {
      return arr.reduce(function(flattened, v, i) {
        if (_.isArray(v) && !_.isEmpty(v))
          flattened.push.apply(flattened, flatten(v));
        else
          flattened.push(v);

        return flattened;
      }, []);
    };

    var setDefined = function(obj, k, v) {
      if (!_.isEmpty(v)) obj[k] = v;
    };

    var setDeep = function(obj, keyPath, v) {
      var split = keyPath.split('.');
      var initialKeys = _.initial(split);
      var lastKey = _.last(split);

      initialKeys.reduce(function(subObj, k, i) {
        var nextKey = split[i + 1];

        if (isNumStr(nextKey)) {
          if (subObj[k] == null) subObj[k] = [];
          if (subObj[k].length == parseInt(nextKey)) subObj[k].push(null);
        }

        else if (subObj[k] == null || !isHash(subObj[k])) {
          subObj[k] = {};
        }

        return subObj[k];
      }, obj);

      var deepObj = getDeep(obj, initialKeys);
      deepObj[lastKey] = v;
      return v;
    };

    var unsetDeep = function(obj, keyPath) {
      var split = keyPath.split('.');
      var initialKeys = _.initial(split);
      var lastKey = _.last(split);
      var deepObj = getDeep(obj, initialKeys);

      if (_.isArray(deepObj) && isNumStr(lastKey))
        return !!deepObj.splice(lastKey, 1);
      else
        return delete deepObj[lastKey];
    };

    var getDeep = function(obj, keys) {
      return keys.reduce(function(subObj, k) {
        return subObj[k];
      }, obj);
    };

    var isHash = function(obj) {
      return _.isObject(obj) &&
        Object.getPrototypeOf(obj) === Object.prototype;
    };

    var isNumStr = function(str) {
      return str.match(/^\d+$/);
    };

    var assert = function(result, msg) {
      if (!result) throwErr(msg);
    };

    var throwErr = function(msg) {
      throw Error('updater error - ' + msg);
    };

    return {
      rip: rip,
      toPaths: toPaths,
      getKeyPaths: getKeyPaths,
      getDeepValues: getDeepValues,
      setDefined: setDefined,
      setDeep: setDeep,
      unsetDeep: unsetDeep,
      getDeep: getDeep,
      isHash: isHash,
      isNumStr: isNumStr,
      assert: assert,
      throwErr: throwErr
    };
  })();

  var getDifference = (function() {
    var getDifference = function(dst, src, isShallow) {
      var level;

      if (isShallow > 1)
        level = isShallow;
      else if (isShallow)
        level = 1;

      if (level) {
        dst = utils.rip(dst, level);
        src = utils.rip(src, level);
      }

      return compare(dst, src);
    };

    var compare = function(dst, src) {
      var dstKeys = _.keys(dst);
      var srcKeys = _.keys(src);

      var keys = _.chain([])
        .concat(dstKeys)
        .concat(srcKeys)
        .uniq()
        .without('$$hashKey')
        .value();

      return keys.reduce(function(diff, k) {
        var dstValue = dst[k];
        var srcValue = src[k];

        if (_.isDate(dstValue) && _.isDate(srcValue)) {
          if (dstValue.getTime() != srcValue.getTime()) diff[k] = srcValue;
        }

        if (_.isObject(dstValue) && _.isObject(srcValue)) {
          var valueDiff = getDifference(dstValue, srcValue);
          utils.setDefined(diff, k, valueDiff);
        }

        else if (dstValue !== srcValue) {
          diff[k] = srcValue;
        }

        return diff;
      }, {});
    };

    return getDifference;
  })();

  var getUpdates = (function() {
    var getUpdates = function(dst, src, isShallow) {
      utils.assert(_.isObject(dst), 'first argument must be an object');
      utils.assert(_.isObject(src), 'second argument must be an object');

      var diff = getDifference(dst, src, isShallow);
      var paths = utils.toPaths(diff);

      var set = createSet(paths);
      var unset = createUnset(paths);
      var pull = createPull(unset);

      var updates = {};
      utils.setDefined(updates, '$set', set);
      utils.setDefined(updates, '$unset', unset);
      utils.setDefined(updates, '$pull', pull);

      return updates;
    };

    var createSet = function(paths) {
      var undefinedKeys = getUndefinedKeys(paths);
      return _.omit(paths, undefinedKeys);
    };

    var createUnset = function(paths) {
      var undefinedKeys = getUndefinedKeys(paths);
      var unset = _.pick(paths, undefinedKeys);

      return _.reduce(unset, function(result, v, k) {
        result[k] = true;
        return result;
      }, {});
    };

    var createPull = function(unset) {
      var arrKeyPaths = _.keys(unset).map(function(k) {
        var split = k.match(/(.*)\.\d+$/);
        return split && split[1];
      });

      return _.compact(arrKeyPaths).reduce(function(pull, k) {
        pull[k] = null;
        return pull;
      }, {});
    };

    var getUndefinedKeys = function(obj) {
      return _.keys(obj).filter(function (k) {
        var v = obj[k];
        return _.isUndefined(v);
      });
    };

    return getUpdates;
  })();

  var update = (function() {
    var update = function(dst, src) {
      utils.assert(_.isObject(dst), 'first argument must be an object');
      utils.assert(_.isObject(src), 'second argument must be an object');

      updateChanges(dst, src);
      updateRemovals(dst, src);
      return dst;
    };

    var updateChanges = function (dst, src) {
      var changes = getUpdates(dst, src).$set;

      _.each(changes, function(v, keyPath) {
        utils.setDeep(dst, keyPath, v);
      });
    };

    var updateRemovals = function (dst, src) {
      var removals = getUpdates(dst, src).$unset;

      _.each(removals, function(v, keyPath) {
        utils.unsetDeep(dst, keyPath);
      });
    };

    return update;
  })();

  module.value('Updater', {
    getUpdates: getUpdates,
    update: update
  });
})();
