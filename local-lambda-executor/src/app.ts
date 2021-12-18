import express from "express";
import { loadConfig } from "./config";
import { LocalLambdaExecutor } from "./LocalLambdaExecutor";
import { logging } from "./logging";

const log = logging();

// initialize configuration
const config = loadConfig();

const app = express();
const port = process.env.SERVER_PORT || 3000;

// define a route handler for the default home page
app.get( "/", ( req, res ) => {
  res.send( `Local lambda executor is started.` );
} );

// start the Express server
app.listen( port, () => {
  log.info(`Express server started at http://localhost:${ port }`);

  const sqsExecutor = new LocalLambdaExecutor(config);
  sqsExecutor.start();
} );
