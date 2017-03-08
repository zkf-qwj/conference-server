'use strict';

var Router = require( 'express');
var member_controller = require( '../member/member.controller');
var meeting_controller = require('../meeting/meeting.controller');
var auth = require( '../../auth/auth.service');

var router = new Router();

router.post('/meeting',auth.isTrusted(), meeting_controller.create);
router.post('/member',auth.isTrusted(), member_controller.create);
router.put('/meeting',auth.isTrusted(), meeting_controller.update);
router.put('/member',auth.isTrusted(), member_controller.update);
router.delete('/meeting',auth.isTrusted(), meeting_controller.remove);
router.delete('/member',auth.isTrusted(), member_controller.remove);
router.post('/login',auth.isTrusted(), member_controller.trustLogin);
module.exports = router;
