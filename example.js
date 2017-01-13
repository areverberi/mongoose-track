const mongoose = require('mongoose')
const mongooseTrack = require('./index')

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost/mongooseTrackExample')

mongooseTrack.options = {
    track: {
        N: true,
        E: true
    },
    author: {
        enable: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userModel'
    }
}

/**
 *	User Stuff
 */
let userSchema = new mongoose.Schema({
    name: { type: String },
    age: { type: Number }
})

userSchema.plugin(mongooseTrack)

let userModel = mongoose.model('userModel', userSchema)


var tempUser = new userModel({
    name: 'Steve',
    age: 56
})

/**
 *	Fruit Stuff
 */
let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

let tempFruit = new fruitModel({
    name: 'Banana',
    color: 'yellow'
})


// Save the user
tempUser.save()
    .then(function(authorDocument) {

		// Save the fruit
        return tempFruit.save()
    })
    .then(function(fruitDocument) {

        // Find the fruit
        return fruitModel.findOne({ _id: tempFruit._id })
    })
    .then(function(fruitDocument) {

        // Modify the fruit
        fruitDocument.color = 'blue'
        fruitDocument.historyAuthor = tempUser._id
        return fruitDocument.save()
    })
    .then(function(fruitDocument) {

        // Find the fruit and populate author
        return fruitModel.findOne({ _id: tempFruit._id })
        	.populate({ path: 'history.author' })
    })
    .then(function(fruitDocument){

        // Log the fruit history
        fruitDocument.history.forEach(function(history) {
            history.changes.forEach(function(change) {
                console.log('Author:', history.author ? history.author.name : 'System')
                console.log('Path:', change.path.join('.') || '*')
                console.log('Before:', change.before)
                console.log('After:', change.after)
                console.log('')
            })
        })

        return fruitModel.remove({})
    })
    .then(function() {
        return userModel.remove({})
    })
    .catch(function(error) {
        throw error
    })