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
var one2manyServer = https.createServer(security,app);
var many2manyServer = https.createServer(security,app);
var conferenceServer = https.createServer(security,app);

var one2manyWss = new ws.Server({
    server : one2manyServer,
    path : '/one2many'
});

var many2manyWss = new ws.Server({
    server : many2manyServer,
    path : '/many2many'
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
require('./socket/one2many/main').one2many(one2manyWss);
require('./socket/many2many/main').many2many(many2manyWss);
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
  app.one2manyServer = one2manyServer.listen(config.one2manyPort, config.ip, function() {
      console.log('one2many server listening on %d, in %s mode', config.one2manyPort, app.get('env'));
    });
  app.many2manyServer = many2manyServer.listen(config.many2manyPort, config.ip, function() {
      console.log('many2many server listening on %d, in %s mode', config.many2manyPort, app.get('env'));
    });
}

setImmediate(startServer);

// Expose app
 module.exports = app;
 
 

