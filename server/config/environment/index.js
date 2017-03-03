'use strict';
/*eslint no-process-env:0*/

require('dotenv').config()
var path = require( 'path'),
 _  = require('lodash');

/*function requiredProcessEnv(name) {
  if(!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}*/

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,


  // Browser-sync port
  browserSyncPort: process.env.BROWSER_SYNC_PORT || 9444,

  // Server port
  apiPort: process.env.API_PORT || 9444,
  one2manyPort: process.env.ONE2MANY_PORT || 9445,
  callPort: process.env.TRAINING_PORT || 9451,
  trainingPort: process.env.TRAINING_PORT || 9446,
  conferencePort: process.env.CONFERENCE_PORT || 9447,
  conferenceP2PPort: process.env.CONFERENCE_P2P_PORT || 9450,
  many2manyPort: process.env.MANY2MANY_PORT || 9448,
  one2onePort: process.env.ONE2ONE_PORT || 9449,

  // Server IP
  ip: process.env.IP || '0.0.0.0',

  // Should we populate the DB with sample data?
  seedDB: false,
  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'conference-secret',
    api: '1234567890'
  },

  // MongoDB connection options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },

  facebook: {
    clientID: process.env.FACEBOOK_ID || 'id',
    clientSecret: process.env.FACEBOOK_SECRET || 'secret',
    callbackURL: process.env.DOMAIN +'/auth/facebook/callback'
  }
};

// Export the config object based on the NODE_ENV
// ==============================================

module.exports = _.merge(
  all,
  require('./shared'),
  require('./'+process.env.NODE_ENV +'.js')
)