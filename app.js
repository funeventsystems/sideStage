const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const privateFeedbackFile = 'data/privateFeedback.json';
let privateFeedbackData = loadPrivateFeedback();


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());

// User data and calendar events
let userData = require('./data/users.json');
let calendarData = require('./data/calendar.json');

// Passport configuration
passport.use(new LocalStrategy(
  (username, password, done) => {
    const user = userData.find(u => u.username === username && u.password === password);
    if (!user) return done(null, false, { message: 'Incorrect username or password.' });
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = userData.find(u => u.id === id);
  done(null, user);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login',
  passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/login' })
);

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/calendar', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calendar.html'));
  });

app.get('/events', isAuthenticated, (req, res) => {
    // Display calendar (view-only mode)
    const events = calendarData.filter(event => event.users.includes(req.user.id));
    res.json(events);
  });
  

// Admin routes
app.get('/admin', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/addEvent', isAdmin, (req, res) => {
    const newEvent = {
        id: generateId(),
        users: req.body.users || [],  // Ensure that users is always an array
        title: req.body.title || '',  // Extract title with a default value if not present
        date: req.body.date || '',    // Extract date with a default value if not present
        description: req.body.description || '',  // Extract description with a default value if not present
        color: req.body.color || '',
    };

    calendarData.push(newEvent);
    saveData('calendar.json', calendarData);

    res.json(newEvent);
});
  
  app.get('/users', isAuthenticated, (req, res) => {
    res.json(userData);
});

app.delete('/deleteEvent/:eventId', isAdmin, (req, res) => {
  // Delete event from the calendar
  const eventId = req.params.eventId;
  calendarData = calendarData.filter(event => event.id !== eventId);
  saveData('calendar.json', calendarData);

  res.send('Event deleted successfully');
});

// Helper functions
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.redirect('/');
}

function generateId() {
  return Math.random().toString(36).substring(7);
}

function saveData(filename, data) {
  fs.writeFileSync(`./data/${filename}`, JSON.stringify(data, null, 2));
}
// Endpoint to mark absence for a specific event
app.post('/markAbsence/:eventId', isAuthenticated, (req, res) => {
    const eventId = req.params.eventId;
    const { reason } = req.body;
  
    const event = calendarData.find(event => event.id === eventId);
  
    if (event) {
      // Assuming you have an "absences" property in your event to store absence information
      event.absences = event.absences || [];
      event.absences.push({ userId: req.user.id, reason });
  
      // Save the updated data
      saveData('calendar.json', calendarData);
  
      res.send('Absence marked successfully');
    } else {
      res.status(404).send('Event not found');
    }
  });
  app.get('/eventAbsences/:eventId', isAdmin, (req, res) => {
    const eventId = req.params.eventId;

    // Find the event in calendarData based on eventId
    const event = calendarData.find(event => event.id === eventId);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    // Check if absences property exists and is an array
    if (!Array.isArray(event.absences)) {
        return res.status(400).json({ error: 'Invalid absences data for the event' });
    }

    // Return absences for the specified event
    res.json(event.absences);
});


app.post('/submitFeedback', (req, res) => {
    const feedbackData = req.body;

    // Add the feedback to the storage
    privateFeedbackData.push(feedbackData);

    // Save the updated feedback data to the JSON file
    savePrivateFeedback(privateFeedbackData);

    res.json({ success: true });
});

app.get('/feedback', isAuthenticated, (req, res) => {
    const userId = req.user.id;

    // Retrieve feedback for the authenticated user
    const userFeedback = privateFeedbackData.filter(feedback => feedback.userId === userId);

    res.json(userFeedback);
});



// Helper function to load private feedback data from the JSON file
function loadPrivateFeedback() {
    try {
        const data = fs.readFileSync(privateFeedbackFile);
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist or there's an error reading it, return an empty array
        return [];
    }
}

// Helper function to save private feedback data to the JSON file
function savePrivateFeedback(data) {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(privateFeedbackFile, jsonData);
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
