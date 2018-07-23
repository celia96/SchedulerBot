const { IncomingWebhook,RTMClient, WebClient } = require('@slack/client');
const token = process.env.SLACK_TOKEN;
var express = require('express')
var bodyParser = require('body-parser')
var app = express()
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
  console.log('post', req.body.payload)
})

app.listen(3000)
