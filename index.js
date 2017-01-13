const diffCheck = require('deep-diff').diff
const merge = require('merge-options')
const mongoose = require('mongoose')
const dotRef = function(obj, str) {
    str = str.split(".")
    for (var i = 0; i < str.length; i++) {
        obj = obj[str[i]]
    }
    return obj
}

const mongooseTrack = function(schema, options) {
    defaultOptions = {
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
    var options = merge(defaultOptions, mongooseTrack.options, options)

    var historyObject = {}

    if (options.author.enable === true) {

        historyObject.author = { type: options.author.type, ref: options.author.ref, historyIgnore: true }

        schema.add({ historyAuthor: { type: options.author.type, ref: options.author.ref, historyIgnore: true } })
    }

    historyObject.date = { type: Date }
    historyObject.changes = [{
        type: { type: String },
        path: { type: [String] },
        before: { type: mongoose.Schema.Types.Mixed },
        after: { type: mongoose.Schema.Types.Mixed },
    }]

    schema.add({ history: [historyObject] })

    schema.post('init', function() {
        let document = this
        document._original = document.toObject();
    })

    schema.pre('save', function(next) {

        let diffArray = diffCheck(this._original, this.toObject())
        if (!diffArray || diffArray.length <= 0) {
            return next()
        }

        let historyObject = {
            date: new Date(),
            author: this.historyAuthor || undefined,
            changes: []
        }

        function handleN(diff) {
            if (options.track.N !== true) {
                return
            }
            let rel = dotRef(schema.tree, (diff.path || []).join('.')) || {}
            if (rel.historyIgnore === true) {
                return
            }

            delete diff.rhs._id
            delete diff.rhs.historyAuthor
            delete diff.rhs.history

            historyObject.changes.push({
                path: diff.path,
                type: diff.kind,
                after: diff.rhs,
            })
        }

        function handleE(diff) {
            if (options.track.E !== true) {
                return
            }
            let rel = dotRef(schema.tree, diff.path.join('.')) || {}
            if (rel.historyIgnore === true) {
                return
            }
            historyObject.changes.push({
                path: diff.path,
                type: diff.kind,
                before: diff.lhs,
                after: diff.rhs,
            })
        }

        diffArray.forEach(function(diff) {
            switch (diff.kind) {
                case 'N':
                    handleN(diff)
                    break;
                case 'E':
                    handleE(diff)
                    break;
            }
        })

        if (historyObject.changes.length > 0) {
            this.history.push(historyObject)
        }

        this.historyAuthor = undefined
        next()
    })
}

mongooseTrack.options = {
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

module.exports = mongooseTrack
