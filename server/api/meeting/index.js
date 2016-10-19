'use strict';

var Router = require( 'express')
var controller = require('./meeting.controller');
var auth = require( '../../auth/auth.service');

var router = new Router();

router.get('/', auth.isAuthenticated(),controller.index);
router.post('/',auth.isAuthenticated(), controller.create);
router.put('/',auth.isAuthenticated(), controller.update);
router.post('/end',auth.isAuthenticated(), controller.end);
router.get('/info',auth.isAuthenticated(), controller.info);
router.post('/upload',controller.upload);
module.exports = router;
