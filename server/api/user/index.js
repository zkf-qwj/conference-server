'use strict';

var Router =require( 'express');
var  controller =require( './user.controller');
var auth =require( '../../auth/auth.service');

var router = new Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.get('/:id', auth.isAuthenticated(), controller.info);
router.post('/', controller.create);

module.exports = router;
