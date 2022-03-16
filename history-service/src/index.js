const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

function setupHandlers(app) {
  // TODO
}

function startHttpServer() {
  return new Promise(resolve => {
    const app = express();
    setupHandlers(app);

    const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
    app.listen(port, () => {
      resolve();
    });
  });
}

function main() {
  console.log("Hello computer! live reload is awesome!");
  return startHttpServer();
}

main()
  .then(() => console.log("Microservice online."))
  .catch(err => {
    console.error("Microservice failed to start.");
    console.error(err && err.stack || err);
  });
