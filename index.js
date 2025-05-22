const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const cors = require("cors");
const app = express();
const port = 5000;
const { v4: uuidv4 } = require("uuid");

app.use(cors());
app.use(express.json());

const clients = {};

app.get("/", (req, res) => {
  res.send("WhatsApp Web.js API");
});
// Create session endpoint
app.post("/create-session", async (req, res) => {
  let { sessionId } = req.body;

  // Generate UUID if no sessionId is provided
  if (!sessionId) {
    sessionId = uuidv4();
  }

  // Prevent duplicate session
  if (clients[sessionId]) {
    return res.status(400).json({ error: "Session already exists" });
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: "./sessions", // Ensure this path exists
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  let responded = false;

  client.on("qr", async (qr) => {
    try {
      const qrImage = await qrcode.toDataURL(qr);
      if (!responded) {
        res.status(200).json({ sessionId, qr: qrImage });
        responded = true;

      }
    } catch (error) {
      console.error("QR Error:", error);
    }
  });

  client.on("ready",async () => {
    console.log(`Client ${sessionId} is ready`);
    const info = await client.info;
  // Save phone number on client instance for later retrieval
  clients[sessionId].phoneNumber = info.wid.user; // e.g., '1234567890'
  clients[sessionId].pushname = info.pushname;
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
    delete clients[sessionId];
  });

  try {
    await client.initialize();
    clients[sessionId] = client;
  } catch (err) {
    console.error("Init Error:", err);
    if (!responded) {
      res.status(500).json({ error: "Failed to initialize session" });
    }
  }
});

// Send message endpoint
app.post("/send-message", async (req, res) => {
  const { sessionId, number, message } = req.body;

  const client = clients[sessionId];
  if (!client) {
    return res.status(404).json({ error: "Session not found" });
  }

  try {
    const numberWithSuffix = number.includes("@c.us")
      ? number
      : `${number}@c.us`;

    await client.sendMessage(numberWithSuffix, message);
    res.json({ success: true, message: "Message sent!" });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// List active sessions
app.get("/sessions", (req, res) => {
  const sessions = Object.entries(clients).map(([sessionId, client]) => ({
    sessionId,
    phoneNumber: client.phoneNumber || sessionId,
    pushname: client.pushname || "Unknown",
  }));

  res.json({ sessions });
});


// Logout session
app.post("/logout", async (req, res) => {
  const { sessionId } = req.body;

  const client = clients[sessionId];
  if (!client) {
    return res.status(404).json({ error: "Session not found" });
  }

  try {
    await client.logout();
    await client.destroy();
    delete clients[sessionId];
    res.json({ success: true, message: "Logged out and session removed" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
