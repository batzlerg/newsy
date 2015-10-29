"use strict";
var newsy = require('../newsy');
var assert = require('assert');
var path = require('path');
describe('newsy', function () {
    var TestConstructor;
    var TestDependency;
    var testInstance;
    beforeEach(function () {
        newsy.newRegistry();
        TestDependency = function () {};
        TestDependency.newsy = {name: 'TestDependency'};
        TestConstructor = function (arg1, arg2, arg3) {
            this.constructed = true;
            this.arg1 = arg1;
            this.arg2 = arg2;
            this.arg3 = arg3;
        };
        TestConstructor.newsy = {
            name: 'TestConstructor',
            builds: ['TestDependency']
        };
        newsy.register(TestConstructor);
        newsy.register(TestDependency);
        testInstance = newsy('TestConstructor');
    });
    afterEach(function () {
        newsy.restoreRegistry();
    });
    it('should reset completely when reset is called', function () {
        var Foo = function () {};
        Foo.newsy = {
            name: 'Foo'
        };
        newsy.newRegistry();
        newsy.register(Foo);
        assert(newsy._registry.Foo);
        newsy.newRegistry();
        assert(!newsy._registry.Foo);
        newsy.restoreRegistry();
        newsy.restoreRegistry();
    });
    it('should get constructor when passed as an option', function () {
        assert.equal(newsy.getConstructor({key: 'TestConstructor'}), TestConstructor);
    });
    it('should use the default constructor when the constructor can not be found by key', function () {
        var defaultConstructor = function () {};
        assert.equal(newsy.getConstructor({key: 'asefTestConstructor', defaultConstructor: defaultConstructor}), defaultConstructor);
    });
    describe('register', function () {
        it('should register an array of constructors', function () {
            newsy.newRegistry();
            newsy.register([TestConstructor, TestDependency]);
            assert(newsy._registry.TestConstructor);
            assert(newsy._registry.TestDependency);
            newsy.restoreRegistry();
        });
    });
    describe('build', function () {
        it('should throw an exception when attempting to build an instance with unmet dependencies', function () {
            var exceptionThrown;
            var UnFulfilledTestConstructor = function () {};
            newsy.newRegistry();
            UnFulfilledTestConstructor.newsy = {
                name: 'UnFulfilledTestConstructor',
                builds: ['TestDependency', 'AnotherTestDependencyParent']
            };
            newsy.register(UnFulfilledTestConstructor);
            exceptionThrown = false;
            try {
                newsy('UnFulfilledTestConstructor');
            } catch (e) {
                exceptionThrown = true;
            }
            assert(exceptionThrown);
            var AnotherTestDependencyParent = function () {};
            AnotherTestDependencyParent.newsy = {
                name: 'AnotherTestDependencyParent',
                builds: ['AnotherTestDependencyChild']
            };
            newsy.register(AnotherTestDependencyParent);
            exceptionThrown = false;
            try {
                newsy('UnFulfilledTestConstructor');
            } catch (e) {
                exceptionThrown = true;
            }
            assert(exceptionThrown);
            newsy.register(TestDependency);
            exceptionThrown = false;
            try {
                newsy('UnFulfilledTestConstructor');
            } catch (e) {
                exceptionThrown = true;
            }
            assert(exceptionThrown);
            var AnotherTestDependencyChild = function () {};
            AnotherTestDependencyChild.newsy = {name: 'AnotherTestDependencyChild'};
            newsy.register(AnotherTestDependencyChild);
            newsy('UnFulfilledTestConstructor');
            newsy.restoreRegistry();
        });
        it('should relay remaining arguments over to the constructor', function () {
            var myInstance = newsy('TestConstructor', 'foo', 'bar', 'baz');
            assert.equal(myInstance.arg1, 'foo');
            assert.equal(myInstance.arg2, 'bar');
            assert.equal(myInstance.arg3, 'baz');
        });
        it('should throw an exception when attempting to build an unregistered constructor', function () {
            var exceptionThrown;
            try {
                newsy('UnregisteredConstructor');
            } catch (e) {
                exceptionThrown = true;
            }
            assert(exceptionThrown);
        });
        it('should create a new instance of a registered constructor', function () {
            assert(testInstance instanceof TestConstructor);
            assert.equal(testInstance.constructor, TestConstructor);
        });
        it('should actually run the constructor', function () {
            assert(testInstance.constructed);
        });
    });
    it('should use the global registry when present', function () {
        var modpath = path.resolve(__dirname + "/../newsy.js");
        require.cache[modpath] = undefined;
        global.__newsyRegistry__ = {'testglobal': {originalConstructor: 'foo bar foo'}};
        assert.equal(require('../').getConstructor('testglobal'), 'foo bar foo');
    });
});
