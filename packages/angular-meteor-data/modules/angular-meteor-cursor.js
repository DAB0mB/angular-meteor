'use strict';

angular.module('angular-meteor.cursor', ['angular-meteor.array'])

.factory('$meteorCursor', ['$meteorArray', function($meteorArray) {
  _.each(Mongo.Cursor.prototype, function(method, name) {
    if (!_.isFunction(method)) return;

    $meteorCursor.prototype[name] = function() {
      this._cursor[name].apply(this._cursor, arguments);
    };
  });

  function $meteorCursor(collection, selector, options) {
    if (!(this instanceof $meteorCursor))
      return new $meteorCursor(collection, selector, options);

    this._collection = collection;
    this._selector = selector;
    this._optioins = options;
    this._cursor = this._createCursor();
  }

  $meteorCursor.prototype.fetch = function() {
    return $meteorArray(this._createCursor.bind(this));
  };

  $meteorCursor.prototype._createCursor = function() {
    this._collection.find(this._selector, this._options);
  };

  return $meteorCursor;
}]);