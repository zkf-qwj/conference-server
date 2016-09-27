'use strict';

var express = require( 'express');
var passport = require( 'passport');
var setTokenCookie = require( '../auth.service').setTokenCookie;

var router = express.Router();

router
  .get('/', passport.authenticate('facebook', {
    scope: ['email', 'user_about_me'],
    failureRedirect: '/signup',
    session: false
  }))
  .get('/callback', passport.authenticate('facebook', {
    failureRedirect: '/signup',
    session: false
  }), setTokenCookie);

module.exports =  router;
