const express = require("express");
const { ObjectId } = require("mongodb");
const verifyToken = require("./server");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { sendCRUDNotification } = require("./mail");

// Input validation function
function validateInput(fields) {
  return fields.some(
    (field) =>
      field === undefined ||
      field === null ||
      (typeof field === "string" && field.trim() === "")
  );
}

// Middleware
router.use(express.json());

// CreateApplication
router.post("/applications", verifyToken, async (req, res) => {
  const { username, role } = req.user;

  // Check if user is not admin
  if (role !== "admin" && role !== "user") {
    return res
      .status(403)
      .json({ message: "Forbidden, admin access required" });
  }

  const { name, description, version, genre, visibility } = req.body;

  if (validateInput([name, description, version, genre, visibility])) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const release_date = new Date();
    const owner_id = req.user.userId;
    const result = await req.db.collection("Applications").insertOne({
      name,
      description,
      release_date,
      version,
      ratings: [],
      genre,
      owner_id: new ObjectId(owner_id),
      visibility,
    });
    const recipients = [
      "181801130005@cutmap.ac.in",
      "redhat2121@protonmail.com",
    ];
    const additionalMessage = "Please check the new App";
    await sendCRUDNotification(
      recipients,
      "create",
      name,
      "app",
      additionalMessage
    );
    res.status(201).json({
      message: "Application created successfully",
      applicationId: result.insertedId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating application", error: error.message });
  }
});

// Read All Applications
router.get("/applications", async (req, res) => {
  try {
    const applications = await req.db
      .collection("Applications")
      .find({})
      .toArray();
    res.json(applications);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving applications", error: error.message });
  }
});

// Read Application by ID
router.get("/applications/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const application = await req.db
      .collection("Applications")
      .findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving application", error: error.message });
  }
});

// Update Application by ID
router.put("/applications/:id", verifyToken, async (req, res) => {
  const { username, role } = req.user;

  // Check if user is admin or the owner of the application
  if (role !== "admin" && role !== "user") {
    return res
      .status(403)
      .json({ message: "Forbidden, admin access required" });
  }
  const { id } = req.params;
  const { name, description, version, genre, visibility } = req.body;
  if (validateInput([name, description, version, genre, visibility])) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const release_date = new Date();
    const owner_id = req.user.userId;
    const result = await req.db.collection("Applications").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description,
          release_date,
          version,
          genre,
          owner_id: new ObjectId(owner_id),
          visibility,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Application not found" });
    }
    const recipients = [
      "181801130005@cutmap.ac.in",
      "redhat2121@protonmail.com",
    ];
    const additionalMessage = "Look into updated app";
    await sendCRUDNotification(
      recipients,
      "update",
      name,
      "app",
      additionalMessage
    );
    res.json({ message: "Application updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating application", error: error.message });
  }
});

// Delete Application by ID
router.delete("/applications/:id", verifyToken, async (req, res) => {
  const { username, role } = req.user;

  if (role !== "admin" && role !== "user") {
    return res
      .status(403)
      .json({ message: "Forbidden, admin access required" });
  }
  const { id } = req.params;

  try {
    const application = await req.db
      .collection("Applications")
      .findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const result = await req.db
      .collection("Applications")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    const recipients = [
      "181801130005@cutmap.ac.in",
      "redhat2121@protonmail.com",
    ];
    await sendCRUDNotification(recipients, "delete", application.name, "app");
    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting application", error: error.message });
  }
});

// Create Comment and Rating
router.post("/applications/:id/comments", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { comment, rating } = req.body;
  const userId = req.user.userId;
  const commentUUID = uuidv4();

  try {
    await req.db.collection("Applications").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          ratings: {
            user_id: new ObjectId(userId),
            comment,
            rating,
            uuid: commentUUID,
          },
        },
      }
    );

    res.status(201).json({ message: "Comment and rating added successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error adding comment and rating",
      error: error.message,
    });
  }
});

// Get Comments and Ratings for an Application
router.get("/applications/:id/comments", async (req, res) => {
  const { id } = req.params;

  try {
    const application = await req.db
      .collection("Applications")
      .findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application.ratings);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving comments and ratings",
      error: error.message,
    });
  }
});

// Delete Comment by UUID
router.delete(
  "/applications/:appId/comments/:commentUUID",
  verifyToken,
  async (req, res) => {
    const { appId, commentUUID } = req.params;
    const userId = req.user.userId;
    try {
      // Find the application
      const application = await req.db
        .collection("Applications")
        .findOne({ _id: new ObjectId(appId) });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Find the index of the comment to delete
      const commentIndex = application.ratings.findIndex(
        (rating) =>
          rating.user_id.toString() === userId && rating.uuid === commentUUID
      );

      if (commentIndex === -1) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Delete the comment
      application.ratings.splice(commentIndex, 1);

      await req.db
        .collection("Applications")
        .updateOne(
          { _id: new ObjectId(appId) },
          { $set: { ratings: application.ratings } }
        );

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting comment", error: error.message });
    }
  }
);

module.exports = router;