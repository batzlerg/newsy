# newsy
Use newsy to instantiate dynamic dependencies.
This tool was built for instantiating subclasses that depend on the
environment in which the code runs. For example, a different subclass
may be needed in .com versus Admin.

## Usage:
MySubView.js:
```
  MySubView = function() {...};
  MySubView.newsy = 'MySubView';
```
project 1 entry file:
```
  // BuyerSubViewConstructor inherits prototype and static from MySubView
  newsy.register(BuyerSubViewConstructor);
```
project 2 entry file:
```
  // SellerSubViewConstructor inherits prototype and static from MySubView
  newsy.register(SellerSubViewConstructor);
```
In common parent view:
```
  // We call newsy here to instantiate a BuyerSubViewConstructor or
  // SellerSubViewConstructor depending on which MySubView subclass
  // constructor was registered in the entry file
  var mySubViewInstance = newsy('MySubView');
```
Dependencies can be declared and enforced per-constructor through a newsy
property called 'builds':

BuyerMainView.js:
```
  var MainView = function () {
    newsy('MySubView');
  }
  MainView.newsy = {
    name: 'MainView',
    builds: ['MySubView'];
  }
```
If `newsy('MainView')` is called before any constructor for MySubView is
registered, an exception will be thrown that declares the missing
dependencies.

The static newsy property:
  When a constructor is registered, the constructor is named according
to the newsy property on the constructor. If the newsy property is a
string, then the value of the newsy property is the registered name of
the constructor. If the newsy property is an object, then the name of
the constructor is taken from newsy.name. The constructor's dependencies
are declared using newsy.builds.
