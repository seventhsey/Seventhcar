const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const configuredFrontendOrigin = String(process.env.FRONTEND_URL || "")
  .trim()
  .replace(/\/$/, "");

function isAllowedOrigin(origin) {
  // Requests made server-to-server, curl, health checks, etc. do not send Origin.
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, "");

  if (configuredFrontendOrigin && normalized === configuredFrontendOrigin) {
    return true;
  }

  // Local development can move to another port when 3000 is already occupied.
  if (/^http:\/\/localhost:\d+$/.test(normalized)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(normalized)) return true;

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`Blocked CORS origin: ${origin}`);
    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database!');
});

app.get("/", (req, res) => {
  res.json({
    service: "Seventh Car Hire Backend API",
    status: "online",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "online" });
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

app.get("/cars", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "cars.html"));
});

app.get("/reservations", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "reservations.html"));
});

app.get("/calendar", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "calendar.html"));
});

app.get("/extras", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "extras.html"));
});

app.get("/bookingpage", (req, res) => {
  res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Server error' });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const user = results[0];
    bcrypt.compare(password, user.password, (compareError, isMatch) => {
      if (compareError) {
        res.status(500).json({ success: false, message: 'Server error' });
        return;
      }

      if (isMatch) {
        req.session.userId = user.id;
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    });
  });
});

function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(404).send("Not found");
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const carsRoutes = require("./routes/cars");
const reservationsRoutes = require("./routes/reservations");
const extrasRoutes = require("./routes/extras");
const quotesRoutes = require("./routes/quotes");
const validateReservationPricing = require("./middleware/validateReservationPricing");
const sendReservationEmails = require("./middleware/sendReservationEmails");

app.use("/api/cars", carsRoutes(db, upload));
app.use("/api/quotes", quotesRoutes(db));
app.use(
  "/api/reservations",
  validateReservationPricing(db),
  sendReservationEmails,
  reservationsRoutes(db)
);
app.use("/api/extras", extrasRoutes(db));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
