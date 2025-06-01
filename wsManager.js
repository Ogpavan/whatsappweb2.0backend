const WebSocket = require("ws");

const sessionSockets = {};

function setupWSServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    if (sessionId) {
      sessionSockets[sessionId] = ws;
      ws.on("close", () => {
        delete sessionSockets[sessionId];
      });
    }
  });
}

function getSessionSockets() {
  return sessionSockets;
}

module.exports = { setupWSServer, getSessionSockets };
