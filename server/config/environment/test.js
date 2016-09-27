'use strict';
/*eslint no-process-env:0*/

// Test specific configuration
// ===========================
module.exports = {
  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/conference-test'
  },
  ws_uri: "ws://training.demo.vietinterview.com:8888/kurento",
  security:
      {
          key:'/etc/letsencrypt/live/training.demo.vietinterview.com/privkey.pem',
          cert:'/etc/letsencrypt/live/training.demo.vietinterview.com/fullchain.pem'
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
