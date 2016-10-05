/**
 * Express configuration
 */

'use strict';

var express = require( 'express');
var favicon = require( 'serve-favicon');
var morgan = require( 'morgan');
var shrinkRay = require( 'shrink-ray');
var bodyParser = require( 'body-parser');
var methodOverride = require( 'method-override');
var cookieParser = require( 'cookie-parser');
var errorHandler = require( 'errorhandler');
var path = require( 'path');
var lusca = require( 'lusca');
var config = require( './environment');
var passport = require( 'passport');
var session = require( 'express-session');
var connectMongo = require( 'connect-mongo');
var mongoose = require( 'mongoose');
var MongoStore = connectMongo(session);

module.exports= function(app) {
  var env = app.get('env');

 

  app.use(morgan('dev'));
  
  app.set('views', config.root + '/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(shrinkRay());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());


  // Persist sessions with MongoStore / sequelizeStore
  // We need to enable sessions for passport-twitter because it's an
  // oauth 1.0 strategy, and Lusca depends on sessions
  app.use(session({
    secret: config.secrets.session,
    saveUninitialized: true,
    resave: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      db: 'fullstack'
    })
  }));

  /**
   * Lusca - express server security
   * https://github.com/krakenjs/lusca
   */
  app.use(lusca({
      // csrf: true,
      // xframe: 'SAMEORIGIN',
       p3p: 'ABCDEF',
       hsts: {maxAge: 31536000, includeSubDomains: true, preload: true},
       xssProtection: true,
       nosniff: true
   }));

//Add headers
  app.use(function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
      res.setHeader('Access-Control-Allow-Credentials', true);

      next();
  });
  if(env === 'development' || env === 'test') {
    app.use(errorHandler()); // Error handler - has to be last
  }
}
