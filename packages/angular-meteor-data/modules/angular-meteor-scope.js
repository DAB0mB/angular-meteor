'use strict';

angular.module('angular-meteor.scope', 
  ['angular-meteor.utils', 'angular-meteor.collection', 'angular-meteor.object'])

.run([
  '$rootScope', '$parse', '$meteorUtils', '$meteorCollection', '$meteorObject',
  function($rootScope, $parse, $meteorUtils, $meteorCollection, $meteorObject) {
    var Scope = Object.getPrototypeOf($rootScope).constructor;

    var stoppables = {
      '$collection': $meteorcollection,
      '$object': $meteorObject,
      '$autorun': $meteorUtils.autorun,
      '$subscribe': $meteorUtils.subscribe
    };

    Scope.prototype.$bindSessionVariable = function(sessionVariableName, scopeModelName) {
      var self = this;
      var getter = $parse(scopeModelName);
      var setter = getter.assign;

      self.$autorun(self, function() {
        setter(self, Session.get(sessionVariableName));
      });

      self.$watch(scopeModelName, function(newItem, oldItem) {
        Session.set(sessionVariableName, getter(self));
      }, true);
    };

    Scope.prototype.$getReactively = function(property, objectEquality) {
      var self = this;
      var getValue = $parse(property);

      if (!self.hasOwnProperty('$$trackerDeps'))
        self.$$trackerDeps = {};

      if (!self.$$trackerDeps[property]) {
        self.$$trackerDeps[property] = new Tracker.Dependency();

        self.$watch(function() {
          return getValue(self);
        }, function(newVal, oldVal) {
          if (newVal !== oldVal) self.$$trackerDeps[property].changed();
        }, objectEquality);
      }

      self.$$trackerDeps[property].depend();
      return getValue(self);
    };

    Scope.prototype.$getCollectionReactively = function(property) {
      var self = this;
      var getValue = $parse(property);

      if (!self.hasOwnProperty('$$trackerDeps'))
        self.$$trackerDeps = {};

      if (!self.$$trackerDeps[property]) {
        self.$$trackerDeps[property] = new Tracker.Dependency();

        self.$watchCollection(property, function() {
          self.$$trackerDeps[property].changed();
        });
      }

      self.$$trackerDeps[property].depend();
      return getValue(self);
    };

    _.each(stoppables, function(creator, name) {
      Scope.prototype[name] = function() {
        var stoppable = creator.apply(null, arguments);

        this.$on('$destroy', function() {
          stoppable.stop();
        });

        return stoppable;
      };
    });
}]);