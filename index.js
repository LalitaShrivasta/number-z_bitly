const express = require("express");
const app = express();
const port = 5000;
const shortid = require("shortid");

// mongodb connection
const mongoose = require("mongoose");
mongoose.connect(
  "mongodb://localhost:27017/test",
  { useNewUrlParser: true }
);
const dbConnection = mongoose.connection;
dbConnection.on("open", () => {
  console.log("Connected to DB!");
});

// URL table to save in the database
const URL = mongoose.model("url", {
  hash: String,
  url: String,
  maxHits: { type: Number, default: 6 },
  hits: { type: Number, default: 0 }
});

//  logging how many request made
const loggerMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

app.use(loggerMiddleware);
app.use(express.json());

// app.get('/', (req, res) => {
//     return res.send('Hello World')
// })

app.post("/shorten", (req, res) => {
  console.log(req.body);
  URL.findOne({ url: req.body.url })
    .exec()
    .then(existingUrl => {
      // check if url has been already created
      if (existingUrl) {
        return existingUrl;
        // create if no shorten url exist
      } else {
        const hash = shortid.generate();

        return URL.create({
          hash: hash,
          url: req.body.url,
          maxHits: req.body.maxHits
        });
      }
    })
    .then(doc => {
      return res.status(201).send(doc);
    });
});

app.get("/hits", (req, res) => {
  // console.log(req.query)
  URL.findOne({ hash: req.query.hash })
    .exec()
    .then(existingUrl => {
      return res.send({ hits: existingUrl.hits });
    });
});

app.get("/:hash", (req, res) => {
  console.log(req.params);
  URL.findOne({ hash: req.params.hash })
    .exec()
    .then(existingUrl => {
      if (existingUrl) {
        console.log("Redirecting...");
        let setValues = {
          $set: {
            hits: existingUrl.hits + 1
          }
        };

        let whereClause = {
          hash: req.params.hash
        };
        // update the URL HITS here
        // how to update any row in a table in mongodb
        return URL.update(whereClause, setValues)
          .exec()
          .then(() => {
            console.log(existingUrl);
            console.log(existingUrl.maxHits);
            if (existingUrl.hits < existingUrl.maxHits) {
              return res.redirect(existingUrl.url);
            } else {
              res.status(404).send("not found");
            }
          });
      } else {
        return res.send(404);
      }
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
