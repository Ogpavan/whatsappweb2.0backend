const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const {
  createClient,
  getClient,
  removeClient,
  getAllClients,
} = require("../config/clientManager");
const { getSessionSockets } = require("../wsManager"); // <-- Correct import
const db = require("../firebase");

const createSession = async (req, res) => {
  const sessionId = req.body?.sessionId || require("uuid").v4();
  const userId = req.body?.userId; // <-- get userId from request

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (getClient(sessionId)) {
    return res.status(400).json({ error: "Session already exists" });
  }

  const client = createClient(sessionId);
  client.userId = userId; // <-- associate userId with client
  let responded = false;

  client.on("qr", async (qr) => {
    const qrImage = await qrcode.toDataURL(qr);
    if (!responded) {
      res.status(200).json({ sessionId, qr: qrImage });
      responded = true;
    }
  });

  client.on("ready", async () => {
    const info = await client.info;
    client.phoneNumber = info.wid.user;
    client.pushname = info.pushname;
    console.log(`Client ${sessionId} is ready`);

    // 📥 Listen for incoming messages
    client.on("message", async (msg) => {
      const from = msg.from;
      const body = msg.body;
      const type = msg.type;
      const timestamp = msg.timestamp;

      // Save to Firestore
      try {
        await db
          .collection("users")
          .doc(client.userId)
          .collection("sessions")
          .doc(sessionId)
          .collection("messages")
          .add({
            from,
            body,
            type,
            timestamp,
            sessionId,
          });
      } catch (e) {
        console.error("Firestore save error:", e);
      }

      console.log(`[${sessionId}] From: ${from}, Msg: ${body}`);

      // WebSocket: send to connected client if exists
      const sessionSockets = getSessionSockets();
      const ws = sessionSockets[sessionId];
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ from, body, type, timestamp }));
      }

      // TODO: Store to DB if needed
    });
  });

  client.on("authenticated", () => {
    console.log(`Client ${sessionId} authenticated`);
  });

  client.on("auth_failure", (msg) => {
    console.error(`Auth failure for ${sessionId}:`, msg);
    if (!responded) {
      res.status(401).json({ error: "Authentication failed" });
      responded = true;
    }
  });

  client.on("disconnected", (reason) => {
    console.log(`Client ${sessionId} disconnected:`, reason);
    client.destroy();
    removeClient(sessionId);
  });

  try {
    await client.initialize();
  } catch (err) {
    console.error("Init Error:", err);
    if (!responded) {
      res.status(500).json({ error: "Failed to initialize session" });
    }
  }
};

const listSessions = (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const sessions = Object.entries(getAllClients())
    .filter(([_, client]) => client.userId === userId)
    .map(([sessionId, client]) => ({
      sessionId,
      phoneNumber: client.phoneNumber || sessionId,
      pushname: client.pushname || "Unknown",
    }));

  res.json({ sessions });
};

const getAllChats = async (req, res) => {
  const { sessionId } = req.query;
  const client = getClient(sessionId);
  if (!client) {
    return res.status(404).json({ error: "Session not found" });
  }
  try {
    const chats = await client.getChats();
    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      name: chat.name || chat.formattedTitle || chat.id.user,
      profilePic: chat.profilePicUrl || null, // Ensure profilePicUrl is returned
      lastMessage: chat.lastMessage || null,
    }));
    // console.log("formattedChats:", formattedChats);
    res.json({ chats: formattedChats });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};
// module.exports.getAllChats = getAllChats;

const logoutAndDeleteSession = async (req, res) => {
  const sessionId = req.body.sessionId || req.params.sessionId;
  const client = getClient(sessionId);

  if (!client) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }

  try {
    // Logout and destroy session
    await client.logout();
    await client.destroy();

    // Remove from memory
    removeClient(sessionId);

    // Remove session folder
    const sessionPath = path.join(
      __dirname,
      `../sessions/session-${sessionId}`
    );
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    return res.json({
      success: true,
      message: "Session logged out and deleted successfully",
    });
  } catch (error) {
    console.error("Error during logout and deletion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout and delete session",
      error: error.message,
    });
  }
};
// const logoutSession = async (req, res) => {
//   const { sessionId } = req.body;
//   const client = getClient(sessionId);

//   if (!client) return res.status(404).json({ error: "Session not found" });

//   try {
//     await client.logout();
//     await client.destroy();
//     removeClient(sessionId);
//     res.json({ success: true, message: "Logged out and session removed" });
//   } catch (error) {
//     console.error("Logout error:", error);
//     res.status(500).json({ error: "Failed to logout" });
//   }
// };

// const deleteSession = async (req, res) => {
//   const { sessionId } = req.params;
//   const client = getClient(sessionId);

//   if (!client) {
//     return res.status(404).json({ success: false, message: "Session not found" });
//   }

//   try {
//     // First logout the client session
//     await client.logout();

//     // Then destroy the client session
//     await client.destroy();

//     // Remove the client from memory
//     removeClient(sessionId);

//     // Path to your saved session files
//     const sessionPath = path.join(__dirname, `../sessions/session-${sessionId}`);
//     if (fs.existsSync(sessionPath)) {
//       fs.rmSync(sessionPath, { recursive: true, force: true });
//     }

//     return res.json({ success: true, message: "Session logged out and deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting session:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to logout and delete session",
//       error: error.message,
//     });
//   }
// };

const getMessages = async (req, res) => {
  const { sessionId, chatId, limit = 50 } = req.query;
  const client = getClient(sessionId);

  if (!client) {
    return res.status(404).json({ error: "Session not found" });
  }

  try {
    const chat = await client.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const messages = await chat.fetchMessages({ limit: parseInt(limit, 10) });
    const formattedMessages = messages.map((msg) => ({
      id: msg.id._serialized,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      type: msg.type,
      timestamp: msg.timestamp,
    }));

    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

module.exports = {
  createSession,
  listSessions,
  logoutAndDeleteSession,
  getAllChats,
  getMessages,
  // logoutSession,
  // deleteSession, // 👈 Export it here
};
