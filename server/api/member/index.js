'use strict';

var Router = require( 'express');
var controller = require( './member.controller');
var auth = require( '../../auth/auth.service');

var router = new Router();

router.get('/', auth.isAuthenticated(),controller.index);
router.post('/',auth.isAuthenticated(), controller.create);
router.put('/',auth.isAuthenticated(), controller.update);
router.delete('/',auth.isAuthenticated(), controller.remove);
router.get('/info',auth.isAuthenticated(), controller.info);
router.post('/login', controller.login);
router.post('/invite', controller.invite);
module.exports = router;
