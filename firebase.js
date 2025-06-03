const admin = require("firebase-admin");
const serviceAccount = require("./animaai-9d0d4-firebase-adminsdk-fbsvc-ca75fc30c8.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

module.exports = db;