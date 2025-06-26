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

router.get("/", (req, res) => res.send("WhatsApp Web.js API 2.0"));
router.post("/create-session", createSession);
router.get("/sessions", listSessions);
router.get("/get-all-chats", getAllChats);
router.post("/logout-and-delete", logoutAndDeleteSession);
router.get("/get-messages", getMessages);
router.get("/contacts", getContacts);
// router.post("/logout", logoutSession); // Optional: Just disconnects
// router.delete("/delete-session/:sessionId", deleteSession); // 👈 Add this

router.post("/send", sendMessage);

router.get("/contact/:number", async (req, res) => {
  const { number } = req.params;
  const sessionId = req.query.sessionId; // Pass sessionId if needed for multi-user

  // Get your WhatsApp client (adjust as per your client/session management)
  const { getClient } = require("../config/clientManager");
  const client = getClient(sessionId || "default-session-id");
  if (!client) return res.status(404).json({ error: "Session not found" });

  const numberWithSuffix = number.includes("@c.us") ? number : `${number}@c.us`;

  try {
    const contact = await client.getContactById(numberWithSuffix);
    let profilePic = null;
    try {
      profilePic = await contact.getProfilePicUrl();
    } catch {
      profilePic = null;
    }
    res.json({
      name: contact.pushname || contact.name || numberWithSuffix,
      profilePic: profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(numberWithSuffix)}`,
    });
  } catch (e) {
    res.json({
      name: numberWithSuffix,
      profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(numberWithSuffix)}`,
    });
  }
});

module.exports = router;
