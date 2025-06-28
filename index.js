const express = require("express");
const cors = require("cors");
const multer = require("multer");
const http = require("http");
const { setupWSServer } = require("./wsManager"); // Only use this

const apiRoutes = require("./routes/apiRoutes");

const app = express();
 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer(); // Used in route

// app.use(upload.single("media")); // attach multer to POST
app.use("/", apiRoutes);

const server = http.createServer(app);

setupWSServer(server); // <-- Only this for WebSocket

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});