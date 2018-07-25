const { IncomingWebhook,RTMClient, WebClient } = require('@slack/client');
const { User, Task, Meeting, Invite } = require('./models')
const slack_TOKEN = process.env.SLACK_TOKEN;
const slack_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const projectId = process.env.DIALOGFLOW_PROJECT_ID;
const sessionId = 'quickstart-session-id';
const languageCode = 'en-US';
var bodyParser = require('body-parser')
var express = require('express')
var app = express()
var axios = require('axios')
var clientToken = process.env.CLIENT_ACCESS_TOKEN;
const { generateAuthUrl, getToken, insertEvent } = require('./google.js')
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());

var url = 'http://bd2a0dc5.ngrok.io';

//mlab
var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;
mongoose.connect(connect);

// Instantiate a DialogFlow client.
const dialogflow = require('dialogflow');
const sessionClient = new dialogflow.SessionsClient();

// Define session path
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

//Slack RTM
const rtm = new RTMClient(slack_TOKEN);
  //rtm api client https://slackapi.github.io/node-slack-sdk/rtm_api
  // For structure of `event`, see https://api.slack.com/events/message

//Slack Web
const web = new WebClient(slack_TOKEN);
  //button https://api.slack.com/docs/message-buttons
  //post message method https://api.slack.com/methods/chat.postMessage
  // web api client https://slackapi.github.io/node-slack-sdk/web_api
  // update ngrok url: https://api.slack.com/apps/ABUM6GAAC/interactive-messages


rtm.start();
rtm.on('message', (message) => {

  // Skip messages that are from a bot or my own user ID
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
    console.log('skip message')
    return;
  }

  //Store user info if new
  axios.get(`https://slack.com/api/users.info?token=${slack_TOKEN}&user=${message.user}`)
  .then(result => {
    var user = result.data.user
    User.findOne({slackId: message.user}) //Search if slackId is already stored in database
    .then(foundUser => {
      if (foundUser) {
        return foundUser
      } else {
        var newUser = new User({
          slackId: user.id,
          slackUsername: user.name,
          slackEmail: user.profile.email,
          tokens: {}
        })
         newUser.save()
         .then(res22 => {
           web.chat.postMessage({
             channel: message.channel,
             text: `If you want to use scheduler-slackbot, go to the following link to authorize access to Google Calendar: ${url}/authorize?slackId=${message.user}`
           })
         })
         .catch(error => console.log('error', error))
      }
    })
    .catch(err2 => {
      console.log(err2)
    })
  })
  .catch(err => console.log(err))



  //message received from user
  console.log(`< CLIENT MESSAGE > channel:${message.channel}) ${message.user} says: ${message.text}`);


  //send natural language to dialogflow
  axios.post('https://api.dialogflow.com/v1/query?v=20150910',
    {
      query: message.text,
      lang: 'en',
      sessionId: 'session',
      timezone: 'America/Los_Angeles'
    },
    {
      headers: {
        'Content-Type' : 'application/json',
        'Authorization' : `Bearer ${clientToken}`
      }
  })
  .then((res1) => {
    //dialogflow response
    // Task: {Task, subject, date}
    // Meeting: {Meeting, date, time, given-name, subject (not required)}
    var params = res1.data.result.parameters
    var prompt = res1.data.result.fulfillment.speech
    console.log("< DIALOGFLOW RESPONSE > ", res1.data)
    var task = params.Task
    var subject = params.subject
    var date = params.date
    var time = params.time
    var meeting = params.Meeting
    var invitee = params.name

    if (prompt === 'Scheduled!') {
      if (task) {
        web.chat.postMessage({
          channel: message.channel,
          text: '',
          attachments: [{
            "text": `${task} to ${subject} on ${date}?`,
            "fallback": "Unable to understand natural language",
            "callback_id": "button",
            attachment_type: "default",
            actions: [{
                "name": "button",
                "text": "Yes",
                "type": "button",
                "value": "Yes"
            },
            {
                "name": "button",
                "text": "No",
                "type": "button",
                "value": "No"
            }]
          }]
        })
      } else if (meeting) {
        web.chat.postMessage({
          channel: message.channel,
          text: '',
          attachments: [{
            "text": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
            "fallback": "Unable to understand natural language",
            "callback_id": "button",
            attachment_type: "default",
            actions: [{
                "name": "button",
                "text": "Yes",
                "type": "button",
                "value": "Yes"
            },
            {
                "name": "button",
                "text": "No",
                "type": "button",
                "value": "No"
            }]
          }]
        })
      }
    } else {
      web.chat.postMessage({
        channel: message.channel,
        text: prompt
      })
    }

    // // Individual prompt code
    // if (task) {
    //   if (!date) {
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: 'On what date?'
    //     })
    //   } else if (!subject) {
    //       web.chat.postMessage({
    //         channel: message.channel,
    //         text: 'What do you want to do?'
    //       })
    //   } else {
    //     //slackbot ask user for confirmation
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: '',
    //       attachments: [{
    //         "text": `${task} to ${subject} on ${date}?`,
    //         "fallback": "Unable to understand natural language",
    //         "callback_id": "button",
    //         attachment_type: "default",
    //         actions: [{
    //             "name": "button",
    //             "text": "Yes",
    //             "type": "button",
    //             "value": "Yes"
    //         },
    //         {
    //             "name": "button",
    //             "text": "No",
    //             "type": "button",
    //             "value": "No"
    //         }]
    //       }]
    //     })
    //     .then((res) => {
    //       console.log('< SLACKBOT MESSAGE > Message sent by slackbot: ', res);
    //     })
    //     .catch(err => console.log('err', err));
    //   }
    // } else if (meeting) {
    //   if (!date) {
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: 'On what date?'
    //     })
    //   } else if (!time) {
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: 'What time?'
    //     })
    //   } else if (!invitee) {
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: 'With whom?'
    //     })
    //   } else {
    //     web.chat.postMessage({
    //       channel: message.channel,
    //       text: '',
    //       attachments: [{
    //         "text": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
    //         "fallback": "Unable to understand natural language",
    //         "callback_id": "button",
    //         attachment_type: "default",
    //         actions: [{
    //             "name": "button",
    //             "text": "Yes",
    //             "type": "button",
    //             "value": "Yes"
    //         },
    //         {
    //             "name": "button",
    //             "text": "No",
    //             "type": "button",
    //             "value": "No"
    //         }]
    //       }]
    //     })
    //     .then((res) => {
    //       console.log('< SLACKBOT MESSAGE > Message sent by slackbot: ', res);
    //     })
    //     .catch(err => console.log('err', err));
    //   }
    // } else {
    //   web.chat.postMessage({
    //     channel: message.channel,
    //     text: 'Enter a valid command'
    //   })
    // }
  })
  .catch(err2 => console.log('err2', err2));
});

app.post('/', (req,res) => {
  console.log(req.body.payload)
  var newReq = JSON.parse(req.body.payload)
  var value = newReq.actions[0].value
  if (value === 'No') {
    console.log("post, No")
    return;
  } else if (value === 'Yes') {
    console.log("post, Yes")

    User.findOne({slackId: newReq.user.id})
      .then((user) => {
        if(user.tokens.accessToken) {
          if (task === "remind") {
            reminder = true;
          } else {
            reminder = false;
          }
          return insertEvent(user.tokens, reminder, subject, date)
        } else {
          console.log("DO NOT HAVE ACCESS TOKEN");
        }
      })
      .then((event) => {
        console.log("Event ", event);
        if (event) {
          var newTask = new Task({
            subject: subject,
            day: date,
            eventId: event.id,
            requesterId: slackId
          })
          return newTask.save();
        } else {
          res.redirect('/authorize');
        }
      })
      .catch((err) => {
        console.log("Error in creating event: ", err);
      })
  }
})


app.get('/authorize', (req, res) => {
  console.log("AUTH");
  var slackid = req.query.slackId
  var url = generateAuthUrl(slackid);
  console.log(url);
  res.redirect(url);
})

// process.env.REDIRECT_URL.replace(/https?:\/\/.+\//, '/')

app.get('/oauthcallback', (req, res) => {
  console.log("Getting tokens");
  getToken(req.query.code)
    .then((tokens) => {
      // save the token to user model
      var slackid = req.query.state;
      User.find({slackId: slackid})
       .then((user) => {
          user.tokens.accessToken = tokens.access_token;
          user.tokens.refreshToken = tokens.refresh_token;
          return user.save();
       })
       .then((saved) => {
         console.log("Successfully updated tokens at " + saved);
       })
    })
    .then(() => {
      res.send('INSERTED AN EVENT')
    })
    .catch((err) => {
      res.send(err)
    })
})



/*

reminder & schedule:
function createEvent (slackid, reminder, task, subject, date) {
  User.find({slackId: id})
    .then((user) => {
      if(user[0].tokens.access_token) {
        if (task === "remind") {
          reminder = true;
        } else {
          reminder = false;
        }
        return google.insertEvent(user[0].tokens, reminder, subject, date)
      } else {
        console.log("DO NOT HAVE ACCESS TOKEN");
      }
    })
    .then((event) => {
      console.log("Event ", event);
      var newTask = new Task({
        subject: subject,
        day: date,
        eventId: event.id
        requesterId: slackId
      })
      return newTask.save();
    })
    .then((saved) => {
      console.log("Successfully saved the event as a task " + saved);
    })
    .catch((err) => {
      console.log("Error in creating event: ", err);
    })
}

// check the time conflict
function checkTime (date) {
  occupied = false;
  Task.find({day: date})
    .then((task) => {
      if (task[0].length !== 0) {
        exist = true;
      }
    })
  return occupied
}

*/


app.listen(3000)
