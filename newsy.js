"use strict";

// Builds a new instance of the constructor from the given key, with additional arguments passed to the contructor.
// @param {string} key - the key that was associated with the constructor in a prior call to register
var registryStack = [];
var newsy = module.exports = function (key) {
    if (!newsy._registry[key]) {
        throw new Error(key + " is not a registered constructor");
    }
    if (newsy._registry[key].unsatisfiedDependencies) {
        throw new Error(key + " has unmet dependencies: " + Object.keys(newsy._registry[key].unsatisfiedDependencies).join(", "));
    }
    return newsy._registry[key].build(Array.prototype.splice.call(arguments, 1));
};
newsy._registry = global.__newsyRegistry__ = global.__newsyRegistry__ || {};
// saves the current registry onto the private registryStack, and exposes a new registry. Only useful for testing
newsy.newRegistry = function () {
    registryStack.push(newsy._registry);
    global.__newsyRegistry__ = newsy._registry = {};
};

// pops the top of registryStack onto the current registry, replacing what was already there.
newsy.restoreRegistry = function () {
    global.__newsyRegistry__ = newsy._registry = registryStack.pop();
};

// Registers a new constructor to be associated with a key.
// @param {String} key - key with with the constructor will be associated
// @param {Constructor} constructor - constructor that will be assocaited with the key
newsy.register = function (constructor, key) {
    var key;
    var dependencyIndex;
    var dependencyKey;
    var registration;
    var i;
    if (constructor instanceof Array) {
        for (i = 0; i < constructor.length; ++i) {
            newsy.register(constructor[i]);
        }
        return;
    }
    if (!constructor.newsy && !key) {
        throw new Error("constructor does not have a 'newsy' property and no key was provided to newsy.register");
    }
    if (!key && "string" === typeof constructor.newsy) {
        key = constructor.newsy;
    } else if (!key && constructor.newsy.name) {
        key = constructor.newsy.name;
    }
    if (!key) {
        throw new Error("constructor does not have a newsy name. Specify it as static.newsy or static.newsy.name, or as the second argument to newsy.register");
    }
    registration = newsy._registry[key] = {
        build: function (args) {
            function F() {
                return constructor.apply(this, args);
            }
            F.prototype = constructor.prototype;
            return new F();
        },
        originalConstructor: constructor,
        unsatisfiedDependencies: undefined
    };
    // build a truth map of the current unmet dependencies
    if (constructor.newsy && constructor.newsy.builds) {
        for (dependencyIndex = 0; dependencyIndex < constructor.newsy.builds.length; ++dependencyIndex) {
            dependencyKey = constructor.newsy.builds[dependencyIndex];
            if (!newsy._registry[dependencyKey]) {
                if (!registration.unsatisfiedDependencies) {
                    registration.unsatisfiedDependencies = {};
                }
                // declare dependencyKey to be a dependency of key
                registration.unsatisfiedDependencies[dependencyKey] = true;
            }
        }
    }
    if (!registration.unsatisfiedDependencies) {
        newsy._dependencySatisfied(key);
    }
    return constructor;
};

newsy.getConstructor = function (options) {
    var Constructor;
    if ("string" === typeof options) {
        options = {key: options};
    }
    if (!options.key) {
        throw new Error('constructor key required for getConstructor');
    }
    Constructor = newsy._registry[options.key];
    Constructor = (Constructor && Constructor.originalConstructor) || options.defaultConstructor;
    if (!Constructor) {
        throw new Error("No constructor for key " + options.key);
    }
    return Constructor;
};

// declares a dependency as fully satisfied, and proparages the change through the entire dependency graph
newsy._dependencySatisfied = function (key) {
    var anyAreTrue;
    var registryKey;
    var dependencyKey;
    var newUnsatisfiedDependencies;
    var oldUnsatisfiedDependencies;
    // iterate through all the registered constructors
    for (registryKey in newsy._registry) {
        if (newsy._registry.hasOwnProperty(registryKey)) {
            if (!newsy._registry[registryKey].unsatisfiedDependencies) {
                // registryKey has no unsatisfied dependencies to begin with
                continue;
            }
            if (!newsy._registry[registryKey].unsatisfiedDependencies[key]) {
                // key was not a dependency of registryKey to begin with
                continue;
            }
            // remove key as a dependency of registryKey
            newsy._registry[registryKey].unsatisfiedDependencies[key] = false;
            newUnsatisfiedDependencies = {};
            oldUnsatisfiedDependencies = newsy._registry[registryKey].unsatisfiedDependencies;
            anyAreTrue = false;
            for (dependencyKey in oldUnsatisfiedDependencies) {
                if (oldUnsatisfiedDependencies.hasOwnProperty(dependencyKey)) {
                    if (oldUnsatisfiedDependencies[dependencyKey]) {
                        newUnsatisfiedDependencies[dependencyKey] = true;
                        anyAreTrue = true;
                    }
                }
            }
            // if none of the dependencies are true, adjust the entire depenency graph to reflect this
            if (anyAreTrue) {
                // registryKey still has unsatisfied dependencies
                newsy._registry[registryKey].unsatisfiedDependencies = newUnsatisfiedDependencies;
                continue;
            }
            newsy._registry[registryKey].unsatisfiedDependencies = undefined;
            // all of registryKey's dependencies have been satisfied, so everything that depends on it can now remove registryKey as a dependency
            newsy._dependencySatisfied(registryKey);
        }
    }
};
