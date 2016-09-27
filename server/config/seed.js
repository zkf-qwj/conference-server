/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';
var User = require( '../api/user/user.model');


User.find({}).remove()
  .then(() => {
    User.create({
      provider: 'local',
      role: 'tester',
      name: 'Tester',
      email: 'test',
      password: '123456'
    }, {
      provider: 'local',
      role: 'admin',
      name: 'Admin',
      email: 'admin',
      password: 'admin'
    })
    .then(() => {
      console.log('finished populating users');
    });
  });
