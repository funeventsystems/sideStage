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
const mediaPath = path.join(__dirname, 'data', 'media');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());

// User data and calendar events
let userData = require('./data/users.json');
let calendarData = require('./data/calendar.json');

app.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/') {
    // Skip authentication for login and landing
    return next();
  }

  // For other routes, check authentication
  isAuthenticated(req, res, next);
});

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
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
});


app.get('/login', (req, res) => {
  // Check if the user is already authenticated
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }

  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login',
  passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/login' })
);
app.get('/logout', (req, res) => {
  // Passport provides a logout() function to clear the login session
  req.logout(err => {
    if (err) {
      console.error(err);
    }
    // Redirect the user to the login page after logout
    res.redirect('/login');
  });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/audition', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'audition.html'));
});

app.get('/calendar', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calendar.html'));
  });
  app.get('/notes', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notes.html'));
  });
  app.get('/drive', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'drive.html'));
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
app.get('/verifytickets', isAdmin || isFrontOfHouse, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verifytickets.html'));
});
app.get('/ticketsetup', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ticketsetup.html'));
});
app.get('/soundStage', isAdmin || isTechCrew, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'soundStage.html'));
});
app.get('/videoStage', isAdmin || isTechCrew, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'videoStage.html'));
});
app.get('/lightStage', isAdmin || isTechCrew, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lightStage.html'));
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
// Update Event endpoint
app.put('/updateEvent/:eventId', isAdmin, (req, res) => {
  const eventId = req.params.eventId;

  // Find the index of the event in calendarData based on eventId
  const eventIndex = calendarData.findIndex(event => event.id === eventId);

  if (eventIndex !== -1) {
      // Update event properties with the provided values (if present)
      calendarData[eventIndex].title = req.body.title || calendarData[eventIndex].title;
      calendarData[eventIndex].date = req.body.date || calendarData[eventIndex].date;
      calendarData[eventIndex].description = req.body.description || calendarData[eventIndex].description;
      calendarData[eventIndex].color = req.body.color || calendarData[eventIndex].color;

      // Add or remove users based on the updateUsers array
      if (req.body.updateUsers && Array.isArray(req.body.updateUsers)) {
          req.body.updateUsers.forEach(userId => {
              if (!calendarData[eventIndex].users.includes(userId)) {
                  // Add the user to the event
                  calendarData[eventIndex].users.push(userId);
              }
          });

          // Remove users not in the updateUsers array
          calendarData[eventIndex].users = calendarData[eventIndex].users.filter(userId =>
              req.body.updateUsers.includes(userId)
          );
      }

      // Save the updated data
      saveData('calendar.json', calendarData);

      res.json(calendarData[eventIndex]);
  } else {
      res.status(404).json({ error: 'Event not found' });
  }
});


app.get('/geteventdetails/:eventId', isAuthenticated, (req, res) => {
  const eventId = req.params.eventId;

  // Find the event in calendarData based on eventId
  const event = calendarData.find(event => event.id === eventId);

  if (event) {
      res.json(event);
  } else {
      res.status(404).json({ error: 'Event not found' });
  }
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

function isTechCrew(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'tech') return next();
  res.redirect('/');
}
function isFrontOfHouse(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'frontofhouse') return next();
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
// Private notebook data
const privateNotebookFile = 'data/privateNotebooks.json';
let privateNotebookData = loadPrivateNotebooks();

// ...

app.post('/createNotebook', isAuthenticated, (req, res) => {
  const newNotebook = {
    id: generateId(),
    userId: req.user.id,
    title: req.body.title || 'Untitled Notebook',
    content: req.body.content || '',
    link: req.body.link || ''  // Add the link field
  };

  privateNotebookData.push(newNotebook);
  savePrivateNotebooks(privateNotebookData);

  res.json(newNotebook);
});

// Endpoint to get all private notebooks of the authenticated user
app.get('/notebooks', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const userNotebooks = privateNotebookData.filter(notebook => notebook.userId === userId);

  res.json(userNotebooks);
});

// Endpoint to get a specific private notebook
app.get('/notebook/:notebookId', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const notebookId = req.params.notebookId;

  const userNotebook = privateNotebookData.find(notebook => notebook.id === notebookId && notebook.userId === userId);

  if (userNotebook) {
    res.json(userNotebook);
  } else {
    res.status(404).json({ error: 'Notebook not found' });
  }
});

// Endpoint to update a private notebook
app.put('/notebook/:notebookId', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const notebookId = req.params.notebookId;

  const userNotebookIndex = privateNotebookData.findIndex(notebook => notebook.id === notebookId && notebook.userId === userId);

  if (userNotebookIndex !== -1) {
    privateNotebookData[userNotebookIndex].title = req.body.title || privateNotebookData[userNotebookIndex].title;
    privateNotebookData[userNotebookIndex].content = req.body.content || privateNotebookData[userNotebookIndex].content;

    savePrivateNotebooks(privateNotebookData);

    res.json(privateNotebookData[userNotebookIndex]);
  } else {
    res.status(404).json({ error: 'Notebook not found' });
  }
});

// Endpoint to delete a private notebook
app.delete('/notebook/:notebookId', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const notebookId = req.params.notebookId;

  const userNotebookIndex = privateNotebookData.findIndex(notebook => notebook.id === notebookId && notebook.userId === userId);

  if (userNotebookIndex !== -1) {
    const deletedNotebook = privateNotebookData.splice(userNotebookIndex, 1)[0];
    savePrivateNotebooks(privateNotebookData);

    res.json(deletedNotebook);
  } else {
    res.status(404).json({ error: 'Notebook not found' });
  }
});

// Helper function to load private notebook data from the JSON file
function loadPrivateNotebooks() {
  try {
    const data = fs.readFileSync(privateNotebookFile);
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist or there's an error reading it, return an empty array
    return [];
  }
}

// Helper function to save private notebook data to the JSON file
function savePrivateNotebooks(data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync(privateNotebookFile, jsonData);
}



app.post('/register', (req, res) => {
  const { username, password, role } = req.body;

  // Check if the username is already taken
  if (userData.some(user => user.username === username)) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  // Generate a new user ID
  const newUserId = generateId();

  // Create a new user object
  const newUser = {
    id: newUserId,
    username,
    password,
    role // You can set the default role for new users
  };

  // Add the new user to the userData array
  userData.push(newUser);

  // Save the updated user data to the JSON file
  saveData('users.json', userData);

  // Redirect to the login page after successful registration
  res.status(200).json({ message: 'Success' });
});
app.get('/files', (req, res) => {
  const directoryPath = path.join(__dirname, 'data', 'media');

  // Recursively read files in the directory and its subdirectories
  function readFiles(dir) {
    const filesList = [];

    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Recursively read files in subdirectories
        filesList.push(...readFiles(filePath));
      } else {
        filesList.push({
          name: file,
          path: filePath.replace(mediaPath, ''), // Store relative path
          size: stats.size,
          isDirectory: false,
          mimeType: getMimeType(filePath),
        });
      }
    });

    return filesList;
  }

  // Get the list of files
  const filesData = readFiles(mediaPath);

  // Send the list of files as a JSON response
  res.json({ files: filesData });
});
app.get('/files/:filePath', (req, res) => {
  const filePathParam = req.params.filePath;
  const filePath = path.join(mediaPath, filePathParam);

  // Check if the file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      return res.status(404).send('File not found');
    }

    // Check for Range header in the request
    const range = req.headers.range;

    if (range) {
      // If Range header is present, respond with partial content (206)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': getMimeType(filePath),
      });

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      // If no Range header, respond with entire content (200)
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': getMimeType(filePath),
      });

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  });
});

// Helper function to determine MIME type based on file extension
function getMimeType(filePath) {
  const extname = path.extname(filePath).toLowerCase();
  switch (extname) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
      return 'video/ogg';
    // Add more cases as needed
    default:
      return 'application/octet-stream';
  }
}



const auditionProfilesFile = 'data/auditionProfiles.json';
let auditionProfilesData = loadAuditionProfiles();

function loadAuditionProfiles() {
  try {
    const data = fs.readFileSync(auditionProfilesFile);
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist or there's an error reading it, return an empty array
    return [];
  }
}

// Helper function to save audition profiles data to the JSON file
function saveAuditionProfiles(data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync(auditionProfilesFile, jsonData);
}

// Endpoint to get auditions
app.get('/getAuditions', isAdmin, (req, res) => {
  res.json(auditionProfilesData);
});

// Endpoint to create audition profile
app.post('/createAuditionProfile', isAdmin, (req, res) => {
  const { name, taGrade, roles } = req.body;

  if (!name || !taGrade || !roles || !Array.isArray(roles)) {
    return res.status(400).json({ error: 'Invalid data provided for creating audition profile' });
  }

  const newAuditionProfile = {
    id: generateId(),
    name,
    taGrade,
    roles,
    scores: [],
  };

  auditionProfilesData.push(newAuditionProfile);
  saveAuditionProfiles(auditionProfilesData);

  res.json({ auditionID: newAuditionProfile.id });
});

// Endpoint to submit score for an audition profile
app.post('/submitScore', isAdmin, (req, res) => {
  const { id, score } = req.body;

  if (!id || !score) {
    return res.status(400).json({ error: 'Invalid data provided for submitting score' });
  }

  const auditionProfile = auditionProfilesData.find(profile => profile.id === id);

  if (!auditionProfile) {
    return res.status(404).json({ error: 'Audition profile not found' });
  }

  auditionProfile.scores.push(score);
  saveAuditionProfiles(auditionProfilesData);

  res.json({ success: true });
});

// Endpoint to get details of a specific audition profile
app.get('/getAuditionDetails/:id', isAdmin, (req, res) => {
  const auditionID = req.params.id;

  const auditionProfile = auditionProfilesData.find(profile => profile.id === auditionID);

  if (!auditionProfile) {
    return res.status(404).json({ error: 'Audition profile not found' });
  }

  res.json(auditionProfile);
});

// Function to calculate average score
function calculateAverageScore(scores) {
  if (!scores || scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((total, score) => total + score, 0);
  const average = sum / scores.length;

  return average;
}

// Endpoint to get average score for a specific audition profile
app.get('/getAverageScore/:id', isAdmin, (req, res) => {
  const auditionID = req.params.id;

  const auditionProfile = auditionProfilesData.find(profile => profile.id === auditionID);

  if (!auditionProfile) {
    return res.status(404).json({ error: 'Audition profile not found' });
  }

  const averageScore = calculateAverageScore(auditionProfile.scores);

  res.json({ averageScore });
});


let classData = loadClassData();

// ...

// Endpoint to view classes
app.get('/classes', isAuthenticated, (req, res) => {
  res.json(classData);
});

// Endpoint to mark a class as complete
app.post('/markComplete/:classId', isAuthenticated, (req, res) => {
  const classId = req.params.classId;

  const classIndex = classData.findIndex((c) => c.id === classId);

  if (classIndex !== -1) {
    // Mark the class as complete for the authenticated user
    const userId = req.session.passport.user; // Extract user ID from the session
    if (!classData[classIndex].completedBy.includes(userId)) {
      classData[classIndex].completedBy.push(userId);
    }

    // Save the updated data
    saveClassData();

    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Class not found' });
  }
});

// Admin endpoint to view class completions
app.get('/admin/classes/:classId/completions', isAdmin, (req, res) => {
  const classId = req.params.classId;

  const classIndex = classData.findIndex((c) => c.id === classId);

  if (classIndex !== -1) {
    // Get the list of users who completed the class
    const completedUsers = classData[classIndex].completedBy.map((userId) => {
      const user = userData.find((u) => u.id === userId);
      return { id: user.id, username: user.username };
    });

    res.json(completedUsers);
  } else {
    res.status(404).json({ error: 'Class not found' });
  }
});

// Admin endpoint to create a new class
app.post('/admin/classes', isAdmin, (req, res) => {
  const { title, videoUrl } = req.body;

  if (!title || !videoUrl) {
    return res.status(400).json({ error: 'Invalid data provided for creating a class' });
  }

  const newClass = {
    id: generateId(),
    title,
    videoUrl,
    completedBy: [],
  };

  classData.push(newClass);
  saveClassData();

  res.json({ classId: newClass.id });
});

// ...

// Helper function to save class data to a JSON file
function saveClassData() {
  saveData('classes.json', classData);
}

// Helper function to load class data from the JSON file
function loadClassData() {
  try {
    const data = fs.readFileSync('data/classes.json');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist or there's an error reading it, return an empty array
    return [];
  }
}

app.get('/user/classes', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-classes.html'));
});

// Admin route to manage classes (Admin-side)
app.get('/admin/classes', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-classes.html'));
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
