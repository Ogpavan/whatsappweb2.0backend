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
const {
  getAllChats,
  getMessages,
} = require("../controllers/sessionController");
const { getContacts } = require("../controllers/contactsController");

router.get("/", (req, res) => res.send("WhatsApp Web.js API"));
router.post("/create-session", createSession);
router.get("/sessions", listSessions);
router.get("/get-all-chats", getAllChats);
router.post("/logout-and-delete", logoutAndDeleteSession);
router.get("/get-messages", getMessages);
router.get("/contacts", getContacts);
// router.post("/logout", logoutSession); // Optional: Just disconnects
// router.delete("/delete-session/:sessionId", deleteSession); // 👈 Add this

router.post("/send", sendMessage);

module.exports = router;
