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
const { generateAuthUrl, getToken, insertEvent, freeBusy } = require('./google.js')
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());

var moment = require('moment')

var url = 'https://agile-depths-13075.herokuapp.com';

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

//Slack Web
const web = new WebClient(slack_TOKEN);
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

  //message received from user
  console.log(`< CLIENT MESSAGE > channel:${message.channel}) ${message.user} says: ${message.text}`);

  //Check if user is saved in database & has access token
  User.findOne({slackId:message.user})
  .then(foundUser => {
    if (!foundUser) {
      console.log("User doesn't exist yet")
      axios.get(`https://slack.com/api/users.info?token=${slack_TOKEN}&user=${message.user}`)
      .then(result => {
        console.log(result.data)
        var user = result.data.user
        var real_name_arr = user.real_name.split(' ')
        var newUser = new User({
          slackId: user.id,
          slackUsername: user.name,
          slackFirstName: real_name_arr[0],
          slackLastName: real_name_arr[1],
          slackTimeZone: user.tz,
          slackEmail: user.profile.email,
          tokens: {
            accessToken: '',
            refreshToken: ''
          }
        })
        newUser.save()
        .then(res22 => {
          web.chat.postMessage({
            channel: message.channel,
            text: `Hello ${real_name_arr[0]}! If you want to use scheduler-slackbot, go to the following link to authorize access to Google Calendar: ${url}/authorize?slackId=${message.user}`
          })
        })
        .catch(error => console.log('error', error))
      })
      .catch(errr => console.log('errr', errr))
    } else if (!foundUser.tokens.accessToken) {
      console.log('User exists & NO googleCal token')
      web.chat.postMessage({
        channel: message.channel,
        text: `Hello ${foundUser.slackFirstName}! If you want to use scheduler-slackbot, go to the following link to authorize access to Google Calendar: ${url}/authorize?slackId=${message.user}`
      })
    } else {
      console.log('User exists & has googleCal token')

      //send natural language to dialogflow
      axios.post('https://api.dialogflow.com/v1/query?v=20150910',
        {
          query: message.text,
          lang: 'en',
          sessionId: 'session',
          timezone: foundUser.tz
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
        console.log("< DIALOGFLOW RESPONSE > ", res1.data.result.parameters)
        var task = params.Task
        var subject = params.subject
        var date = params.date
        var time = params.time
        var meeting = params.Meeting
        var invitee = params.name

        //Ask Confirmation or prompt user for more details
        if (prompt === 'Scheduled!') { //confirmation
          if (task) { //Remind
            web.chat.postMessage({
              channel: message.channel,
              text: '',
              attachments: [{
                "text": `${task} to ${subject} on ${date}?`,
                "fallback": `${task} to ${subject} on ${date}?`,
                "callback_id": `${task},${subject},${date}`,
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
          } else if (meeting) { //Meeting
            invitee = params.name.join(' ')
            web.chat.postMessage({
              channel: message.channel,
              text: '',
              attachments: [{
                "text": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
                "fallback": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
                "callback_id": `${meeting},${subject},${date},${invitee},${time}`,
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
        } else { //prompt user for more details
          web.chat.postMessage({
            channel: message.channel,
            text: prompt
          })
        }
      })
      .catch(err2 => console.log('err2', err2));
    }
  })
  .catch(errrr => console.log('errrr', errrr))
});

app.post('/', (req,res) => {
  var newReq = JSON.parse(req.body.payload)
  var value;
  if (newReq.actions[0].name === 'button') {
    value = newReq.actions[0].value
  } else if (newReq.actions[0].name === 'time_list') {
    value = 'meetingDate'
  }
  if (value === 'No') { //User clicked on 'no'
    console.log("post, No")
    web.chat.postMessage({
      channel: newReq.channel.id,
      text: "Please enter another event to schedule"
    })
    return;
  } else if (value === 'meetingDate') {
    var newDate = newReq.actions[0].selected_options[0].value // 2018-07-27T22:00:00.000Z
    var callback_id = newReq.callback_id
    var arr = callback_id.split(',')
    // meeting: [meeting, subject(opt), date, invitee, time]
    var meeting = arr[0]
    var subject = arr[1];
    var date = newDate.slice(0,10)
    var invitee = arr[3]
    var time = newDate.slice(11,-5)
    web.chat.postMessage({
      channel: newReq.channel.id,
      text: '',
      attachments: [{
        "text": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
        "fallback": `${meeting} with ${invitee} to ${subject} at ${time} on ${date}?`,
        "callback_id": `${meeting},${subject},${date},${invitee},${time}`,
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
  } else if (value === 'Yes') { //User clicked on 'yes'
    console.log("post, Yes")

    var callback_id = newReq.callback_id
    var arr = callback_id.split(',')
    // remind: [remind, subject, date]
    // meeting: [meeting, subject(opt), date, invitee, time]
    var reminder = false;
    var subject = arr[1];
    var date;
    var inviteeName;
    var conflicted = false
    if (arr[0] === 'remind') {
      reminder = true
      date = arr[2] + 'T' + '09:00:00-07:00'
    } else if (arr[0] === 'Schedule a meeting') {
      if (subject === '') subject = 'Meeting'
      date = arr[2] + 'T' + arr[4]
      inviteeName = arr[3].split(' ')
    }


    if (reminder) { //REMIND
      User.findOne({slackId: newReq.user.id})
      .then((user) => {
        return insertEvent(user.tokens, reminder, subject, date, user.slackTimeZone, null)
      })
      .then((event) => {
        var newTask = new Task({
          subject: event.data.summary,
          day: event.data.start.dateTime,
          eventId: event.data.id,
          requesterId: newReq.user.id
        })
        return newTask.save();
      })
      .then(()=> {
        web.chat.postMessage({
          channel: newReq.channel.id,
          text: 'Reminder successfully set!'
        })
      })
      .catch((err) => {
        console.log("Error in creating REMINDER event: ", err);
      })
    } else { //MEETING
      var inviteeEmail = [];
      var invitee= [];
      var busyTime = [];
      var allWork = inviteeName.map(item => {
        return User.findOne({slackFirstName:item})
        .exec()
        .then(found => {
          inviteeEmail.push(found.slackEmail)
          invitee.push(found.tokens)
        })
        .then(() => {
          // console.log("FREEBUSY");
          var subWork = [];
          invitee.forEach((i) => {
            // console.log("tokens: ", i);
            if (i.accessToken) {
              var d = new Date(date);
              console.log("Date: ", d);
              var min = new Date(d.setDate(d.getDate()-1)); // min
              var max = new Date(d.setDate(d.getDate()+3)); // max
              console.log("MIN", min);
              console.log("MAX", max);
              // var min = new Date('2018-07-20T00:00:00.000Z');
              // var max = new Date('2018-07-30T00:00:00.000Z');
              subWork.push(freeBusy(i, min, max)
                .then((res) => {
                  // console.log("RES.CALENDAR: ", JSON.stringify(res.data.calendars));
                  return res.data.calendars.primary.busy;
                })
                .catch((err) => {
                  console.log("ERRRRR: ", err);
                }))
            }
          })
          return Promise.all(subWork)
            .then((data) => {
              // console.log("BUSYYYY", JSON.stringify(data));
              return data
            })
        })
      })
      Promise.all(allWork)
        .then((data) => {
          // console.log("Data: ", JSON.stringify(data));
          busyTime = data[0][0];
          console.log("BUSY: ", busyTime);
          console.log("DATE is: ", date);
          console.log("Value of Date is: ", new Date(date).valueOf());
          var d = new Date(date)
          console.log("D: ", d);
          var myMin = new Date(d); // date value
          var myMax = new Date(d.setHours(d.getHours() + 1)) // date value
          busyTime.forEach(time => {
            console.log("MINE: ", myMin, myMax);
            var othersMin = new Date(time.start)
            console.log("MIN", othersMin);
            var othersMax = new Date(time.end)
            console.log("MAX", othersMax);
            if ((myMin >= othersMin && myMax <= othersMax) || (myMax >= othersMin && myMax < othersMax) || (myMin >= othersMin && myMin <= othersMax)) {
              console.log("CONFLICTINGGGG");
              conflicted = true;
            }
        })
        // compare date and time to busy time

      })
      .then(() => {
        if (conflicted) {
          intervals = [];
          busyTime.sort(function(a,b){
            return new Date(a.start) - new Date(b.start);
          });
          console.log("Sorting busy time: ", busyTime);
          // var today = new Date();
          // today.setHours(10);
          // today.setMinutes(0);
          // today.setSeconds(0);
          // var tmrw = today.setDate(today.getDate() + 1);

          var minDay = new Date(date);
          minDay.setDate(minDay.getDate() - 1); // a day before the date that we are scheduling a meeting
          var int1 = {
            start : new Date(minDay),
            end: new Date(busyTime[0].start)
          }
          intervals.push(int1)
          var maxDay = new Date(date);
          maxDay.setDate(maxDay.getDate() + 3);
          var int2 = {
            start: new Date(busyTime[busyTime.length-1].end),
            end: new Date(maxDay)
          }
          intervals.push(int2)
          // if there are more than one busy time
          for (var i = 0; i < busyTime.length-1; i++) {
            var interval =
            {
              start: new Date(busyTime[i].end),
              end: new Date(busyTime[i+1].start)
            }

            intervals.push(interval);
          }
          console.log("Intervals: ", intervals);
          freeTime = [];
          intervals.forEach((time) => {
            time.start = new Date(time.start)
            time.end = new Date(time.end)
            console.log("time: ", time.start);
            console.log("Start Hours: ", time.start.getHours());
            console.log("End Hours: ", time.end.getHours());

            // iterate through the days between start and end date

            console.log("Start date: ", time.start.getDate());
            console.log("End date: ", time.end.getDate());

            // start and end date are same
            if (time.start.getDate() === time.end.getDate()) {
              if (time.start.getHours() < 17 && time.end.getHours() > 10) {
                var end = new Date(time.end);
                var start = new Date(time.start);
                var free = {
                  start: start,
                  end: end
                }
                freeTime.push(free)
              }
            } else {
              // there are nights between start and end
              while (moment(time.start).isBefore(time.end)) {
                console.log("TIME STARTs at :", time.start);
                console.log("MOMENT IS BEFORE");
                var startPlus = new Date(time.start);
                startPlus.setDate(startPlus.getDate() + 1);
                // only one night between start and end
                if (startPlus.getDate() === time.end.getDate()) {
                  // ex) 5pm - 11am => 10am - 11am
                  if (time.start.getHours() >= 17 && time.end.getHours() > 10) {
                    // time.start.setDate(time.start.getDate() + 1);
                    var end = new Date(time.end);
                    var start = new Date(time.end);
                    start.setDate(start.getDate());
                    start.setHours(10);
                    start.setMinutes(0);
                    start.setSeconds(0);
                    var free = {
                      start: start,
                      end: end
                    }
                    freeTime.push(free);
                    // ex) 2pm - 10am => 2pm - 5pm
                  } else if (time.start.getHours() < 17 && time.end.getHours() <= 10) {
                    var start = new Date(time.start);
                    var end = new Date(time.start);
                    end.setDate(end.getDate());
                    end.setHours(17);
                    end.setMinutes(0);
                    end.setSeconds(0);
                    var free = {
                      start: start,
                      end: end
                    }
                    freeTime.push(free);
                    // ex) 2pm - 11am = 2pm - 5pm & 10am - 11am
                  } else if (time.end.getHours() > 10) {
                    // first slot
                    var start1 = new Date(time.start);
                    var end1 = new Date(time.start);
                    end1.setDate(end1.getDate());
                    end1.setHours(17);
                    end1.setMinutes(0);
                    end1.setSeconds(0);
                    var free1 = {
                      start: start1,
                      end: end1
                    }
                    // second slot
                    var end2 = new Date(time.end);
                    var start2 = new Date(time.end)
                    start2.setDate(start2.getDate());
                    start2.setHours(10);
                    start2.setMinutes(0);
                    start2.setSeconds(0);

                    var free2 = {
                      start: start2,
                      end: end2
                    }
                    freeTime.push(free1);
                    freeTime.push(free2);
                  }
                  time.start.setDate(time.end.getDate());
                  time.start.setHours(time.end.getHours());
                  time.start.setMinutes(time.end.setMinutes())
                  time.start.setSeconds(time.end.setSeconds())
                } else {
                  // return;
                  console.log("MULTIPLE NIghts");
                  // multiple nights between start and end
                  // start before 5pm
                  if (time.start.getHours() < 17) {
                    var start = new Date(time.start);
                    var end = new Date(time.start);
                    end.setDate(end.getDate());
                    end.setHours(17);
                    end.setMinutes(0);
                    end.setSeconds(0);
                    var free = {
                      start: start,
                      end: end
                    }
                    freeTime.push(free);
                    time.start.setDate(time.start.getDate() + 1);
                    time.start.setHours(10);
                    time.start.setMinutes(0)
                    time.start.setSeconds(0)
                  }
                  // start at 5pm
                  if (time.start.getHours() === 17) {
                    // update the start date
                    time.start.setDate(time.start.getDate() + 1);
                    time.start.setHours(10);
                    time.start.setMinutes(0);
                    time.start.setSeconds(0);
                  }
                }
              }
            }
          })
          console.log("FREE TIME: ", freeTime);
          suggestTime = []
          freeTime.map(item => { //mapping through all free intervals
            //Changing TimeZone
            var timess = [] // available times for this interval
            var startTime = new Date(item.start) //3
            // timess.push(startTime)

            var startPlusHour = new Date(startTime);
            console.log("START TIME: ", startTime);
            startPlusHour = new Date(startPlusHour.setHours(startPlusHour.getHours() + 1)) //4
            endTime = new Date(item.end)
            while (startPlusHour.valueOf() <= endTime.valueOf()) {
              console.log("SSSSS: ", startTime);
              timess.push(startTime)
              startTime = new Date(startPlusHour)
              startPlusHour = new Date(startPlusHour.setHours(startPlusHour.getHours() + 1))
              console.log('SSSSSSSSSSSSS:', startTime, startPlusHour)
            }

            timess.forEach(item2 => {
              var current = new Date()
              var currentUTC = current.getTime() + (current.getTimezoneOffset() * 60000)
              var currentND = new Date(currentUTC + (3600000*-14))
              var startUTC = item2.getTime() + (item2.getTimezoneOffset() * 60000)
              var nd = new Date(startUTC + (3600000*-14)) // converted
              if (nd.valueOf() > currentND.valueOf()) {
                suggestTime.push({text:nd, value:nd})
              }
            })
          })

          //SORT suggestTime
          suggestTime.sort(function(a,b){
            return new Date(a.value) - new Date(b.value);
          });

          console.log('conflicting time')
          if (suggestTime.length === 0) {
            web.chat.postMessage({
              channel: newReq.channel.id,
              text: 'There are no available meeting times for the invitees within 2 days of your proposed time. Please choose another date.'
            })
          } else {
            web.chat.postMessage({
              channel: newReq.channel.id,
              text: '',
              response_type: 'in_channel',
              attachments: [{
                text: 'Your proposed meeting time has conflicts. Please choose from these available times to successfully schedule a meeting.',
                fallback: 'Your proposed meeting time has conflicts. Please choose from these available times to successfully schedule a meeting.',
                "color": "#3AA3E3",
                "attachment_type": "default",
                "callback_id": newReq.callback_id,
                actions: [{
                  "name": "time_list",
                  "text": "Pick a time...",
                  "type": "select",
                  "options": suggestTime
                }]
              }]
            })
          }
        } else {
          console.log('no conflict in time');
          //Create Events
          User.findOne({slackId: newReq.user.id})
           .then((user) => {
             inviteeEmail.push(user.slackEmail)
             console.log("Invitee: ", inviteeEmail);
             var addEvent = inviteeEmail.map(email => {
               return User.findOne({slackEmail:email})
               .exec()
               .then(invite => {
                 var ind = inviteeEmail.indexOf(email)
                 var emailList = inviteeEmail.slice()
                 emailList.splice(ind,1)
                 console.log("Inviting: ", invite);
                 return insertEvent(invite.tokens, reminder, subject, date, invite.slackTimeZone, emailList)
               })
               .catch((err) => {
                 console.log("FIRST error in inserting an event: ", err);
               })
             })
             Promise.all(addEvent)
               .then((data) => {
                 console.log("DATAAA: ", data);
                   var newMeeting = new Meeting({
                     date: date,
                     invitee: inviteeName,
                     subject: subject,
                     location: '800 Howard St., San Francisco, CA 94103',
                     meetingLength: 1,
                     requesterId: newReq.user.id
                   })
                   return newMeeting.save();
               })
               .catch((err) => {
                 console.log("Error in adding an event: ", err);
               })
          })
          .then(() => {
            web.chat.postMessage({
              channel: newReq.channel.id,
              text: 'Meeting successfully scheduled!'
            })
          })
          .catch((err) => {
              console.log("Error in creating MEETING event: ", err);
          })
        }
      })
    }
  }
})


app.get('/authorize', (req, res) => {
  console.log("AUTH");
  var slackid = req.query.slackId
  var url = generateAuthUrl(slackid);
  res.redirect(url);
})

// process.env.REDIRECT_URL.replace(/https?:\/\/.+\//, '/')

app.get('/oauthcallback', (req, res) => {
  console.log("Getting tokens");
  getToken(req.query.code)
    .then((tokens) => {
      // save the token to user model
      var slackid = req.query.state;
      User.findOne({slackId: slackid})
       .then((user) => {
         console.log('user',user);
          user.tokens.accessToken = tokens.access_token;
          user.tokens.refreshToken = tokens.refresh_token;
          return user.save();
       })
       .then((saved) => {
         console.log("Successfully updated tokens at " + saved);
       })
    })
    .then(() => {
      res.send('Successfully authorized')
    })
    .catch((err) => {
      res.send(err)
    })
})



app.listen(3000)
