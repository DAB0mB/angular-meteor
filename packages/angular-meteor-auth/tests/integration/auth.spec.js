var testedModule = 'angular-meteor.auth';

describe('angular-meteor', function () {
  describe(testedModule, function () {
    beforeEach(angular.mock.module(testedModule));

    var $compile;
    var $rootScope;
    var $reactive
    var $auth;
    var testScope;

    beforeEach(angular.mock.inject(function (_$compile_, _$rootScope_, _$reactive_, _$auth_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $reactive = _$reactive_;
      $auth = _$auth_;
      testScope = $rootScope.$new();
    }));

    afterEach(function (done) {
      $rootScope.$destroy();

      Meteor.logout(function () {
        done();
      });
    });

    it('Should put auth methods on rootScope', function () {
      expect($rootScope.waitForUser).toBeDefined();
      expect($rootScope.requireUser).toBeDefined();
      expect($rootScope.requireValidUser).toBeDefined();
    });

    it('Should put auth methods on every scope created', function () {
      var newScope = $rootScope.$new();
      expect(newScope.waitForUser).toBeDefined();
      expect(newScope.requireUser).toBeDefined();
      expect(newScope.requireValidUser).toBeDefined();
    });

    it('Should put auth methods on every isolated scope created', function () {
      var newScope = $rootScope.$new(true);
      expect(newScope.waitForUser).toBeDefined();
      expect(newScope.requireUser).toBeDefined();
      expect(newScope.requireValidUser).toBeDefined();
    });

    it('Should put auth methods on every reactive context created', function() {
      var context = $reactive({});
      expect(context.waitForUser).toBeDefined();
      expect(context.requireUser).toBeDefined();
      expect(context.requireValidUser).toBeDefined();
    });

    it('Should currentUser return empty value when there is no user logged in', function () {
      expect($auth.currentUser).toBe(null);
    });

    it('Should loggingIn change when logging in', function (done) {
      expect($auth.loggingIn).toBe(false);
      Meteor.insecureUserLogin('tempUser', function () {
        expect($auth.loggingIn).toBe(true);
        done();
      });
    });

    it('Should loggingIn change when logging out', function (done) {
      expect($auth.loggingIn).toBe(false);
      Meteor.insecureUserLogin('tempUser', function () {
        expect($auth.loggingIn).toBe(true);

        Meteor.logout(function () {
          expect($auth.loggingIn).toBe(false);
          done();
        });
      });
    });

    it('Should waitForUser return a promise and resolve it when user logs in', function (done) {
      var promise = $rootScope.waitForUser();

      promise.then(function () {
        done();
      });

      Meteor.insecureUserLogin('tempUser', function () {
        expect($auth.loggingIn).toBe(true);
        $rootScope.$apply();
      });
    });

    it('Should requireUser return a promise and reject it immediately when user is not logged in', function (done) {
      var promise = $rootScope.requireUser();

      promise.then(angular.noop, function () {
        done();
      });

      $rootScope.$apply();
    });

    it('Should requireUser return a promise and resolve it immediately when user is logged in', function (done) {
      Meteor.insecureUserLogin('tempUser', function () {
        $rootScope.$apply();

        var promise = $rootScope.requireUser();

        promise.then(function () {
          done();
        });

        $rootScope.$apply();
      });
    });

    it('Should requireValidUser return a promise and resolve it immediately when user is logged in with the validation method', function (done) {
      Meteor.insecureUserLogin('tempUser', function () {
        $rootScope.$apply();

        var spy = jasmine.createSpy().and.returnValue(true);
        var promise = $rootScope.requireValidUser(spy);

        promise.then(function () {
          expect(spy).toHaveBeenCalled();
          done();
        });

        $rootScope.$apply();
      });
    });

    it('Should requireValidUser return a promise and reject it immediately when user is logged in and validation method return false', function (done) {
      Meteor.insecureUserLogin('tempUser', function () {
        $rootScope.$apply();

        var spy = jasmine.createSpy().and.returnValue(false);
        var promise = $rootScope.requireValidUser(spy);

        promise.then(angular.noop, function () {
          done();
        });

        $rootScope.$apply();
      });
    });
  });
});