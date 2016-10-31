'use strict';

var Router = require( 'express')
var controller = require('./measure.controller');

var router = new Router();

router.post('/upChannel',controller.upChannel);
router.post('/downChannel',controller.downChannel);
module.exports = router;
