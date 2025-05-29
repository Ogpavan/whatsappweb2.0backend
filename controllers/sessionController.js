const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const {
  createClient,
  getClient,
  removeClient,
  getAllClients,
} = require("../config/clientManager");

const createSession = async (req, res) => {
  const sessionId = req.body?.sessionId || require("uuid").v4();

  if (getClient(sessionId)) {
    return res.status(400).json({ error: "Session already exists" });
  }

  const client = createClient(sessionId);
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

    console.log(`[${sessionId}] From: ${from}, Msg: ${body}`);

    // TODO: Store to DB or emit via WebSocket
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
  const sessions = Object.entries(getAllClients()).map(
    ([sessionId, client]) => ({
      sessionId,
      phoneNumber: client.phoneNumber || sessionId,
      pushname: client.pushname || "Unknown",
    })
  );
  res.json({ sessions });
};



const logoutAndDeleteSession = async (req, res) => {
  const sessionId = req.body.sessionId || req.params.sessionId;
  const client = getClient(sessionId);

  if (!client) {
    return res.status(404).json({ success: false, message: "Session not found" });
  }

  try {
    // Logout and destroy session
    await client.logout();
    await client.destroy();

    // Remove from memory
    removeClient(sessionId);

    // Remove session folder
    const sessionPath = path.join(__dirname, `../sessions/session-${sessionId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    return res.json({ success: true, message: "Session logged out and deleted successfully" });
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


module.exports = {
  createSession,
  listSessions,
  logoutAndDeleteSession,
  // logoutSession,
  // deleteSession, // 👈 Export it here
};
