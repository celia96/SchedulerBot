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


const {google} = require('googleapis');

// Each API may support multiple version. With this sample, we're getting
// v1 of the urlshortener API, and using an API key to authenticate.

const oauth2Client = new google.auth.OAuth2(
  YOUR_CLIENT_ID,
  YOUR_CLIENT_SECRET,
  YOUR_REDIRECT_URL
);

// generate a url that asks permissions for Google+ and Google Calendar scopes
const scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

const url = oauth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'offline',

  // If you only need one scope you can pass it as a string
  scope: scopes
});

// GET /oauthcallback?code={authorizationCode}



const {tokens} = await oauth2Client.getToken(code)
oauth2Client.setCredentials(tokens);

oauth2client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in my database!
    console.log(tokens.refresh_token);
  }
  console.log(tokens.access_token);
});

oauth2client.setCredentials({
  refresh_token: `STORED_REFRESH_TOKEN`
});


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
