'use strict';

const diffCheck = require('deep-diff').diff;
const merge = require('merge-options');
const mongoose = require('mongoose');

const dotRefGet = function(obj, str) {
  str = str.split('.');
  for (var i = 0; i < str.length; i++) {
    obj = obj[str[i]];
  }
  return obj;
};

const dotRefSet = function(obj, str, val) {
  str = str.split('.');
  for (var i = 0; i < str.length - 1; i++) {
    obj = obj[str[i]];
  }
  let _path = str[str.length - 1];
  obj[_path] = val;
  return obj;
};

const mongooseTrack = {};
mongooseTrack._options = {
  track: {
    N: true,
    E: true
  },
  author: {
    enable: false,
    type: '',
    ref: ''
  }
};
mongooseTrack.options = merge(mongooseTrack._options, {});

mongooseTrack.historySchema = function(schema, options) {
  let self = { history: [{}] };

  if (options.author.enable === true) {
    self.history[0].author = {
      type: options.author.type,
      ref: options.author.ref,
      historyIgnore: true
    };
  }

  self.history[0].date = { type: Date };
  self.history[0].changes = [{}];
  self.history[0].changes[0].type = { type: String };
  self.history[0].changes[0].path = { type: [String] };
  self.history[0].changes[0].before = { type: mongoose.Schema.Types.Mixed };
  self.history[0].changes[0].after = { type: mongoose.Schema.Types.Mixed };

  return self;
};
mongooseTrack.historyAuthorSchema = function(schmea, options) {
  let self = {};

  if (options.author.enable === true) {
    self = {
      historyAuthor: {
        type: options.author.type,
        ref: options.author.ref,
        historyIgnore: true
      }
    };
  }

  return self;
};
mongooseTrack.historyEvent = function(schema, options, _document, document) {
  let self = {};

  let diffArray = diffCheck(_document || {}, document);

  if (!diffArray || diffArray.length <= 0) {
    return;
  }

  self.date = new Date();
  self.author =
    options.author.enable && document.historyAuthor
      ? document.historyAuthor
      : undefined;
  self.changes = [];

  function handleN(diff) {
    if (options.track.N !== true) {
      return false;
    }
    let schemaProp = dotRefGet(schema.tree, (diff.path || []).join('.')) || {};
    if (schemaProp.historyIgnore === true) {
      return false;
    }

    delete diff.rhs._id;
    delete diff.rhs.historyAuthor;
    delete diff.rhs.history;

    self.changes.push({
      path: diff.path,
      type: diff.kind,
      after: diff.rhs
    });
  }

  function handleE(diff) {
    if (options.track.E !== true) {
      return false;
    }
    let schemaProp = dotRefGet(schema.tree, diff.path.join('.')) || {};
    if (schemaProp.historyIgnore === true) {
      return false;
    }
    self.changes.push({
      path: diff.path,
      type: diff.kind,
      before: diff.lhs,
      after: diff.rhs
    });
  }

  diffArray.forEach(function(diff) {
    if (['_id', '__v', 'history', 'historyAuthor'].indexOf(diff.path[0]) > -1) {
      return false;
    }
    switch (diff.kind) {
      case 'N':
        handleN(diff);
        break;
      case 'E':
        handleE(diff);
        break;
    }
  });

  return self.changes.length > 0 ? self : {};
};

mongooseTrack.post = {};
mongooseTrack.post.init = function() {
  let document = this;
  document._original = document.toObject();
};
mongooseTrack.pre = {};
mongooseTrack.pre.save = function(schema, options) {
  return function(next) {
    let document = this;
    let historyEvent = mongooseTrack.historyEvent(
      schema,
      options,
      document._original,
      document.toObject()
    );
    if (historyEvent) {
      document.history.unshift(historyEvent);
    }

    delete document.historyAuthor;

    next();
  };
};
mongooseTrack.methods = {};
mongooseTrack.methods._revise = function(query, deepRevision) {
  let document = this;

  if (Object.prototype.toString.call(query) === '[object Date]') {
    return mongooseTrack.methods._revise._date(document, query, deepRevision);
  } else {
    return mongooseTrack.methods._revise._id(document, query, deepRevision);
  }
};
mongooseTrack.methods._revise._id = function(document, eventId, deepRevision) {
  let historyEventArray = undefined;
  historyEventArray = document.history.filter(function(historyEvent) {
    return String(historyEvent._id) === eventId;
  });

  let historyChangeEvent = undefined;
  document.history.forEach(function(historyEvent) {
    historyChangeEvent =
      historyEvent.changes.filter(function(historyChangeEvent) {
        return String(historyChangeEvent._id) === eventId;
      })[0] || historyChangeEvent;
  });

  if (historyEventArray.length > 0) {
    return mongooseTrack.methods._revise._historyEventArray(
      document,
      historyEventArray,
      deepRevision
    );
  }
  if (historyChangeEvent) {
    dotRefSet(
      document,
      historyChangeEvent.path.join('.'),
      historyChangeEvent.after
    );
  }

  return document;
};
mongooseTrack.methods._revise._date = function(document, date, deepRevision) {
  let historyEventArray = undefined;
  historyEventArray = document.history.filter(function(historyEvent) {
    return historyEvent.date <= date;
  });

  if (historyEventArray.length > 0) {
    return mongooseTrack.methods._revise._historyEventArray(
      document,
      historyEventArray,
      deepRevision
    );
  }

  return document;
};
mongooseTrack.methods._revise._historyEventArray = function(
  document,
  historyEventArray,
  deepRevision
) {
  if (deepRevision !== true) {
    historyEventArray = historyEventArray.slice(0, 1);
  }
  historyEventArray.reverse().forEach(function(historyEvent) {
    historyEvent.changes.forEach(function(historyChangeEvent) {
      dotRefSet(
        document,
        historyChangeEvent.path.join('.'),
        historyChangeEvent.after
      );
    });
  });
  return document;
};
mongooseTrack.methods._forget = function(eventId, single) {
  let document = this;

  let historyEvent = undefined;
  historyEvent = document.history.filter(function(historyEvent) {
    return historyEvent._id === eventId;
  })[0];

  if (!historyEvent) {
    return document;
  }
  if (historyEvent) {
    let amount = single ? 1 : document.history.length - 1;

    let indexes = document.history.map(function(historyEvent, index) {
      return Boolean(historyEvent._id === eventId);
    });

    document.history.splice(indexes.indexOf(true), amount);

    return document;
  }
};
mongooseTrack.methods._remove = function(eventId, val) {
  let document = this;

  document._removed = true;

  return document.save();
};
mongooseTrack.methods._restore = function(eventId, val) {
  let document = this;

  document._removed = false;

  return document.save();
};
mongooseTrack.statics = {};
mongooseTrack.statics._find = function(query) {
  let _query = merge(query, {});
  if (query.$revision) {
    delete query.$revision;
  }
  if (query.$deepRevision) {
    delete query.$deepRevision;
  }
  return this.find(query).then(function(documentArray) {
    if (_query.$revision) {
      documentArray.forEach(function(document) {
        mongooseTrack.methods._revise._date(
          document,
          _query.$revision,
          _query.$deepRevision || false
        );
      });
    }
    return documentArray;
  });
};
mongooseTrack.statics._findOne = function(query) {
  let _query = merge(query, {});
  if (query.$revision) {
    delete query.$revision;
  }
  if (query.$deepRevision) {
    delete query.$deepRevision;
  }
  return this.findOne(query).then(function(document) {
    if (_query.$revision) {
      mongooseTrack.methods._revise._date(
        document,
        _query.$revision,
        _query.$deepRevision || false
      );
    }
    return document;
  });
};
mongooseTrack.statics._remove = function(query) {
  return this.update(query, {
    _removed: true
  });
};
mongooseTrack.statics._restore = function(query) {
  return this.update(query, {
    _removed: false
  });
};
mongooseTrack.plugin = function(schema, optionOverride) {
  let options = merge(
    mongooseTrack._options,
    mongooseTrack.options,
    optionOverride
  );

  schema.add(mongooseTrack.historySchema(schema, options));
  schema.add(mongooseTrack.historyAuthorSchema(schema, options));
  schema.add({ _removed: { type: Boolean, select: false } });

  schema.statics._find = mongooseTrack.statics._find;
  schema.statics._findOne = mongooseTrack.statics._findOne;
  schema.statics._remove = mongooseTrack.statics._remove;
  schema.statics._restore = mongooseTrack.statics._restore;

  schema.methods._revise = mongooseTrack.methods._revise;
  schema.methods._forget = mongooseTrack.methods._forget;
  schema.methods._remove = mongooseTrack.methods._remove;
  schema.methods._restore = mongooseTrack.methods._restore;

  schema.post('init', mongooseTrack.post.init);
  schema.pre('save', mongooseTrack.pre.save(schema, options));
};

module.exports = mongooseTrack;
