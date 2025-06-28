const { MessageMedia } = require("whatsapp-web.js");
const { getClient } = require("../config/clientManager");

const sendMessage = async (req, res) => {
  if (!req.body) {
    console.error("Request body is missing");
    return res.status(400).json({ error: "Request body is missing" });
  }

  const sessionId = req.body.sessionId;
  const number = req.body.number;
  const message = req.body.message || "";
  const caption = req.body.caption || "";
  const file = req.file;

   
  if (!sessionId || !number) {
    console.error("Missing sessionId or number", { sessionId, number });
    return res.status(400).json({ error: "Missing sessionId or number" });
  }

  const client = getClient(sessionId);
  if (!client) {
    console.error("Session not found for sessionId:", sessionId);
    return res.status(404).json({ error: "Session not found" });
  }

  const numberWithSuffix = number.includes("@c.us") ? number : `${number}@c.us`;
  console.log("Sending to WhatsApp number:", numberWithSuffix);

  try {
    const isRegistered = await client.isRegisteredUser(numberWithSuffix);
    if (!isRegistered) {
      console.error("Number is not registered on WhatsApp:", numberWithSuffix);
      return res
        .status(400)
        .json({ error: "Number is not registered on WhatsApp" });
    }

    if (file) {
      const media = new MessageMedia(
        file.mimetype,
        file.buffer.toString("base64"),
        file.originalname
      );
      console.log("Sending media message...");
      await client.sendMessage(numberWithSuffix, media, {
        caption: caption || message,
      });
      console.log("Media sent successfully");
      return res.json({ success: true, message: "Media sent!" });
    }

    if (message.trim()) {
      
      await client.sendMessage(numberWithSuffix, message);
      
      return res.json({ success: true, message: "Text message sent!" });
    }

    console.error("No message or media to send");
    res.status(400).json({ error: "No message or media to send" });
  } catch (error) {
    if (
      error.message &&
      error.message.includes("Cannot read properties of undefined (reading 'serialize')")
    ) {
      console.warn("Message sent, but got known serialize error from whatsapp-web.js. Ignoring.");
      return res.json({ success: true, message: "Message likely sent, but got serialize error." });
    }
    console.error("Send error:", error);
    res.status(500).json({ error: "Failed to send message or media" });
  }
};

module.exports = { sendMessage };