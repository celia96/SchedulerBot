const mongoose = require('mongoose');
const connect = process.env.MONGODB_URI;
mongoose.connect(connect);

if (!process.env.MONGODB_URI) {
  console.log('Error: MONGODB_URI is not set. Did you run source env.sh ?');
  process.exit(1);
}

const taskSchema = mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  eventId: String,
  requesterId: String
})

const userSchema = mongoose.Schema({
  tokens: {
    accessToken: String,
    refreshToken: String,
  },
  googleId: String,
  meetingLength: {
    type: Number,
    default: 30
  },
  slackId: String,
  slackUsername: String,
  slackEmail: String,
  slackDMId: String
})

const meetingSchema = mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true
  },
  invitee: {
    type: String,
    required: true
  },
  subject: String,
  location: String,
  meetingLength: Number,
  status: {
    pending: Boolean,
    complete: Boolean
  },
  // createdAt: Date,
  requesterId: String
})

const inviteSchema = mongoose.Schema({
  eventId: String,
  inviteeId: String,
  requesterId: String,
  status: {
    pending: Boolean,
    complete: Boolean
  }
})

const Task = mongoose.model('Task', taskSchema); // {Task:, subject, date
const User = mongoose.model('User', userSchema);
const Meeting = mongoose.model('Meeting', meetingSchema); // meeting,date,time,person
const Invite = mongoose.model('Invite', inviteSchema);

module.exports = {
  Task,
  User,
  Meeting,
  Invite
};
