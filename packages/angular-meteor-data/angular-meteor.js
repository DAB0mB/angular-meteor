// Define angular-meteor and its dependencies
angular.module('angular-meteor', [
  'angular-meteor.cursor',
  'angular-meteor.entity',
  'angular-meteor.collection',
  'angular-meteor.object',
  'angular-meteor.scope',
  'angular-meteor.utils'
])


.service('$meteor', [
  '$meteorCursor',
  '$meteorCollection',
  '$meteorObject',
  '$meteorUtils',

function($meteorCursor, $meteorCollection, $meteorObject, $meteorUtils) {
  this.collection = $meteorCollection;
  this.object = $meteorObject;
  this.cursor = $meteorCursor;
  this.utils = $meteorUtils;
  _.extend(this, $meteorUtils);
}])


.config([
  '$provide',

function ($provide) {
  var templateFileExtensions = ['html', 'tpl', 'tmpl', 'template', 'view'];

  $provide.decorator('$templateCache', [
    '$delegate',

  function($delegate) {
    var get = $delegate.get;

    $delegate.get = function(templatePath) {
      var result = get(templatePath);
      if (result == null) return result;

      var fileExtension = templatePath
        .split('.')
        .reverse()
        .concat('')
        .shift()
        .toLowerCase();

      if (!_.contains(templateFileExtensions, fileExtension))
        throw Error(
          '[angular-meteor][err][404] ' + templatePath + 
          ' - template format is not supported'
        );

      return result;
    };

    return $delegate;
  }]);
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
