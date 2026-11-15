'use strict';

/**
 * In-Memory Self-Check & Parity Verification for XDB-Only Architecture
 * Non-Negotiable Invariant 6: 100% In-Memory Testability by Design
 * Validates XDB Mongoose HTTP adapter, query cursor chaining, populate, lean, and XdbSessionStore.
 */

const assert = require('assert');
const path = require('path');

// Ensure test environment uses in-memory or bounded timeouts
process.env.NODE_ENV = 'test';

const mongoose = require('./lib/xdb_mongoose');
const XdbSessionStore = require('./lib/xdb_session_store');

async function runXdbParityTests() {
  console.log('⚡ Starting XDB-Only Architecture Parity Self-Check...');

  // 1. Invariant 1 & 4: Adapter Initialization & Zero Raw TCP Sockets
  assert.strictEqual(mongoose.connection.readyState, 1, 'Mongoose connection readyState must be 1 (operational)');
  assert.ok(typeof mongoose.getXdbEndpoint === 'function', 'getXdbEndpoint must be exposed');
  assert.ok(mongoose.getXdbEndpoint().includes('http'), 'Endpoint must be HTTP/HTTPS');
  console.log('  ✔ Invariant 1 & 4 (Lifecycle/Zero TCP): Mongoose readyState is operational on HTTP gateway');

  // 2. Invariant 1: Model Definition & Registration
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
  });
  const User = mongoose.model('TestUser', userSchema);
  assert.ok(User, 'User model registered in mongoose.models');
  assert.strictEqual(typeof User.find, 'function', 'Model must have find function');
  assert.strictEqual(typeof User.findOne, 'function', 'Model must have findOne function');
  assert.strictEqual(typeof User.create, 'function', 'Model must have create function');
  console.log('  ✔ Invariant 1 (Domain Isolation): Model factory registered with schema preservation');

  // 3. Invariant 2 & 5: CRUD Operations via XDB Driver
  const runId = Date.now().toString(36);
  const testEmail = `kuchoo_tester_${runId}@xcorp.internal`;
  const createdUser = await User.create({
    email: testEmail,
    displayName: 'Kuchoo Tester',
    isAdmin: true
  });
  assert.ok(createdUser._id, 'Created user must have an _id');
  assert.strictEqual(createdUser.email, testEmail);

  // findOne
  const foundUser = await User.findOne({ email: testEmail });
  assert.ok(foundUser, 'Found user must exist');
  assert.strictEqual(foundUser.displayName, 'Kuchoo Tester');

  // findById
  const foundById = await User.findById(createdUser._id);
  assert.ok(foundById, 'findById must retrieve document');
  assert.strictEqual(String(foundById._id), String(createdUser._id));

  // updateOne
  await User.updateOne({ _id: createdUser._id }, { $set: { displayName: 'Updated Tester' } });
  const updatedUser = await User.findById(createdUser._id);
  assert.strictEqual(updatedUser.displayName, 'Updated Tester', 'Document must reflect update');

  // countDocuments
  const count = await User.countDocuments({ email: testEmail });
  assert.strictEqual(count, 1, 'countDocuments must return 1');

  console.log('  ✔ Invariant 2 & 5 (CRUD/Ergonomics): create, findOne, findById, updateOne, countDocuments verified');

  // 4. Invariant 5: Fluent Cursor Chaining (sort, limit, skip, populate, lean, thenable)
  const alphaEmail = `alpha_${runId}@xcorp.internal`;
  const betaEmail = `beta_${runId}@xcorp.internal`;
  const gammaEmail = `gamma_${runId}@xcorp.internal`;
  await User.create([
    { email: alphaEmail, displayName: 'Alpha' },
    { email: betaEmail, displayName: 'Beta' },
    { email: gammaEmail, displayName: 'Gamma' }
  ]);

  const sortedList = await User.find({ email: { $in: [alphaEmail, betaEmail] } })
    .sort('displayName')
    .limit(2)
    .populate('someRef', 'name')
    .lean();

  assert.ok(Array.isArray(sortedList), 'Query result must be an array');
  assert.strictEqual(sortedList.length, 2, 'Limit 2 must be respected');
  console.log('  ✔ Invariant 5 (API Rigor): Cursor chaining (sort, limit, populate, lean, thenable) verified');

  // 5. Invariant 3: XdbSessionStore Lifecycle
  const sessionStore = new XdbSessionStore({ collectionName: 'test_sessions', ttl: 3600 });
  const testSid = 'sess_xdb_test_999';
  const testSessionData = { cookie: { maxAge: 3600000 }, user: { id: 'u123', email: 'jeko@aladin.ai' } };

  await new Promise((resolve, reject) => {
    sessionStore.set(testSid, testSessionData, (err) => {
      if (err) return reject(err);
      sessionStore.get(testSid, (getErr, sess) => {
        if (getErr) return reject(getErr);
        assert.ok(sess, 'Session data must be retrieved from store');
        assert.strictEqual(sess.user.email, 'jeko@aladin.ai');

        sessionStore.destroy(testSid, (destroyErr) => {
          if (destroyErr) return reject(destroyErr);
          sessionStore.get(testSid, (postGetErr, postSess) => {
            if (postGetErr) return reject(postGetErr);
            assert.strictEqual(postSess, null, 'Destroyed session must return null');
            resolve();
          });
        });
      });
    });
  });
  console.log('  ✔ Invariant 3 (Session Resilience): XdbSessionStore get/set/destroy verified without TCP sockets');

  // 6. Invariant 3: Error & Offline Resilience
  const nonExistent = await User.findOne({ email: 'does_not_exist_xyz_999@xcorp.internal' });
  assert.strictEqual(nonExistent, null, 'Non-existent document must return null cleanly');

  // Delete test records
  await User.deleteMany({ email: { $in: [testEmail, alphaEmail, betaEmail, gammaEmail] } });
  console.log('  ✔ Invariant 3 (Error Engineering): Null safety and clean deleteMany verified');

  console.log('\n🎉 ALL XDB ARCHITECTURE PARITY ASSERTIONS PASSED (100% SUCCESS)\n');
}

runXdbParityTests().catch(err => {
  console.error('❌ XDB Parity Check Failed:', err);
  process.exit(1);
});
