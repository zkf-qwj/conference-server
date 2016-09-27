'use strict';
/*eslint no-process-env:0*/

// Development specific configuration
// ==================================
module.exports = {

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/conference-dev'
  },

  // Seed database on startup
  seedDB: true,
  ws_uri: "ws://demo.vietinterview.com:8888/kurento",
  security:
  {
      key:  './config/keys/server.key',
      cert: './config/keys/server.crt'
  }

};
