const diffCheck = require('deep-diff').diff
const merge = require('merge-options')
const mongoose = require('mongoose')
const dotRef = function(obj, str) {
    str = str.split('.')
    for (var i = 0; i < str.length; i++) {
        obj = obj[str[i]]
    }
    return obj
}
const dotRefSet = function(obj, str, val) {
    str = str.split('.')
    for (var i = 0; i < str.length-1; i++) {
        obj = obj[str[i]]
    }
    let _path = str[str.length - 1]
    obj[_path] = val
    return obj
}

const mongooseTrack = {}
mongooseTrack._options = {
    track: {
        N: true,
        E: true
    },
    author: {
        enable: false,
        type: "",
        ref: ""
    }
}
mongooseTrack.options = merge(mongooseTrack._options, {})

mongooseTrack.historySchema = function(schema, options) {
    let self = { history: [{}] }

    if (options.author.enable === true) {
        self.history[0].author = { type: options.author.type, ref: options.author.ref, historyIgnore: true }
    }

    self.history[0].date = { type: Date }
    self.history[0].changes = [{}]
    self.history[0].changes[0].type = { type: String }
    self.history[0].changes[0].path = { type: [String] }
    self.history[0].changes[0].before = { type: mongoose.Schema.Types.Mixed }
    self.history[0].changes[0].after = { type: mongoose.Schema.Types.Mixed }

    return self
}
mongooseTrack.historyAuthorSchema = function(schmea, options) {
    let self = {}

    if (options.author.enable === true) {
        self = { historyAuthor: { type: options.author.type, ref: options.author.ref, historyIgnore: true } }
    }

    return self
}
mongooseTrack.historyEvent = function(schema, options, _document, document) {
    let self = {}

    let diffArray = diffCheck(_document || {}, document)

    if (!diffArray || diffArray.length <= 0) {
        return
    }

    self.date = new Date()
    self.author = options.author.enable && document.historyAuthor ? document.historyAuthor : undefined
    self.changes = []

    function handleN(diff) {
        if (options.track.N !== true) {
            return false
        }
        let schemaProp = dotRef(schema.tree, (diff.path || []).join('.')) || {}
        if (schemaProp.historyIgnore === true) {
            return false
        }

        delete diff.rhs._id
        delete diff.rhs.historyAuthor
        delete diff.rhs.history

        self.changes.push({
            path: diff.path,
            type: diff.kind,
            after: diff.rhs,
        })
    }

    function handleE(diff) {
        if (options.track.E !== true) {
            return false
        }
        let schemaProp = dotRef(schema.tree, diff.path.join('.')) || {}
        if (schemaProp.historyIgnore === true) {
            return false
        }
        self.changes.push({
            path: diff.path,
            type: diff.kind,
            before: diff.lhs,
            after: diff.rhs,
        })
    }

    diffArray.forEach(function(diff) {
        if(['_id', '__v', 'history', 'historyAuthor'].indexOf(diff.path[0]) > -1) {
            return false
        }
        switch (diff.kind) {
            case 'N':
                handleN(diff)
                break;
            case 'E':
                handleE(diff)
                break;
        }
    })

    return self.changes.length > 0 ? self : {}
}

mongooseTrack.post = {}
mongooseTrack.post.init = function() {
    let document = this
    document._original = document.toObject();
}
mongooseTrack.pre = {}
mongooseTrack.pre.save = function(schema, options) {
    return function(next) {
        var document = this
        var historyEvent = mongooseTrack.historyEvent(schema, options, document._original, document.toObject())
        if(historyEvent) {
            document.history.unshift(historyEvent)
        }

        delete document.historyAuthor

        next()
    }
}
mongooseTrack.methods = {}
mongooseTrack.methods._restore = function(historyEventId) {
    let document = this
    var historyEvent = document.history.filter(function(historyEvent) {
        return historyEvent._id === historyEventId
    })[0]

    if (!historyEvent) {
        return
    }

    historyEvent.changes.forEach(function(historyEventItem) {
        dotRefSet(document, historyEventItem.path.join('.'), historyEventItem.after)
    })

    return document
}
mongooseTrack.plugin = function(schema, optionOverride) {
    let options = merge(mongooseTrack._options, mongooseTrack.options, optionOverride)

    schema.add(mongooseTrack.historySchema(schema, options))
    schema.add(mongooseTrack.historyAuthorSchema(schema, options))

    schema.methods._restore = mongooseTrack.methods._restore

    schema.post('init', mongooseTrack.post.init)
    schema.pre('save', mongooseTrack.pre.save(schema, options))
}

module.exports = mongooseTrack
