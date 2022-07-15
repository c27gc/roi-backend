require('dotenv').config()
const fs = require('fs');
const https = require('https')
const mongoose = require("mongoose");
const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
const passport = require("passport");

const users = require("./routes/api/users");

const app = express();
app.use(cors());
app.use(express.static(__dirname + '/'));

const HTTPSPORT = 5001;

const fileKey = __dirname + '/certs/private.key';
const filePem = __dirname + '/certs/certificate.crt';

if (fs.existsSync(fileKey) && fs.existsSync(filePem)) {
  const key = fs.readFileSync(fileKey, 'utf8')
  const cert = fs.readFileSync(filePem, 'utf8')
  const options = { cert, key }
  httpsServer = https.createServer(options, app)
}

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

// Bodyparser middleware
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

// DB Config
const db = require("./config/keys").mongoURI;
// Connect to MongoDB
mongoose
  .connect(
    db,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }
  )
  .then(() => console.log("MongoDB successfully connected"))
  .catch(err => console.log(err));

// Passport middleware
app.use(passport.initialize());

// Passport config
require("./config/passport")(passport);

// Routes
app.use("/api/users", users);

app.use(express.static(__dirname + "/build"));
app.get('/*', function (req, res) {
  res.sendFile(__dirname + '/build/index.html', function (err) {
    if (err) {
      res.status(500).send(err)
    }
  })
})

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server up and running on port ${port} !`));

httpsServer.listen(HTTPSPORT, () => console.log(`httpsServer running on port ${HTTPSPORT}`));