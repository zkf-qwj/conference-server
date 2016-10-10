'use strict';
/*eslint no-process-env:0*/

// Test specific configuration
// ===========================
module.exports = {
  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/conference-test'
  },
  seedDB: true,
  ws_uri: "ws://demo.vietinterview.com:8888/kurento",
  security:
      {
          key:'/etc/letsencrypt/live/training.demo.vietinterview.com/privkey.pem',
          cert:'/etc/letsencrypt/live/training.demo.vietinterview.com/fullchain.pem'
      },
  secrets: {
      session: 'conference-secret',
      api: '1234567890'
    },
  sequelize: {
    uri: 'sqlite://',
    options: {
      logging: false,
      storage: 'test.sqlite',
      define: {
        timestamps: false
      }
    }
  }
};
