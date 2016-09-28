'use strict';

var mongoose = require('mongoose');

var MemberSchema = new mongoose.Schema({
    name: String,
    meetingId: String,
    email: String,
    password: String,
    role: String,
});

module.exports =  mongoose.model('Member', MemberSchema);
