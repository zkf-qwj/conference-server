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
var server = https.createServer(security,app);

var one2manyWss = new ws.Server({
    server : server,
    path : '/one2many'
});

require('./config/express')(app);
require('./routes')(app);
require('./socket/one2many').conference(one2manyWss);

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
  });
}

setImmediate(startServer);

// Expose app
 module.exports = app;
