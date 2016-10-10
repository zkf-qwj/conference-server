/**
 * Main application routes
 */

'use strict';

var errors = require( './components/errors');
var path = require( 'path');

module.exports =  function(app) {
  // Insert routes below
  app.use('/api/meeting', require('./api/meeting'));
  app.use('/api/member', require('./api/member'));
  app.use('/api/trusted', require('./api/trustedparty'));
  app.use('/api/users', require('./api/user'));

  app.use('/api/auth', require('./auth'));

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);


}
