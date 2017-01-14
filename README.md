# Mongoose Track `0.0.55`

Mongoose Track allows you to track and manage document changes (deeply) with author references and simple helper methods/statics.

##Usage

###Install

_Install `mongoose-track` from NPM_
```shell
npm i mongoose-track --save
```

_Require `mongoose-track` within your project_
```js
const mongooseTrack = require('mongoose-track')
```

###Getting Started

_Set Mongoose Track as a plugin for your schema_

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = { ... }

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin, { ... })

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```
All changes to `fruitModel` documents will now be written to the document at `document.history`.

##Options

You can set options globaly or per schema by passing a second argument to the plugin, schema specific options override global options.

To set **Global Options**:
```js
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = { /*options*/ }
```
To set **Schema Specific Options**:
```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
let mySchema = new mongoose.Schema({ ... })
mySchema.plugin(mongooseTrack.plugin, { /*options*/ }
```

###`historyIgnore` `Boolean` `false`
This property is set within the Schema, for example:
```js
let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String, historyIgnore: true }
})
```

 * `true` Changes to this property **will not** be added to the **historyEvent**
 * `false` Changes to this property **will** be added to the **historyEvent**

###`options.track.N` `Boolean` `true`
 * `true` Properties that were previously undefined (not set) **will** be added to the **historyEvent**
 * `false` Properties that were previously undefined (not set) **will not** be added to the **historyEvent**

###`options.track.E` `Boolean` `true`
 * `true` Properties that were previously defined **will** be added to the **historyEvent**
 * `false` Properties that were previously defined **will not** be added to the **historyEvent**

###`options.author.enabled` `Boolean` `false`
 * `true` The `document.historyAuthor` value **will** be appended to the **historyEvent**
 * `false` No author value will be appended to the **historyEvent**

###`options.author.type` `Mixed` `mongoose.Schema.Types.String`
 * `Mixed` This should be set to the `_id` type of the author document, typically you'll use `mongoose.Schema.Types.ObjectId`

###`options.author.ref` `String` `undefined`
 * `String` This should be set to the collection within which your author document is located, such as `"userModel"`

##History Events `historyEvent`

A **historyEvent** is created when you save a document, if there are (tracked) property changes to that document they will be appended to the **historyEvent** and the **historyEvent** will be placed at the top of the `document.history` Array, otherwise no **historyEvent** will be saved.

```js
history: [{
    _id: ObjectId,
    date: Date,
    author: Mixed,
    changes: [{ ... }]
}]
```

###`[historyEvent]` `Array`
 * This array contains all **historyEvent**'s for the document
 
###`historyEvent.date` `Date` `new Date()`
 * This value is set just before `static.save()` is fired

###`historyEvent.author` `Mixed`
 * This value is set from `document.historyAuthor`, assuming `options.author.enabled === true`

##History Change Events `historyChangeEvent`

A **historyChangeEvent** is a (singular) change to a document property that occurred within `document.history[].changes`.

```js
[{
    _id: ObjectId,
    path: [String],
    before: Mixed,
    after: Mixed
}]
```
###`[historyChangeEvent]` `Array`
 * This array contains all **historyChangeEvent**'s made within the current **historyEvent**
 
###`historyChangeEvent.path` `[String]`
 * This array denotes a reference to the changed key, for example: `{ color: { primary: "blue" } } === [ 'color', 'primary' ]`

###`historyChangeEvent.before` `Mixed`
 * This value is taken from the property (located at `historyChangeEvent.path`) **before** being saved
 
###`historyChangeEvent.after` `Mixed`
 * This value is taken from the property (located at `historyChangeEvent.path`) **after** being saved
 
##Methods

###`method._remove()`

This method will set `document._removed` to `true`

###`method._restore()`

This method will set `document._removed` to `false`

_This method **will not** modify the `document.history` but will in the future_

###`method._revise(query, deepRevision)` `Mixed` `Boolean`

If the `query` value is an `ObjectId` value from a **historyEvent** or **historyChangeEvent** this will return a document with values matching the `historyEvent._id || historyChangeEvent._id`

If the `query` value is a `Date` value it will find the latest **historyEvent** that occurred prior to the `Date` value.

If `deepRevision` is set to `true` a deep revision will occur, this will revise the document to **exactly** how it was when the matching **historyEvent** was created by recursivly setting all prior values from oldest to latest, stopping at the matching **historyEvent**.

If `deepRevision` is set to `false` only the changes within the matching **historyEvent** or **historyChangeEvent** will be revised.

Currently `deepRevision` does not support a `query` value of a **historyChangeEvent** `ObjectId`.

_This method **will not** modify the `document.history`_

###`method._forget(historyEventId, single)` `ObjectId` `Boolean`

This method accepts an `_id` from a **historyEvent** and will remove all `document.history` prior to and including the matching **historyEvent**

If `single` is set to `true` only the matching **historyEvent** will be removed

_This method **will** modify the `document.history`_

##Statics

###`static._remove(query)` `mongoose.Query`

This static will set `document._removed` to `true` and returns a response from `static.update(query)`

###`static._restore(query)` `mongoose.Query`

This static will set `document._removed` to `false` and returns a response from `static.update(query)`

###`static._find(query)` `mongoose.Query`

This static allows you to pass additional query operators to `static.find()`

Passing `$revision` to the query with a `Date` value will return matching documents revised to that date, uses `method._revise()`

Additionally you can define `$deepRevision` to return documents with a deep revision, same as `method._revise()`

###`static._findOne(query)` `mongoose.Query`

This static allows you to pass additional query operators to `static.findOne()`

Passing `$revision` to the query with a `Date` value will return a matching document revised to that date, same as `method._revise()`

Additionally you can define `$deepRevision` to return documents with a deep revision, same as `method._revise()`

##Questions

 > What properties are excluded from a **historyEvent** by default?

Changes to the following: `['_id', '__v', 'history', 'historyAuthor']` will not be recorded, along with any schema properties that have `historyIgnore === true`.

 > If a **historyEvent** occurs but no **historyChangeEvent**'s are logged, is it recorded?

No. If the `history.changes` Array is empty, the **historyEvent** will not be saved.

 > Can I pick where the history is stored? (other than `document.history`)

Not yet, in the future you'll be able to set _most_ if not _all_ of the Mongoose Track keys, methods and statics.


##Example

###Usage
Clone this repository and run `example.js`
```
git clone https://github.com/brod/mongoose-track.git
cd mongoose-track
node example.js
```
You should see the output of all **historyEvent**'s and **historyChangeEvent**'s to a document including _manual changes_, _authored changes_, _forget changes_ and a _revision_.

_This will connect to `mongodb://localhost/mongooseTrackExample`_

###Minimum Example
_The example below uses the minimum setup._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

###Option Example
_The example below does not track `N` events._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = {
  track: {
    N: false
  }
}

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

####Author Example
_The example below appends an author to events._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = {
  author: {
    enable: true,
    ref: 'userModel'
}

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

let userSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

userSchema.plugin(mongooseTrack.plugin)

let userModel = mongoose.model('userModel', userSchema)

```

To pass the author reference, set `document.historyAuthor` before you save the document.

```js
  var fruit = new fruitModel({
    name: 'Banana',
    color: 'Yellow',
    historyAuthor: '507f191e810c19729de860ea'
  })
  
  fruit.save()
  
  /* Document
  {
    name: 'Banana',
    color: 'Yellow',
    history: [{
      date: ...
      author: '507f191e810c19729de860ea',
      changes: [{
        type: 'N',
        path: [],
        after: {
          name: 'Banana'
          color: 'Yellow'
        }
    }]
  }
  */
```

##Contribute
Feel free to send pull requests and submit issues 😉

##Testing
None yet, however you're welcome to write some and submit a pull request.

##Disclaimer
I wrote this package and documentation within a few hours, then rewrote it within a couple more, please be careful there's probably a bug or two.
