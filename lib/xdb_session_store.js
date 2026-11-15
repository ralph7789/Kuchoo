'use strict';

/**
 * XDB-Backed Express Session Store for Kuchoo
 * Replaces connect-mongo to eliminate raw TCP socket dependencies and container restart crashes.
 * Automatically synchronizes sessions through XDB Unified MongoDB API with in-memory fallback.
 */

let session;
try {
  session = require('express-session');
} catch (_) {
  const EventEmitter = require('events');
  session = { Store: class Store extends EventEmitter {} };
}
const xdbMongoose = require('./xdb_mongoose');

class XdbSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.collectionName = options.collectionName || 'sessions';
    this.ttl = options.ttl || (7 * 24 * 60 * 60); // 7 days in seconds
    this.memoryFallback = new Map();
  }

  get(sid, callback = () => {}) {
    xdbMongoose.callXdb('findOne', this.collectionName, { filter: { _id: sid } })
      .then(res => {
        const doc = res && res.data ? res.data : null;
        if (!doc) {
          // Check memory fallback
          const mem = this.memoryFallback.get(sid);
          if (mem) {
            if (mem.expires && new Date(mem.expires) < new Date()) {
              this.memoryFallback.delete(sid);
              return callback(null, null);
            }
            return callback(null, mem.session);
          }
          return callback(null, null);
        }

        // Check expiration
        if (doc.expires && new Date(doc.expires) < new Date()) {
          this.destroy(sid, () => {});
          return callback(null, null);
        }

        const sess = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session;
        this.memoryFallback.set(sid, { session: sess, expires: doc.expires });
        callback(null, sess);
      })
      .catch(err => {
        // Safe fallback to memory store on network error
        const mem = this.memoryFallback.get(sid);
        if (mem && (!mem.expires || new Date(mem.expires) >= new Date())) {
          return callback(null, mem.session);
        }
        callback(null, null);
      });
  }

  set(sid, sess, callback = () => {}) {
    const expires = sess && sess.cookie && sess.cookie.expires
      ? new Date(sess.cookie.expires)
      : new Date(Date.now() + this.ttl * 1000);

    this.memoryFallback.set(sid, { session: sess, expires });

    const payload = {
      filter: { _id: sid },
      update: {
        $set: {
          _id: sid,
          session: sess,
          expires,
          updatedAt: new Date()
        }
      },
      upsert: true
    };

    xdbMongoose.callXdb('updateOne', this.collectionName, payload, sid)
      .then(() => callback(null))
      .catch(() => callback(null)); // Suppress network faults; memory fallback holds session
  }

  destroy(sid, callback = () => {}) {
    this.memoryFallback.delete(sid);
    xdbMongoose.callXdb('deleteOne', this.collectionName, { filter: { _id: sid } }, sid)
      .then(() => callback(null))
      .catch(() => callback(null));
  }

  touch(sid, sess, callback = () => {}) {
    const current = this.memoryFallback.get(sid);
    if (current) {
      current.expires = sess && sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires)
        : new Date(Date.now() + this.ttl * 1000);
    }
    this.set(sid, sess, callback);
  }

  all(callback = () => {}) {
    xdbMongoose.callXdb('find', this.collectionName, { filter: {} })
      .then(res => {
        const docs = res && res.data ? res.data : [];
        const sessions = {};
        const now = new Date();
        for (const doc of docs) {
          if (!doc.expires || new Date(doc.expires) >= now) {
            sessions[doc._id] = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session;
          }
        }
        callback(null, sessions);
      })
      .catch(() => {
        const sessions = {};
        for (const [sid, item] of this.memoryFallback.entries()) {
          sessions[sid] = item.session;
        }
        callback(null, sessions);
      });
  }

  clear(callback = () => {}) {
    this.memoryFallback.clear();
    xdbMongoose.callXdb('deleteMany', this.collectionName, { filter: {} })
      .then(() => callback(null))
      .catch(() => callback(null));
  }

  length(callback = () => {}) {
    xdbMongoose.callXdb('countDocuments', this.collectionName, { filter: {} })
      .then(res => {
        const count = res && typeof res.data === 'number' ? res.data : this.memoryFallback.size;
        callback(null, count);
      })
      .catch(() => callback(null, this.memoryFallback.size));
  }
}

module.exports = XdbSessionStore;
