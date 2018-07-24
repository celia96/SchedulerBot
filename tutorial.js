const { IncomingWebhook,RTMClient, WebClient } = require('@slack/client');
const token = process.env.SLACK_TOKEN;
var express = require('express')
var bodyParser = require('body-parser')
var app = express()

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = 'token.json';


app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());

const rtm = new RTMClient(token);
//rtm api client https://slackapi.github.io/node-slack-sdk/rtm_api
// For structure of `event`, see https://api.slack.com/events/message

const web = new WebClient(token);
//button https://api.slack.com/docs/message-buttons
//post message method https://api.slack.com/methods/chat.postMessage
// web api client https://slackapi.github.io/node-slack-sdk/web_api

//ngrok url: https://api.slack.com/apps/ABUM6GAAC/interactive-messages
rtm.start();

rtm.on('message', (message) => {
  // Skip messages that are from a bot or my own user ID
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
    return;
  }

  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);

  web.chat.postMessage({
    channel: message.channel,
    text: 'Hello there',
    attachments: [{
      "text": "Yes or no?",
      "fallback": "Unable to choose",
      "callback_id": "button",
      attachment_type: "default",
      actions: [{
          "name": "button",
          "text": "create",
          "type": "button",
          "value": "create"
      },
      {
          "name": "button",
          "text": "cancel",
          "type": "button",
          "value": "cancel"
      }]
    }]
  })
    .then((res) => {
      // `res` contains information about the posted message
      console.log('Message sent: ', res);

    })
    .catch(error => console.log(error));
});

app.post('/', (req,res) => {
  console.log("HI");
  console.log('post', req.body.payload)
  // fs.readFile('credentials.json', (err, content) => {
  //   if (err) return console.log('Error loading client secret file:', err);
  //   // Authorize a client with credentials, then call the Google Calendar API.
  //   authorize(JSON.parse(content), listEvents);
  // });
})


// Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Calendar API.
//   authorize(JSON.parse(content), listEvents);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function getCalendarList() {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
  });
}

function insertEvent() {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
  });
}


function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}



app.listen(3000)
