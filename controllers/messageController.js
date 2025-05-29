const { MessageMedia } = require("whatsapp-web.js");
const { getClient } = require("../config/clientManager");

const sendMessage = async (req, res) => {
  const { sessionId, number, message = "", caption = "" } = req.body;
  const file = req.file;

  if (!sessionId || !number) {
    return res.status(400).json({ error: "Missing sessionId or number" });
  }

  const client = getClient(sessionId);
  if (!client) {
    return res.status(404).json({ error: "Session not found" });
  }

  const numberWithSuffix = number.includes("@c.us") ? number : `${number}@c.us`;

  try {
    if (file) {
      const media = new MessageMedia(
        file.mimetype,
        file.buffer.toString("base64"),
        file.originalname
      );
      await client.sendMessage(numberWithSuffix, media, {
        caption: caption || message,
      });
      return res.json({ success: true, message: "Media sent!" });
    }

    if (message.trim()) {
      await client.sendMessage(numberWithSuffix, message);
      return res.json({ success: true, message: "Text message sent!" });
    }

    res.status(400).json({ error: "No message or media to send" });
  } catch (error) {
    console.error("Send error:", error);
    res.status(500).json({ error: "Failed to send message or media" });
  }
};

module.exports = { sendMessage };
