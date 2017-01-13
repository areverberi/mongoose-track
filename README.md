# Mongoose Track

Mongoose Track allows you to track document changes (deeply) with optional author reference and simple options.

###Install

_Install mongoose-track from NPM_
```shell
npm i mongoose-track --save
```

_Require mongoose-track within project_
```js
const mongooseTrack = require('mongoose-track')
```

###Usage

####Getting Started

_Set Mongoose Track as a plugin for your schema_

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = { ... }

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack, { ... })

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

####Options

Mongoose Track has a few options, what changes to look for and setting an author for changes.

You can set options globaly or per schema by passing a second argument to the plugin.

```js
options: {
  track: {
    N: Boolean,         //default true
    E: Boolean          //default true
  },
  author: {
    enable: Boolean,    //default false
    type: Mixed,        //default `mongoose.Schema.Types.ObjectId`,
    ref: String,        //default ""
  }
}
```
 * `options.track.N` will track changes if something was previously undefined.
 * `options.track.E` will track changes if something was previously defined.
 * `options.author.enable` will append an author field to each history event.
 * `options.author.type` if the author is referencing a document this should be the document type.
 * `options.author.ref` if the author is referencing a document this should be the model name.

###History Events

History events are stored as an `Array` on the schema root at `document.history` and look like this:

```js
history: [{
  _id: ObjectId,
  date: Date,
  author: Mixed,
  changes: [{
    _id: ObjectId,
    path: [String],
    before: Mixed,
    after: Mixed
  }]
}]
```
 * `history[].date` is the date which the event occured
 * `history[].author` is a reference to the `author` document, if enabled.
 * `history[].changes[].path` is a String array reference to the changed value.
 * `history[].changes[].before` is the previous value.
 * `history[].changes[].after` is the new value.
 
Additionally, a `document.historyAuthor` key is available when the author option is enabled, you would set this value prior to saving the document, this value is not retained after the Mongoose Track plugin has completed.
 
###Example

####Simple Example
_The example below uses the minimum setup._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

####Option Example
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

fruitSchema.plugin(mongooseTrack)

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

fruitSchema.plugin(mongooseTrack)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

let userSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

userSchema.plugin(mongooseTrack)

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

####Contribute
Feel free to send pull requests and submit issues! No special requirements :)

####Disclaimer
I wrote this package and documentation within 2 hours, please be careful there's probably a bug or two.
