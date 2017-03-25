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
var callServer = https.createServer(security,app);
var one2manyServer = https.createServer(security,app);
var one2oneServer = https.createServer(security,app);
var one2oneDirectServer = https.createServer(security,app);
var many2manyServer = https.createServer(security,app);
var conferenceServer = https.createServer(security,app);
var conferenceP2PServer = https.createServer(security,app);

var one2oneWss = new ws.Server({
    server : one2oneServer,
    path : '/one2one'
});

var one2oneDirectWss = new ws.Server({
    server : one2oneDirectServer,
    path : '/one2oneDirect'
});

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

var callWss = new ws.Server({
    server : callServer,
    path : '/call'
});

var conferenceWss = new ws.Server({
    server : conferenceServer,
    path : '/conference'
});

var conferenceP2PWss = new ws.Server({
    server : conferenceP2PServer,
    path : '/conferenceP2P'
});

require('./config/express')(app);
require('./routes')(app);
require('./socket/one2one/main').one2one(one2oneWss);
require('./socket/one2oneDirect/main').one2oneDirect(one2oneDirectWss);
require('./socket/one2many/main').one2many(one2manyWss);
require('./socket/many2many/main').many2many(many2manyWss);
require('./socket/training/main').training(trainingWss);
require('./socket/call/main').call(callWss);
require('./socket/conference/main').conference(conferenceWss);
require('./socket/conferenceP2P/main').conferenceP2P(conferenceP2PWss);

// Start server
function startServer() {
  app.apiServer = apiServer.listen(config.apiPort, config.ip, function() {
    console.log('API server listening on %d, in %s mode', config.apiPort, app.get('env'));
  });
  app.trainingServer = trainingServer.listen(config.trainingPort, config.ip, function() {
      console.log('Training server listening on %d, in %s mode', config.trainingPort, app.get('env'));
    });
  app.callServer = callServer.listen(config.callPort, config.ip, function() {
      console.log('Call server listening on %d, in %s mode', config.callPort, app.get('env'));
    });
  app.conferenceServer = conferenceServer.listen(config.conferencePort, config.ip, function() {
      console.log('Conference server listening on %d, in %s mode', config.conferencePort, app.get('env'));
    });
  app.conferenceP2PServer = conferenceP2PServer.listen(config.conferenceP2PPort, config.ip, function() {
      console.log('Conference P2P server listening on %d, in %s mode', config.conferenceP2PPort, app.get('env'));
    });
  app.one2oneServer = one2oneServer.listen(config.one2onePort, config.ip, function() {
      console.log('one2one server listening on %d, in %s mode', config.one2onePort, app.get('env'));
    });
  app.one2oneDirectServer = one2oneDirectServer.listen(config.one2oneDirectPort, config.ip, function() {
      console.log('one2oneDirect direct server listening on %d, in %s mode', config.one2oneDirectPort, app.get('env'));
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
 
 

