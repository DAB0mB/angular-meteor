(function(exports) {
  var mixins = [];

  afterEach(function() {
    mixins.splice(0).forEach(function(mixin) {
      delete mixin.__mixin__;
    });
  });

  exports.spyOnMixin = function(mixin) {
    mixins.push(mixin);
    mixin.__mixin__ = {};
  };
})(this);