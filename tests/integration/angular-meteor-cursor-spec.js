fdescribe('AngularMeteorCursor()', function() {
  var AngularMeteorCursor;
  var AngularMeteorObject;
  var Collection;

  beforeEach(angular.mock.module('angular-meteor.cursor'));
  beforeEach(angular.mock.module('angular-meteor.object'));

  beforeEach(angular.mock.inject(function(_AngularMeteorCursor_, _AngularMeteorObject_) {
    AngularMeteorCursor = _AngularMeteorCursor_;
    AngularMeteorObject = _AngularMeteorObject_;
  }));

  beforeEach(function() {
    Collection = new Meteor.Collection(null);
    Collection.insert({ a: 1 });
    Collection.insert({ b: 2 });
    Collection.insert({ c: 3 });
  });

  describe('#fetch()', function() {
    it('should fetch collection and transform to AngularMeteorObject()', function() {
      spyOn(AngularMeteorObject, 'getRawObject');

      var cursor = new AngularMeteorCursor(Collection);
      var collection = cursor.fetch();

      expect(collection.length).toEqual(3);
      expect(collection[0].a).toEqual(1);
      expect(collection[1].b).toEqual(2);
      expect(collection[2].c).toEqual(3);

      collection.forEach(function(obj, i) {
        obj.getRawObject();
        expect(AngularMeteorObject.getRawObject.calls.count()).toEqual(i + 1);
      });
    });
  });

  ['each', 'map', 'reduce', 'reduceRight', 'find', 'filter', 'where', 'findWhere', 'reject'].forEach(function(method) {
    describe('#' + method + '()', function() {
      it('should call _.' + method + '() on a fetched collection', function() {
        spyOn(AngularMeteorCursor.prototype, 'fetch').and.callThrough();

        spyOn(_.prototype, method).and.returnValue({ 
          value: function() {
            return 'result';
          }
        });

        var cursor = new AngularMeteorCursor(Collection, {});
        var result = cursor[method](1, 2, 3);

        expect(AngularMeteorCursor.prototype.fetch).toHaveBeenCalled();
        expect(_.prototype[method]).toHaveBeenCalled();
        expect(result).toEqual('result');
      });
    });
  });

  ['count', 'observe', 'observeChanges'].forEach(function(method) {
    describe('#' + method + '()', function() {
      it('should call Mongo.Cursor#' + method + '()', function() {
        spyOn(Mongo.Cursor.prototype, method);
        var cursor = new AngularMeteorCursor(Collection, {});

        cursor[method](1, 2, 3);
        expect(Mongo.Cursor.prototype[method]).toHaveBeenCalledWith(1, 2, 3);
      });
    });
  });
});