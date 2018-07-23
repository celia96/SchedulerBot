const mongoose = require('mongoose');

if (!process.env.MLAB) {
  console.log('Error: MONGODB_URI is not set. Did you run source env.sh ?');
  process.exit(1);
}

const connect = process.env.MONGODB_URI;
mongoose.connect(connect);

const taskSchema = mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  calendarId: String,
  requesterId: String
}

const userSchema = mongoose.Schema({
  gcalaccount: {
    accessToken: String,
    refreshToken: String,
    googleId: String,
  },
  defaultSetting: {
    meetingLength: 30
  },
  slackId: String,
  slackUsername: String,
  slackEmail: String,
  slackDMId: String
}

const Task = mongoose.model('Task', taskSchema);
const User = mongoose.model('User', userSchema);

module.exports = {
  Task,
  User,
};
