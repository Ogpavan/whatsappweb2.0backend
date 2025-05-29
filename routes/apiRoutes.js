// routes/index.js
const express = require("express");
const router = express.Router();
const {
  createSession,
  listSessions,
  logoutAndDeleteSession,
//   logoutSession, // Already imported
//   deleteSession  // NEW: Delete session controller
} = require("../controllers/sessionController");

const { sendMessage } = require("../controllers/messageController");

router.get("/", (req, res) => res.send("WhatsApp Web.js API"));
router.post("/create-session", createSession);
router.get("/sessions", listSessions);
router.post("/logout-and-delete", logoutAndDeleteSession);
// router.post("/logout", logoutSession); // Optional: Just disconnects
// router.delete("/delete-session/:sessionId", deleteSession); // 👈 Add this

router.post("/send", sendMessage);

module.exports = router;
