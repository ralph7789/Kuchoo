// Simple CLI-based admin dashboard for Messenger backend
// Usage: node admin.js

const readline = require('readline');
const mongoose = require('mongoose');
const User = require('./models/User'); // You must have a User model
const Group = require('./models/Group'); // You must have a Group model

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/messenger';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n--- Admin Dashboard ---');
  console.log('1. List all users');
  console.log('2. Add user');
  console.log('3. Modify user');
  console.log('4. Delete user');
  console.log('5. List all groups');
  console.log('6. Add group');
  console.log('7. Delete group');
  console.log('0. Exit');
  rl.question('Select an option: ', handleMenu);
}

async function handleMenu(option) {
  switch (option.trim()) {
    case '1':
      const users = await User.find();
      console.table(users.map(u => ({ id: u._id, email: u.email, displayName: u.displayName })));
      break;
    case '2':
      rl.question('Email: ', email => {
        rl.question('Password: ', password => {
          rl.question('Display Name: ', async displayName => {
            await User.create({ email, password, displayName });
            console.log('User added.');
            showMenu();
          });
        });
      });
      return;
    case '3':
      rl.question('User ID to modify: ', async id => {
        const user = await User.findById(id);
        if (!user) { console.log('User not found.'); showMenu(); return; }
        rl.question(`New email (${user.email}): `, async email => {
          rl.question(`New display name (${user.displayName}): `, async displayName => {
            user.email = email || user.email;
            user.displayName = displayName || user.displayName;
            await user.save();
            console.log('User updated.');
            showMenu();
          });
        });
      });
      return;
    case '4':
      rl.question('User ID to delete: ', async id => {
        await User.findByIdAndDelete(id);
        console.log('User deleted.');
        showMenu();
      });
      return;
    case '5':
      const groups = await Group.find();
      console.table(groups.map(g => ({ id: g._id, name: g.name, members: g.members.length })));
      break;
    case '6':
      rl.question('Group name: ', name => {
        rl.question('Member IDs (comma separated): ', async members => {
          await Group.create({ name, members: members.split(',').map(m => m.trim()) });
          console.log('Group added.');
          showMenu();
        });
      });
      return;
    case '7':
      rl.question('Group ID to delete: ', async id => {
        await Group.findByIdAndDelete(id);
        console.log('Group deleted.');
        showMenu();
      });
      return;
    case '0':
      rl.close();
      mongoose.disconnect();
      return;
    default:
      console.log('Invalid option.');
  }
  showMenu();
}

rl.on('close', () => {
  console.log('Exiting admin dashboard.');
  process.exit(0);
});

showMenu();
