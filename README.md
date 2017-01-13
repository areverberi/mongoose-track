# Mongoose Track `0.0.3`

Mongoose Track allows you to track document changes (deeply) with optional author reference and simple options.

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
 * This value is set just before `document.save()` is fired

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

###`document._revise(historyEventId || historyChangeEventId)` `Function`

This method accepts an `_id` from a **historyEvent** or **historyChangeEvent** and will return a document with values matching the `historyEvent._id || historyChangeEvent._id`.

_This method **will not** modify the `document.history`._

###`document._forget(historyEventId)` `Function`

This method accepts an `_id` from a **historyEvent** and will remove all `document.history` prior to the `historyEventId`

_This method **will** modify the `document.history`._

##Questions

 > If a **historyEvent** occurs but no **historyChangeEvent**'s are logged, does it really happen?

No. If a document is saved but no **historyChangeEvent**'s are logged then the **historyEvent** will not be written.

##Example

###Usage
Clone this repository and run `example.js`
```
git clone https://github.com/brod/mongoose-track.git
cd mongoose-track
node example.js
```
You should see the output of all **historyEvent** and **historyChangeEvents** to a document including _manual changes_, _authored changes_ and a _revision_.

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

##Disclaimer
I wrote this package and documentation within a few hours, then rewrote it within a couple more, please be careful there's probably a bug or two.
