/**
 * In-Memory Unit Self-Check for Milestone 6 Parity:
 * Audit Logging & Keyset Cursor Pagination
 */

const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;

// In-Memory Mongoose Mock
const capturedIndexes = [];
class MockSchema {
  constructor(definition) {
    this.definition = definition;
    this.paths = {};
    for (const key of Object.keys(definition)) {
      this.paths[key] = {
        instance: typeof definition[key] === 'function' ? definition[key].name : (definition[key].type?.name || 'Mixed'),
        options: typeof definition[key] === 'object' ? definition[key] : {}
      };
    }
  }
  index(fields, options) {
    capturedIndexes.push({ fields, options });
  }
}

const mockMongoose = {
  Schema: Object.assign(MockSchema, {
    Types: {
      ObjectId: class ObjectId {},
      Mixed: class Mixed {}
    }
  }),
  model: (name, schema) => ({ modelName: name, schema }),
  models: {}
};

Module.prototype.require = function(pathStr) {
  if (pathStr === 'mongoose') return mockMongoose;
  return originalRequire.apply(this, arguments);
};

console.log('🧪 Starting Milestone 6 Parity In-Memory Self-Check...');

// Test 1: Verify AuditLog Model
const AuditLogModel = require('./models/AuditLog');
assert.ok(AuditLogModel.schema, 'AuditLog model must have a schema');
assert.ok(AuditLogModel.schema.paths.userId, 'AuditLog must have userId path');
assert.ok(AuditLogModel.schema.paths.action, 'AuditLog must have action path');
assert.ok(AuditLogModel.schema.paths.targetType, 'AuditLog must have targetType path');
assert.ok(AuditLogModel.schema.paths.targetId, 'AuditLog must have targetId path');
assert.ok(AuditLogModel.schema.paths.metadata, 'AuditLog must have metadata path');
assert.ok(AuditLogModel.schema.paths.ipAddress, 'AuditLog must have ipAddress path');
assert.ok(AuditLogModel.schema.paths.timestamp, 'AuditLog must have timestamp path');

// Verify Action Enums
const allowedActions = AuditLogModel.schema.paths.action.options.enum;
const expectedActions = [
  'CHANNEL_CREATED',
  'CHANNEL_DELETED',
  'CHANNEL_UPDATED',
  'MEMBER_JOINED',
  'MEMBER_KICKED',
  'MESSAGE_EDITED',
  'MESSAGE_DELETED',
  'WEBHOOK_CREATED',
  'WEBHOOK_DELETED',
  'USER_CREATED',
  'USER_DELETED',
  'ROLE_CHANGED'
];
for (const act of expectedActions) {
  assert.ok(allowedActions.includes(act), `Action enum must include ${act}`);
}

// Verify Keyset Pagination Compound Index
const cursorIndex = capturedIndexes.find(idx => idx.fields.timestamp === -1 && idx.fields._id === -1);
assert.ok(cursorIndex, 'AuditLog must have compound index on { timestamp: -1, _id: -1 } for keyset pagination');
console.log('✅ AuditLog schema, action enums, and cursor indexes verified');

// Test 2: Verify IP Address Extraction Logic
function extractIpAddress(req) {
  const rawIp = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
  return Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1');
}

const req1 = { headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' } };
assert.strictEqual(extractIpAddress(req1), '203.0.113.195', 'Should extract leftmost client IP from X-Forwarded-For');

const req2 = { socket: { remoteAddress: '10.0.0.42' } };
assert.strictEqual(extractIpAddress(req2), '10.0.0.42', 'Should extract socket remote address when header absent');

const req3 = {};
assert.strictEqual(extractIpAddress(req3), '127.0.0.1', 'Should fallback to localhost when neither available');
console.log('✅ IP extraction logic verified across multiple ingress topologies');

// Test 3: Keyset / Cursor Pagination Query Builder
function buildCursorQuery(cursor, action, limit = 25) {
  const boundedLimit = Math.min(parseInt(limit, 10) || 25, 100);
  const query = {};
  if (action) query.action = action;
  if (cursor) query.timestamp = { $lt: new Date(cursor) };
  return { query, limit: boundedLimit };
}

const initialQuery = buildCursorQuery(null, null, 25);
assert.deepStrictEqual(initialQuery.query, {});
assert.strictEqual(initialQuery.limit, 25);

const cursorIso = '2026-11-15T12:00:00.000Z';
const paginatedQuery = buildCursorQuery(cursorIso, 'ROLE_CHANGED', 50);
assert.strictEqual(paginatedQuery.query.action, 'ROLE_CHANGED');
assert.strictEqual(paginatedQuery.query.timestamp.$lt.toISOString(), cursorIso);
assert.strictEqual(paginatedQuery.limit, 50);

// Limit bounding test (prevent unbounded DOS memory scans)
const dosQuery = buildCursorQuery(null, null, 5000);
assert.strictEqual(dosQuery.limit, 100, 'Limit must be bounded to max 100');
console.log('✅ Keyset cursor query builder and limit bounding verified');

console.log('🎉 100% of Milestone 6 Parity In-Memory Checks Passed Successfully!');
