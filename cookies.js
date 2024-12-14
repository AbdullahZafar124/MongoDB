const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(
  session({
    secret: 'your-secret-key', // Replace with a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }, // Session cookie valid for 1 minute
  })
);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/crudApp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Schema and model for User
const userSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: String,
    gender: String,
});

const User = mongoose.model('User', userSchema);

// Middleware to check session (protect routes)
const checkSession = (req, res, next) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  next();
};

// Routes

// Render login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login action
app.post('/login', (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.username = username; // Store username in session
    res.redirect('/');
  } else {
    res.status(400).send('Username is required.');
  }
});

// Handle logout action
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out.");
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.redirect('/login');
  });
});

// Get all users (protected route)
app.get('/', checkSession, async (req, res) => {
  try {
    const users = await User.find();
    res.render('index', { users, username: req.session.username });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Render form to create a new user (protected route)
app.get('/create', checkSession, (req, res) => {
  res.render('create', { username: req.session.username });
});

// Handle form submission to create a new user (protected route)
app.post('/create', checkSession, async (req, res) => {
  try {
    const { first_name, last_name, email, gender } = req.body;
    await User.create({ first_name, last_name, email, gender });
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Render form to edit a user (protected route)
app.get('/edit/:id', checkSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render('edit', { user, username: req.session.username });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Handle form submission to update a user (protected route)
app.post('/edit/:id', checkSession, async (req, res) => {
  try {
    const { first_name, last_name, email, gender } = req.body;
    await User.findByIdAndUpdate(req.params.id, { first_name, last_name, email, gender });
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Handle user deletion (protected route)
app.post('/delete/:id', checkSession, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
