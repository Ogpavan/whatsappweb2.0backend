 

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const apiRoutes = require("./routes/apiRoutes");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer(); // Used in route

app.use(upload.single("media")); // attach multer to POST
app.use("/", apiRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
