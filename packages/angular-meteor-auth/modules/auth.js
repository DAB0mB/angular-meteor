angular.module('angular-meteor.auth')


.service('$auth', function() {
  if (!Package['accounts-base'])
    throw Error(
      'Oops, looks like Accounts-base package is missing!' +
      'Please add it by running: meteor add accounts-base'
    );

  Tracker.autorun(() => {
    this.currentUser = Meteor.user();
    this.currentUserId = Meteor.userId();
    this.loggingIn = Meteor.loggingIn();
  });
})


.service('$$AuthScope', [
  '$q',

function($q) {
  this.waitForUser = function() {
    let deferred = $q.defer();

    this.autorun(() => {
      if (!Meteor.loggingIn()) deferred.resolve(Meteor.user());
    });

    return deferred.promise;
  };

  this.requireUser = function() {
    let deferred = $q.defer();

    this.autorun(() => {
      if (Meteor.loggingIn()) return;
      let currentUser = Meteor.user();

      if (currentUser)
        deferred.resolve(currentUser);
      else
        deferred.reject("AUTH_REQUIRED");
    });

    return deferred.promise;
  };

  this.requireValidUser = function(validate = angular.noop) {
    if (!_.isFunction(validate))
      throw Error('argument 1 must be a function');

    return this.requireUser().then((user) => {
      let isValid = validate(user);

      if (isValid === true) 
        return $q.resolve(user);
      if (_.isString(isValid))
        return $q.reject(isValid);

      return $q.reject(isValid);
    });
  };
}])


.run([
  '$rootScope',
  '$reactive',
  '$$ReactiveContext',
  '$$AuthScope',

function($rootScope, Reactive, ReactiveContext, AuthScope) {
  let scopeProto = Object.getPrototypeOf($rootScope);
  _.extend(scopeProto, AuthScope);

  let authAPI = [
    'waitForUser',
    'requireUser',
    'requireValidUser'
  ];

  authAPI.forEach((method) => {
    ReactiveContext.prototype[method] = function(...args) {
      return this._scope[method](...args);
    };

    Reactive[method] = function(...args) {
      this.attach();
      return this._reactiveContext[method](...args);
    };
  });
}]);
