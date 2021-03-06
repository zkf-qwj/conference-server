'use strict';
/*eslint no-process-env:0*/

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip: process.env.OPENSHIFT_NODEJS_IP
    || process.env.ip
    || undefined,

  // Server port
  port: process.env.OPENSHIFT_NODEJS_PORT
    || process.env.port
    || 8080,
    hostname : 'localhost',

  // MongoDB connection options
  mongo: {
    uri: process.env.MONGODB_URI
      || process.env.MONGOHQ_URL
      || process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME
      || 'mongodb://localhost/conference'
  },
  secrets: {
      session: 'conference-secret',
      api: '1234567890'
    },
  seedDB: true,
  uploadDir:'/home/data/conferencecontrol/public',
  scriptDir:'/home/data/conferencecontrol/scripts'
};
