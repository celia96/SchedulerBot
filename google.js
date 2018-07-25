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
  generateAuthUrl: function() {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
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

  insertEvent: function(tokens, title, date) {
    console.log("insert event");
    return new Promise (function(resolve, reject) {
      var event = {
        'summary': title,
        'location': '800 Howard St., San Francisco, CA 94103',
        'description': 'A chance to hear more about Google\'s developer products.',
        'start': {
          'dateTime': '2018-08-28T09:00:00-07:00',
          'timeZone': 'America/Los_Angeles',
        },
        'end': {
          'dateTime': '2018-08-28T17:00:00-07:00',
          'timeZone': 'America/Los_Angeles',
        },
        'recurrence': [
          'RRULE:FREQ=DAILY;COUNT=2'
        ],
        'attendees': [
          {'email': 'lpage@example.com'},
          {'email': 'sbrin@example.com'},
        ],
        'reminders': {
          'useDefault': false,
          'overrides': [
              {'method': 'email', 'minutes': 24 * 60},
              {'method': 'popup', 'minutes': 10},
          ],
        },
      };
      var auth = oauth2Client;
      oAuth2Client.setCredentials(tokens);
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
          console.log('Event created: %s', event.htmlLink);
          resolve(event)
        }
      });
    })
  }
}
