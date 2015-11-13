// Define angular-meteor and its dependencies
angular.module('angular-meteor', [
  'angular-meteor.cursor',
  'angular-meteor.entity',
  'angular-meteor.collection',
  'angular-meteor.object',
  'angular-meteor.scope',
  'angular-meteor.utils'
])

// Putting all services under $meteor service for syntactic sugar
.service('$meteor', [
  '$meteorCursor', '$meteorCollection', '$meteorObject', '$meteorUtils',
  function($meteorCursor, $meteorCollection, $meteorObject, $meteorUtils) {
    this.collection = $meteorCollection;
    this.object = $meteorObject;
    this.cursor = $meteorCursor;
    this.utils = $meteorUtils;
    _.extend(this, $meteorUtils);
}])

.run([
  '$compile', '$document', '$rootScope', '$timeout',
  function ($compile, $document, $rootScope, $timeout) {
    var IonRouter = Package['iron:router'];
    if (!IonRouter) return;

    var Router = IonRouter.Router;
    var appLoaded = false;

    // Recompile after iron:router builds page
    Router.onAfterAction(function(req, res, next) {
      Tracker.afterFlush(function() {
        if (appLoaded) return;
        $compile($document)($rootScope);
        $timeout(angular.noop);
        appLoaded = true;
      });
    });
}]);
