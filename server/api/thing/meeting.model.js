'use strict';

var mongoose = require('mongoose');

var MeetingSchema = new mongoose.Schema({
    name: String,
    meetingId: String,
    welcome: String,
    duration: Number,
    logoutUrl: String,
    data: Object,
    active:Boolean
});

module.exports =  mongoose.model('Meeting', MeetingSchema);
