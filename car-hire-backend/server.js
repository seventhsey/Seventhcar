const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const multer = require('multer'); // For file uploads
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
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
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images

// Database connection
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
//------------------------------------------------------------------------ROUTES-------------------------------------------------------
// 1) Home Page (root path)
app.get("/", (req, res) => {
  res.json({
    service: "Seventh Car Hire Backend API",
    status: "online",
  });
});

// 2) Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

// 3) Admin Cars Page
app.get("/cars", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "cars.html"));
});

// 4) Admin Reservations Page
app.get("/reservations", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "reservations.html"));
});

// 5) Admin Availability Calendar
app.get("/calendar", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "calendar.html"));
});

// 6) Admin Extras Page
app.get("/extras", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "extras.html"));
});

// Optional: redirect old backend client booking page to frontend
app.get("/bookingpage", (req, res) => {
  res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
});

//logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

//---------------------------------------------------------------------------------------------------------------------------------------
function formatDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm   = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd   = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  
// Route: Login
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
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
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

// Middleware: Auth Check
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(404).send("Not found");
    }
}



// Multer Configuration
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


//-------------------------------------------------------------CALENDAR ---------------------------------------------------------------------------------------------
app.use("/api/cars", carsRoutes(db, upload));
app.use("/api/reservations", reservationsRoutes(db));
app.use("/api/extras", extrasRoutes(db));


app.get('/api/reservations/test', (req, res) => {
    res.json({success: true, message: "Test route working"});
  });
  

  // Helper: format a MySQL date => "YYYY-MM-DD"



//--------------------------------------------------------------------EXTRAS ------------------------------------------------------------------------------------------------------------


// Start the server
// module.exports = app;

// if (require.main === module) {
//     const port = 3000;
//     app.listen(port, () => {
//       console.log(`Server running on http://localhost:${port}`);
//     });
//   }

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
