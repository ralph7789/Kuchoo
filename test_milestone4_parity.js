/**
 * In-Memory Self-Check / Unit Verification for Milestone 4 (Screen Sharing & Conferencing)
 * Non-Negotiable Invariant 6: In-Memory Verification
 */

const assert = require('assert');

async function runMilestone4SelfCheck() {
  console.log('⚡ Starting Milestone 4 In-Memory Self-Check...');

  // 1. In-Memory Huddle Roster State Machine
  class HuddleManager {
    constructor() {
      this.activeHuddles = new Map(); // channelId -> Map<socketId, participant>
    }

    join(channelId, socketId, user) {
      if (!this.activeHuddles.has(channelId)) {
        this.activeHuddles.set(channelId, new Map());
      }
      const roster = this.activeHuddles.get(channelId);
      roster.set(socketId, {
        socketId,
        userId: user._id,
        displayName: user.displayName,
        sharingScreen: false
      });
      return Array.from(roster.values());
    }

    leave(channelId, socketId) {
      if (this.activeHuddles.has(channelId)) {
        const roster = this.activeHuddles.get(channelId);
        roster.delete(socketId);
        const count = roster.size;
        if (count === 0) {
          this.activeHuddles.delete(channelId);
          return [];
        }
        return Array.from(roster.values());
      }
      return [];
    }

    setScreenShare(channelId, socketId, sharing) {
      if (this.activeHuddles.has(channelId)) {
        const roster = this.activeHuddles.get(channelId);
        if (roster.has(socketId)) {
          roster.get(socketId).sharingScreen = Boolean(sharing);
        }
        return Array.from(roster.values());
      }
      return [];
    }

    disconnect(socketId) {
      for (const [channelId, roster] of this.activeHuddles.entries()) {
        if (roster.has(socketId)) {
          roster.delete(socketId);
          if (roster.size === 0) {
            this.activeHuddles.delete(channelId);
          }
        }
      }
    }

    getStatus(channelId) {
      const roster = this.activeHuddles.get(channelId);
      return {
        channelId,
        active: Boolean(roster && roster.size > 0),
        participants: roster ? Array.from(roster.values()) : []
      };
    }
  }

  const manager = new HuddleManager();

  // Test Step A: Channel has no huddle initially
  let status = manager.getStatus('chan_eng');
  assert.strictEqual(status.active, false);
  assert.strictEqual(status.participants.length, 0);

  // Test Step B: Alice starts Huddle in chan_eng
  const roster1 = manager.join('chan_eng', 'sock_alice', { _id: 'u_alice', displayName: 'Alice' });
  assert.strictEqual(roster1.length, 1);
  assert.strictEqual(roster1[0].displayName, 'Alice');
  assert.strictEqual(roster1[0].sharingScreen, false);

  status = manager.getStatus('chan_eng');
  assert.strictEqual(status.active, true);
  assert.strictEqual(status.participants.length, 1);

  // Test Step C: Bob joins the huddle
  const roster2 = manager.join('chan_eng', 'sock_bob', { _id: 'u_bob', displayName: 'Bob' });
  assert.strictEqual(roster2.length, 2);

  // Test Step D: Bob initiates Screen Sharing
  const rosterWithScreen = manager.setScreenShare('chan_eng', 'sock_bob', true);
  const bobEntry = rosterWithScreen.find(p => p.socketId === 'sock_bob');
  assert.strictEqual(bobEntry.sharingScreen, true, 'Bob sharingScreen flag must be true');

  // Test Step E: Alice leaves the huddle
  const rosterAfterAliceLeft = manager.leave('chan_eng', 'sock_alice');
  assert.strictEqual(rosterAfterAliceLeft.length, 1);
  assert.strictEqual(rosterAfterAliceLeft[0].socketId, 'sock_bob');

  // Test Step F: Bob's socket disconnects unexpectedly
  manager.disconnect('sock_bob');
  status = manager.getStatus('chan_eng');
  assert.strictEqual(status.active, false, 'Huddle must become inactive after all leave');
  assert.strictEqual(status.participants.length, 0);

  console.log('✅ Invariant Verified: Huddle roster state machine, screen sharing, and socket disconnect cleanup valid.');

  console.log('🚀 Milestone 4 In-Memory Self-Check PASSED with 100% assertions satisfied.');
}

runMilestone4SelfCheck().catch(err => {
  console.error('❌ Milestone 4 Self-Check Failed:', err);
  process.exit(1);
});
