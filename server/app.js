'use strict';

var express = require('express'),
mongoose = require('mongoose'),
config = require('./config/environment'),
http = require('url'),
https = require('https'),
ws = require('ws'),
fs = require('fs'),
http = require('http');

mongoose.Promise = require('bluebird');
// Connect to MongoDB
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function(err) {
  console.error('MongoDB connection error: ' + err);
  process.exit(-1); // eslint-disable-line no-process-exit
});

// Populate databases with sample data
if(config.seedDB) {
  require('./config/seed');
}

// Setup server
var security =
{
    key:  fs.readFileSync(config.security.key),
    cert: fs.readFileSync(config.security.cert)
}
var app = express();
var apiServer = https.createServer(security,app);
var trainingServer = https.createServer(security,app);
var streamingServer = https.createServer(security,app);
var conferenceServer = https.createServer(security,app);

var streamingWss = new ws.Server({
    server : streamingServer,
    path : '/streaming'
});

var trainingWss = new ws.Server({
    server : trainingServer,
    path : '/training'
});

var conferenceWss = new ws.Server({
    server : conferenceServer,
    path : '/conference'
});

require('./config/express')(app);
require('./routes')(app);
require('./socket/streaming/main').streaming(streamingWss);
require('./socket/training/main').training(trainingWss);
require('./socket/conference/main').conference(conferenceWss);

// Start server
function startServer() {
  app.apiServer = apiServer.listen(config.apiPort, config.ip, function() {
    console.log('API server listening on %d, in %s mode', config.apiPort, app.get('env'));
  });
  app.trainingServer = trainingServer.listen(config.trainingPort, config.ip, function() {
      console.log('Training server listening on %d, in %s mode', config.trainingPort, app.get('env'));
    });
  app.conferenceServer = conferenceServer.listen(config.conferencePort, config.ip, function() {
      console.log('Conference server listening on %d, in %s mode', config.conferencePort, app.get('env'));
    });
  app.streamingServer = streamingServer.listen(config.streamingPort, config.ip, function() {
      console.log('Streaming server listening on %d, in %s mode', config.streamingPort, app.get('env'));
    });
}

setImmediate(startServer);

// Expose app
 module.exports = app;
