const { Client, LocalAuth } = require("whatsapp-web.js");

const clients = {};

const createClient = (sessionId) => {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: "./sessions",
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  clients[sessionId] = client;
  return client;
};

const getClient = (sessionId) => clients[sessionId];
const removeClient = (sessionId) => delete clients[sessionId];
const getAllClients = () => clients;

module.exports = { createClient, getClient, removeClient, getAllClients };
