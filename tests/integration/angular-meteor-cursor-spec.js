fdescribe('AngularMeteorCursor()', function() {
  var AngularMeteorCursor;
  var AngularMeteorObject;
  var Collection;
  var cursor;

  beforeEach(angular.mock.module('angular-meteor.cursor'));
  beforeEach(angular.mock.module('angular-meteor.object'));

  beforeEach(angular.mock.inject(function(_AngularMeteorCursor_, _AngularMeteorObject_) {
    AngularMeteorCursor = _AngularMeteorCursor_;
    AngularMeteorObject = _AngularMeteorObject_;
  }));

  beforeEach(function() {
    jasmine.addMatchers(customMatchers);
  });

  beforeEach(function() {
    Collection = new Meteor.Collection(null);
    Collection.insert({ a: 1 });
    Collection.insert({ b: 2 });
    Collection.insert({ c: 3 });
    cursor = new AngularMeteorCursor(Collection);
  });

  it('should initialize document ids', function() {
    var ids = _.pluck(Collection.find().fetch(), '_id');
    expect(cursor._ids).toEqual(ids);
  });

  it('should initialize document ids given specific options and no _id filed', function() {
    var selector = {
      $or: [
        { b: 2 },
        { c: 3 }
      ]
    };

    var options = {
      fileds: {
        _id: 0
      },

      limit: 1
    };

    var cursor = new AngularMeteorCursor(Collection, selector, options);
    var ids = _.pluck(Collection.find().fetch(), '_id');
    expect(cursor._ids[0]).toEqual(ids[1]);
  });

  describe('#fetch()', function() {
    it('should fetch collection and transform to AngularMeteorObject', function() {
      spyOnMixin(AngularMeteorObject);
      var collection = cursor.fetch();

      expect(collection.length).toEqual(3);
      expect(collection[0].a).toEqual(1);
      expect(collection[1].b).toEqual(2);
      expect(collection[2].c).toEqual(3);

      collection.forEach(function(obj, i) {
        expect(obj).toBeMixedWith(AngularMeteorObject);
      });
    });
  });

  describe('#count()', function() {
    it('should return documents number', function() {
      expect(cursor.count()).toEqual(Collection.find().count());
    });
  });

  describe('#observe()', function() {
    it('should observe collection with documents wrapped by $meteorObject', function() {
      spyOnMixin(AngularMeteorObject);

      spyOn(Meteor.Cursor.prototype, 'observe').and.callFake(function(callbacks) {
        callbacks.added({});
        callbacks.addedAt({}, 0, '');
        callbacks.changed({}, {});
        callbacks.changedAt({}, {}, 0);
        callbacks.removed({});
        callbacks.removedAt({}, 0);
        callbacks.movedTo({}, 0, 0, '');
      });

      var callbacks = {
        added: function(obj) {
          expect(obj).toBeMixedWith(AngularMeteorObject);
        },

        addedAt: function(obj, i, nextId) {
          expect(obj).toBeMixedWith(AngularMeteorObject);
          expect(i).toEqual(jasmine.any(Number));
          expect(nextId).toEqual(jasmine.any(String));
        },

        changed: function(obj, oldObj) {
          expect(obj).toBeMixedWith(AngularMeteorObject);
          expect(oldObj).toBeMixedWith(AngularMeteorObject);
        },

        changedAt: function(obj, oldObj, i) {
          expect(obj).toBeMixedWith(AngularMeteorObject);
          expect(oldObj).toBeMixedWith(AngularMeteorObject);
          expect(i).toEqual(jasmine.any(Number));
        },

        removed: function(oldObj) {
          expect(oldObj).toBeMixedWith(AngularMeteorObject);
        },

        removedAt: function(oldObj, i) {
          expect(oldObj).toBeMixedWith(AngularMeteorObject);
          expect(i).toEqual(jasmine.any(Number));
        },

        movedTo: function(obj, oldIndex, i, nextId) {
          expect(obj).toBeMixedWith(AngularMeteorObject);
          expect(oldIndex).toEqual(jasmine.any(Number));
          expect(i).toEqual(jasmine.any(Number));
          expect(nextId).toEqual(jasmine.any(String));
        }
      };

      cursor.observe(callbacks);
      expect(Mongo.Cursor.prototype.observe).toHaveBeenCalledWith(callbacks);
    });
  });

  describe('#observeChanges()', function() {
    it('should observe collection changes', function() {
      spyOn(Mongo.Cursor.prototype, 'observeChanges');
      var callbacks = {};

      cursor.observeChanges(callbacks);
      expect(Mongo.Cursor.prototype.observeChanges).toHaveBeenCalledWith(callbacks);
    });
  });

  ['each', 'map', 'reduce', 'reduceRight', 'find', 'filter', 'where', 'findWhere', 'reject'].forEach(function(method) {
    describe('#' + method + '()', function() {
      it('should call _.' + method + ' on a fetched collection', function() {
        spyOn(AngularMeteorCursor.prototype, 'fetch').and.callThrough();

        spyOn(_.prototype, method).and.returnValue({ 
          value: function() {
            return 'result';
          }
        });

        var result = cursor[method](1, 2, 3);
        expect(AngularMeteorCursor.prototype.fetch).toHaveBeenCalled();
        expect(_.prototype[method]).toHaveBeenCalled();
        expect(result).toEqual('result');
      });
    });
  });
});