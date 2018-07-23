// Note, that each of the Queries above has a Subject and a Day.
// The word “remind” let’s the bot know that our intent is to create a Task rather than a meeting (which would also require a Time and Invitees).


// insert	POST  /calendars/calendarId/events	Creates an event.

// list	GET  /calendars/calendarId/events	Returns events on the specified calendar.


import bodyParser from 'body-parser';
import express from 'express';
const app = express();
const path = require('path');
const session = require('cookie-session');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());






// GET https://www.googleapis.com/calendar/v3/calendars/calendarId/events
//
// const { RTMClient } = require('@slack/client');
//
// // An access token (from your Slack app or custom integration - usually xoxb)
// const token = process.env.SLACK_TOKEN;
//
// // The client is initialized and then started to get an active connection to the platform
// const rtm = new RTMClient(token);
// rtm.start();
//
// // This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
// const conversationId = 'C1232456';
//
// // The RTM client can send simple string messages
// rtm.sendMessage('Hello there', conversationId)
//   .then((res) => {
//     // `res` contains information about the posted message
//     console.log('Message sent: ', res.ts);
//   })
//   .catch(console.error);

// POST https://www.googleapis.com/calendar/v3/calendars/calendarId/events


// Authorize before

// Instert an event to the given calendar
// id = calendarID
fetch(`https://www.googleapis.com/calendar/v3/calendars/${id}/events`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({

      })
    })
    .then((response) => response.json())
    .then((responseJson) => {
    })
    .catch((err) => {
      console.log("Error in inserting new schedule(event): ", err);
    })


// List of events of the given calendar
// id = calendarID
fetch(`https://www.googleapis.com/calendar/v3/calendars/${id}/events`, {
      method: 'GET',
    })
    .then((response) => response.json())
    .then((responseJson) => {
    })
    .catch((err) => {
      console.log("Error in inserting new schedule(event): ", err);
    })



// GET  /users/me/calendarList
fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList`, {
      method: 'GET',
    })
    .then((response) => response.json())
    .then((responseJson) => {
    })
    .catch((err) => {
      console.log("Error in inserting new schedule(event): ", err);
    })
