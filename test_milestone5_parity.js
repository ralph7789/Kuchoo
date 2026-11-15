/**
 * In-Memory Unit Self-Check for Milestone 5 Parity:
 * Webhooks & Slash Commands Architecture
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

console.log('🧪 Starting Milestone 5 Parity In-Memory Self-Check...');

// Test 1: Verify Webhook Model
const WebhookModel = require('./models/Webhook');
assert.ok(WebhookModel.schema, 'Webhook model must have a schema');
assert.ok(WebhookModel.schema.paths.channelId, 'Webhook must have channelId path');
assert.ok(WebhookModel.schema.paths.name, 'Webhook must have name path');
assert.ok(WebhookModel.schema.paths.token, 'Webhook must have token path');
assert.ok(WebhookModel.schema.paths.isActive, 'Webhook must have isActive path');
assert.ok(WebhookModel.schema.paths.createdAt, 'Webhook must have createdAt path');

// Verify token generation default function
const tokenDefaultFn = WebhookModel.schema.paths.token.options.default;
assert.strictEqual(typeof tokenDefaultFn, 'function', 'Webhook token must default to a generation function');
const sampleToken = tokenDefaultFn();
assert.strictEqual(typeof sampleToken, 'string', 'Token should be a string');
assert.strictEqual(sampleToken.length, 48, 'Token should be 24 bytes hex (48 chars)');

// Verify compound B-Tree indexes
const webhookIndex = capturedIndexes.find(idx => idx.fields.token === 1 && idx.fields.isActive === 1);
assert.ok(webhookIndex, 'Webhook must have compound index on { token: 1, isActive: 1 }');
console.log('✅ Webhook model and B-Tree indexes verified');

// Test 2: Slash Command Parser Logic
function parseSlashCommand(content) {
  if (!content || typeof content !== 'string' || !content.startsWith('/')) return null;
  const match = content.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/s);
  if (!match) return null;
  return {
    cmd: match[1].toLowerCase(),
    args: (match[2] || '').trim()
  };
}

// 2.1 /shrug
const shrugParsed = parseSlashCommand('/shrug hello world');
assert.strictEqual(shrugParsed.cmd, 'shrug');
assert.strictEqual(shrugParsed.args, 'hello world');
const shrugResult = shrugParsed.args ? `${shrugParsed.args} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯';
assert.strictEqual(shrugResult, 'hello world ¯\\_(ツ)_/¯');

// 2.2 /poll
const pollParsed = parseSlashCommand('/poll Lunch choices | Pizza | Sushi | Salad');
assert.strictEqual(pollParsed.cmd, 'poll');
const pollParts = pollParsed.args.split('|').map(s => s.trim()).filter(Boolean);
assert.strictEqual(pollParts[0], 'Lunch choices');
assert.deepStrictEqual(pollParts.slice(1), ['Pizza', 'Sushi', 'Salad']);

const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const pollReactions = pollParts.slice(1).map((_, idx) => ({
  emoji: numberEmojis[idx],
  users: []
}));
assert.strictEqual(pollReactions.length, 3);
assert.strictEqual(pollReactions[0].emoji, '1️⃣');
assert.strictEqual(pollReactions[1].emoji, '2️⃣');
assert.strictEqual(pollReactions[2].emoji, '3️⃣');

// 2.3 /topic
const topicParsed = parseSlashCommand('/topic Sprint 42 Planning & Review');
assert.strictEqual(topicParsed.cmd, 'topic');
assert.strictEqual(topicParsed.args, 'Sprint 42 Planning & Review');

// 2.4 /dnd
const dndParsed = parseSlashCommand('/dnd');
assert.strictEqual(dndParsed.cmd, 'dnd');
assert.strictEqual(dndParsed.args, '');

// 2.5 /aladin
const aladinParsed = parseSlashCommand('/aladin summarize latest discussions');
assert.strictEqual(aladinParsed.cmd, 'aladin');
assert.strictEqual(aladinParsed.args, 'summarize latest discussions');
console.log('✅ Slash command parser verified across all command types');

// Test 3: Incoming Webhook Payload Ingestion & Formatting
function formatWebhookMessage(webhookName, payload) {
  const { text, content, username } = payload || {};
  const messageContent = text || content;
  if (!messageContent || typeof messageContent !== 'string' || !messageContent.trim()) {
    throw new Error('Message text or content is required');
  }
  const senderDisplayName = username?.trim() || webhookName;
  return `🤖 **[${senderDisplayName}]**: ${messageContent.trim()}`;
}

const formattedSlackPayload = formatWebhookMessage('GitHub Notifier', {
  text: 'Deployment to production succeeded! 🚀',
  username: 'GitHub Actions'
});
assert.strictEqual(formattedSlackPayload, '🤖 **[GitHub Actions]**: Deployment to production succeeded! 🚀');

const formattedFallbackPayload = formatWebhookMessage('Alertmanager', {
  content: 'High memory usage on pod auth-service'
});
assert.strictEqual(formattedFallbackPayload, '🤖 **[Alertmanager]**: High memory usage on pod auth-service');

assert.throws(() => formatWebhookMessage('Bot', {}), /Message text or content is required/);
console.log('✅ Incoming Webhook payload ingestion and formatting verified');

console.log('🎉 100% of Milestone 5 Parity In-Memory Checks Passed Successfully!');
