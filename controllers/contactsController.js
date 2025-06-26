const { getClient } = require("../config/clientManager");

const getContacts = async (req, res) => {
  const { sessionId } = req.query;
  const client = getClient(sessionId);
  if (!client) return res.status(404).json({ error: "Session not found" });

  try {
    const contacts = await client.getContacts();
    // You can format as needed
    const formatted = contacts.map((c) => ({
      name: c.name || c.pushname || c.number || c.id.user,
      number: c.id.user + "@c.us",
    }));
    res.json({ contacts: formatted });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

module.exports = { getContacts };
