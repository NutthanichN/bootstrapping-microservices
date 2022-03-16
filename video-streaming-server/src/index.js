const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const mongodb = require("mongodb");

const app = express();
dotenv.config();

if (!process.env.PORT) {
  throw new Error("Please specify the port number for the HTTP server with the environment variable PORT");
}

if (!process.env.DBHOST) {
  throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
  throw new Error("Please specify the name of the database using environment variable DBNAME");
}

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

console.log(`Forwarding video requests to ${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}.`);

// send request to the history service
function sendViewedMessage(videoPath) {
  const postOptions = {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
  };

  const requestBody = {
      videoPath: videoPath
  };

  const req = http.request(
      "http://history/viewed",
      postOptions
  );

  req.on("close", () => {
      console.log("Sent 'viewed' message to history microservice.");
  });

  req.on("error", (err) => {
      console.error("Failed to send 'viewed' message!");
      console.error(err && err.stack || err);
  });

  req.write(JSON.stringify(requestBody));
  req.end();
}

function setupHandlers(app, db) {

  const videosCollection = db.collection("videos");

  app.get("/", (req, res) => {
    res.send("Welcome to FlixTube");
  });

  app.get("/video", (req, res) => {
    const videoId = new mongodb.ObjectID(req.query.id);
    videosCollection.findOne({ _id: videoId })
        .then(videoRecord => {
            if (!videoRecord) {
                res.sendStatus(404);
                return;
            }

            console.log(`Translated id ${videoId} to path ${videoRecord.videoPath}.`);

            const forwardRequest = http.request( // Forward the request to the video storage microservice.
                {
                    host: VIDEO_STORAGE_HOST,
                    port: VIDEO_STORAGE_PORT,
                    path:`/video?path=${videoRecord.videoPath}`, // Video path now retrieved from the database.
                    method: 'GET',
                    headers: req.headers
                },
                forwardResponse => {
                    res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
                    forwardResponse.pipe(res);
                }
            );

            req.pipe(forwardRequest);
            sendViewedMessage(videoRecord.videoPath)  // send request to history service
        })
        .catch(err => {
            console.error("Database query failed.");
            console.error(err && err.stack || err);
            res.sendStatus(500);
        });
  });
}

function startHttpServer(db) {
  return new Promise(resolve => {
      const app = express();
      setupHandlers(app, db);

      app.listen(PORT, () => {
        console.log(`Microservice listening at port ${PORT}, please load the data file db-fixture/videos.json into your database before testing this microservice.`);
        resolve();
      });
  });
}

function connectDb() {
  return mongodb.MongoClient.connect(DBHOST)
      .then(client => {
          return client.db(DBNAME);
      });
}

function main() {
  return connectDb(DBHOST)
      .then(db => {
          return startHttpServer(db);
      });
}

main()
  .then(() => console.log("Microservice online."))
  .catch(err => {
      console.error("Microservice failed to start.");
      console.error(err && err.stack || err);
  });
