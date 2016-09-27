/**
 * Meeting model events
 */

'use strict';

var EventEmitter = require('events'),
 Meeting = require( './meeting.model');
var MeetingEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
MeetingEvents.setMaxListeners(0);

// Model events
var events = {
  save: 'save',
  remove: 'remove'
};

// Register the event emitter to the model events
for(var e in events) {
  let event = events[e];
  Meeting.schema.post(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc) {
    MeetingEvents.emit(event + ':' + doc._id, doc);
    MeetingEvents.emit(event, doc);
  };
}

module.exports =  MeetingEvents;
