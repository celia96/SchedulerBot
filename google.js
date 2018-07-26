const {google} = require('googleapis');

// generate a url that asks permissions for Google+ and Google Calendar scopes
const scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

module.exports = {
  generateAuthUrl: function(state) {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state
    });
  },

  getToken: function(code) {
    return new Promise (function(resolve, reject) {
      oauth2Client.getToken(code, function(err, tokens) {
        if (err) {
          reject(err);
        } else {
          resolve(tokens);
        }
      })
    })
  },

  getCalendarList: function() {
    const calendar = google.calendar('v3');
    return new Promise (function(resolve, reject) {
      calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) {
          // return console.log('The API returned an error: ' + err);
          console.log("ERROR: ", err);
          reject(err);
        }
        else {
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
          resolve(res)
        }
      });
    })

  },

  insertEvent: function(tokens, reminder, title, date, tz, inviteeEmail) {
    console.log("insert event");
    const calendar = google.calendar('v3');
    var arr=[]
    var d = new Date(date)
    if (inviteeEmail) {inviteeEmail.forEach(item => {
      arr.push({'email': item})
    })}
    return new Promise (function(resolve, reject) {
      var event = {
        'summary': title,
        'location': '800 Howard St., San Francisco, CA 94103',
        'description': 'A chance to hear more about Google\'s developer products.',
        'start': {
          'dateTime': date,
          'timeZone': tz,
        },
        'end': {
          'dateTime': new Date(d.setHours(d.getHours() + 1)),
          'timeZone': tz,
        },
        'attendees': arr,
        'reminders': {
          'useDefault': false,
          'overrides': [
              {'method': 'email', 'minutes': 24 * 60},
              {'method': 'popup', 'minutes': 10},
          ],
        },
      };
      // var auth = oauth2Client;
      var t = {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      }
      const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URL
      );
      oauth2Client.setCredentials(t);
      calendar.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: event,
      }, function(err, event) {
        if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          // return;
          reject(err)
        } else {
          console.log('Event created');
          resolve(event)
        }
      });
    })
  },

  freeBusy: function(tokens, dateMin, dateMax) {
    const calendar = google.calendar('v3');
    var t = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    }
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URL
    );
    // console.log("TTTT: ", t);
    oauth2Client.setCredentials(t);
    return new Promise (function(resolve, reject) {
      // console.log("STARTTT");
      calendar.freebusy.query({
        auth: oauth2Client,
        resource: {
          "timeMin": dateMin,
          "timeMax": dateMax,
          "items": [
            {
              "id": "primary"
            }
          ]
        }
      }, function(err, response) {
        if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          // return;
          reject(err)
        } else {
          // console.log('Find a freebusy');
          resolve(response)
        }
      })
    })
  }
}
