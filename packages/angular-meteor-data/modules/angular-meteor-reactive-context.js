angular.module('angular-meteor.reactive-context', ['angular-meteor.reactive-scope'])

.factory('$$ReactiveContext', function($rootScope) {
  let scopeAPI = ['getReactively', 'autorun', 'subscribe'];

  class $$ReactiveContext {
    constructor(context, $scope) {
      $scope = $scope || $rootScope.$new(true);

      if (!_.isObject(context))
        throw Error('argument 1 must be an object');
      if (!this._isScope($scope))
        throw Error('argument 2 must be a scope');

      this._context = context;
      this._scope = $scope;
    }

    helpers(props = {}) {
      if (!_.isObject(props))
        throw Error('argument 1 must be an object');

      _.each(props, (v, k) => {
        if (_.isFunction(v))
          this._setFnHelper(k, v);
        else
          this._setValHelper(k, v);
      });
    }

    _setFnHelper(k, fn) {
      this._scope.$autorun((compution) => {
        let model = fn.apply(this._context);

        Tracker.nonreactive(() => {
          if (this._isCursor(model)) {
            let observation = this._handleCursor(k, model);

            compution.onInvalidate(() => {
              observation.stop();
              this._context[k].splice(0);
            });
          }
          else {
            this._handleNonCursor(k, model);
          }

          this._changed(k);
        });
      });
    }

    _setValHelper(k, v) {
      console.warn(
        `defining '${k}' value helper, ` +
        `note that this feature will be deprecated in 1.4 in favor of using 'getReactively' - ` +
        `http://www.angular-meteor.com/api/1.3.1/get-reactively`
      );

      let isDeep = _.isObject(v);
      this._scope.$getReactively(this, k, isDeep);
      v = _.clone(v);

      Object.defineProperty(this._context, k, {
        configurable: true,
        enumerable: true,

        get: () => {
          this._depend();
          return v;
        },
        set: (newVal) => {
          v = newVal;
          this._changed(k);
        }
      });
    }

    _handleCursor(k, cursor) {
      if (angular.isUndefined(this._context[k])) {
        this._setValHelper(k, cursor.fetch());
      }
      else {
        let diff = jsondiffpatch.diff(this._context[k], cursor.fetch());
        jsondiffpatch.patch(this._context[k], diff);
      }

      let observation = cursor.observe({
        addedAt: (doc, atIndex) => {
          if (!observation) return;
          this._context[k].splice(atIndex, 0, doc);
          this._changed(k);
        },
        changedAt: (doc, oldDoc, atIndex) => {
          let diff = jsondiffpatch.diff(this._context[k][atIndex], doc);
          jsondiffpatch.patch(this._context[k][atIndex], diff);
          this._changed(k);
        },
        movedTo: (doc, fromIndex, toIndex) => {
          this._context[k].splice(fromIndex, 1);
          this._context[k].splice(toIndex, 0, doc);
          this._changed(k);
        },
        removedAt: (oldDoc, atIndex) => {
          this._context[k].splice(atIndex, 1);
          this._changed(k);
        }
      });

      return observation;
    }

    _handleNonCursor(k, data) {
      let v = this._context[k];

      if (angular.isDefined(v)) {
        console.warn(`overriding '${k} helper'`);
        delete this._context[k];
        v = null;
      }

      if (angular.isUndefined(v)) {
        this._setValHelper(k, data);
      }
      else if (_.isArray(v) && _.isArray(data)) {
        let diff = jsondiffpatch.diff(v, data);
        jsondiffpatch.patch(v, diff);
        this._changed(k);
      }
      else {
        this._context[k] = data;
      }
    }

    _depend(k) {
      this.$$dependencies[k].depend();
    }

    _changed(k) {
      this._digest();
      this.$$dependencies[k].changed();
    }

    _digest() {
      let isDigestable =
        this._scope &&
        !this._scope.$$destroyed &&
        !$rootScope.$$phase

      if (isDigestable) this._scope.$digest();
    }

    _isHash(obj) {
      return Object.getPrototypeOf(obj) === Object.prototype;
    }

    _isScope(obj) {
      let Scope = Object.getPrototypeOf($rootScope).constructor;
      return obj instanceof Scope;
    }

    _isCursor(obj) {
      return obj instanceof Mongo.Collection.Cursor;
    }
  }

  scopeAPI.forEach((method) => {
    $$ReactiveContext[method] = function(...args) {
      return this._scope[`$${method}`](...args);
    }
  });

  return $$ReactiveContext;
})

.factory('$reactive', function($$ReactiveContext) {
  let reactiveContextAPI = ['helpers', 'getReactively', 'autorun', 'subscribe'];

  function $reactive(context) {
    return _.extend(context, $reactive);
  }

  $reactive.attach = function($scope) {
    this._reactiveContext =
      this._reactiveContext ||
      new $$ReactiveContext(this, $scope);

    return this;
  };

  reactiveContextAPI.forEach((method) => {
    $$ReactiveContext[method] = function(...args) {
      this.attach()
      return this._reactiveContext[method](...args);
    }
  });

  return $reactive;
});
