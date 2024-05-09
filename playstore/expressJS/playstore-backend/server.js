const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");
const session = require("express-session");
require("dotenv").config();
const { sendCRUDNotification } = require("./mail");
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
const FRONT_END_URL = process.env.FRONT_END_URL;
const JWT_SECRET = process.env.JWT_SECRET;



// Secrets Management
if (!JWT_SECRET || !ADMIN_SECRET_KEY || !FRONT_END_URL || !MONGO_URI) {
  console.error("Error: Missing environment variables");
  process.exit(1);
}

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true, // Ensure cookies are only sent over HTTPS
      httpOnly: true, // Prevent client-side JavaScript injection
      sameSite: "strict", // Mitigate (CSRF) attacks
    },
  })
);

// Middleware
app.use(helmet());
app.use(cors({ origin: FRONT_END_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let server;
// MongoDB Connection
let db;

MongoClient.connect(MONGO_URI)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db();
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    const applicationsRouter = require("./applications");
    app.use("/api", applicationsRouter);
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  });

// Input Validation Middleware
app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});

// Token Expiration Middleware
const checkTokenExpiration = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const currentTime = Date.now() / 1000;
    if (decoded.exp <= currentTime) {
      return res.status(401).json({ message: "Token expired" });
    }

    req.user = decoded;
    next();
  });
};

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("An error occurred:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Shutdown (Signal Interrupt)
process.on("SIGINT", async () => {
  console.log("Received SIGINT signals. Closing servers gracefully...");
  if (db) {
    await db.client.close();
  }
  if (server) {
    server.close(() => {
      console.log("Server and database connections are closed.");
      process.exit(0);
    });
  } else {
    console.log("Server is not running.");
    process.exit(0);
  }
});

const saltRounds = 10;
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

// Route to check if a username exists
app.get("/check-username", async (req, res) => {
  const { username } = req.query;

  try {
    const existingUser = await db.collection("Users").findOne({ username });
    res.status(200).json;
    res.json({ exists: !!existingUser });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auth/Register Endpoint
app.post(
  "/auth/register",
  body("username")
    .isLength({ min: 5 })
    .withMessage("Username must be at least 5 characters long"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("role")
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin' only"),
  async (req, res) => {
    const { username, password, email, role, secretKey } = req.body;

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "admin" && secretKey !== ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hashedPassword = await hashPassword(password);

    try {
      const userExists = await db.collection("Users").findOne({ username });
      if (userExists) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const result = await db.collection("Users").insertOne({
        username,
        password: hashedPassword,
        email,
        role,
      });

      const userId = result.insertedId;

      const token = jwt.sign({ userId, username, role }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(201).json({
        message: `${
          role.charAt(0).toUpperCase() + role.slice(1)
        } registered successfully`,
        token,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: `Error registering ${role}`, error: error.message });
    }
  }
);

// Auth/Login Endpoint
app.post(
  "/auth/login", // Input validation using express-validator
  body("username")
    .isLength({ min: 5 })
    .withMessage("Username must be at least 5 characters long"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  async (req, res) => {
    const { username, password, role, secretKey } = req.body;

    try {
      const user = await db.collection("Users").findOne({ username });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (await bcrypt.compare(password, user.password)) {
        if (user.role === "admin") {
          if (!secretKey || secretKey !== ADMIN_SECRET_KEY) {
            return res.status(401).json({ message: "Invalid secret key" });
          }
        }

        const token = jwt.sign(
          { userId: user._id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: "1h" }
        );

        res.json({
          message: `${
            user.role.charAt(0).toUpperCase() + user.role.slice(1)
          } login successful`,
          token,
          userId: user._id,
          username: user.username,
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error logging in", error: error.message });
    }
  }
);

// Logout Endpoint
app.post("/auth/logout", checkTokenExpiration, verifyToken, (req, res) => {
  res.json({ message: "Logout successful" });
});

// -----------------------------------------------------------CRUD-----------------------------------//
// Retrieve All Users as Admin only
app.get("/admin/users", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const users = await db.collection("Users").find({}).toArray();
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
});

// Create User by Admin
app.post(
  "/admin/users",
  checkTokenExpiration,
  verifyToken,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { username, password, email, role } = req.body;
    const hashedPassword = await hashPassword(password);

    if (!username || !password || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      const result = await db.collection("Users").insertOne({
        username,
        password: hashedPassword,
        email,
        role,
      });
      // Send notification for user creation
      const recipients = ["redhat2121@protonmail.com"];
      await sendCRUDNotification(recipients, "create", username, "user");

      res.status(201).json({
        message: "User added successfully",
        userId: result.insertedId,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error adding user", error: error.message });
    }
  }
);

// Update User by _id as Admin only
app.put(
  "/admin/users/:id",
  checkTokenExpiration,
  verifyToken,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    let { username, password, email, role } = req.body;

    if (password) {
      password = await hashPassword(password);
    }

    try {
      const result = await db
        .collection("Users")
        .updateOne(
          { _id: new ObjectId(id) },
          { $set: { username, password, email, role } }
        );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      // Send notification for user creation
      const recipients = ["redhat2121@protonmail.com"];
      await sendCRUDNotification(recipients, "update", username, "user");
      res.json({ message: "User updated successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating user", error: error.message });
    }
  }
);

// Delete User by _id as Admin only
app.delete(
  "/admin/users/:id",
  checkTokenExpiration,
  verifyToken,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    try {
      // Fetch the user details
      const user = await db
        .collection("Users")
        .findOne({ _id: new ObjectId(id) });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const result = await db
        .collection("Users")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send notification with the username
      const recipients = ["redhat2121@protonmail.com"];
      await sendCRUDNotification(recipients, "delete", user.username, "user");

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting user", error: error.message });
    }
  }
);

server = app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

module.exports = verifyToken;