var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var CallManager = require('./call_manager.js');
var callManager = new CallManager();
var sessionMap = {};
/*
 * Global variable
 */
var idCounter = 0;

function nextUniqueId() {
    idCounter++;
    return idCounter.toString();
}

function stop(sessionId) {
    var session = sessionMap[sessionId];
    if (session) {
        leave(session.memberId, session.meetingId);
        delete sessionMap[sessionId];
    }
}


module.exports = {
    call: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Call Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Call Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Call Connection ' + sessionId + ' closed');
                stop(sessionId);
            });
            ws.on('message', function(_message) {
                var message = null;
                try {
                    message = JSON.parse(_message);
                } catch (exc) {
                    console.log('Corrupted JSON message ' + _message);
                    return;
                }
                console.log('Call Connection ' + sessionId + ' received message ', message.id +
                    '  from user ' + message.memberId);
                sessionMap[sessionId] = {
                    memberId: message.memberId,
                    meetingId: message.meetingId
                };
                switch (message.id) {
                    case 'join':
                        join(message.memberId, message.meetingId,ws);
                        break;
                    case 'leave':
                        leave(message.memberId, message.meetingId);
                        break;    
                    case 'end':
                        end(message.meetingId);
                        break;
                    case 'stop':
                        stop(sessionId);
                        break;
                    case 'chat':
                        chat(message.memberId, message.meetingId, message.text);
                        break;
                    case 'whiteboard':
                        whiteboard(message.memberId, message.object,message.event);
                        break;
                    default:
                        ws.send(JSON.stringify({
                            id: 'error',
                            message: 'Invalid message ' + message
                        }));
                        break;
                }
            });
        });
    }
}



function updateMemberList(meetingId) {
    try {
        var call = callManager.getCallById(meetingId);
        call.broadcastMember();
    } catch (exc) {
        console.log('Connect channel error ', memberId, meetingId,channel);
    }
}

function leave(memberId, meetingId) {
    try {
        var call = callManager.getCallById(meetingId);
        var member = call.getMemberById(memberId);
        if (member) {
            call.unregisterMember(member.id);
            updateMemberList(meetingId);
        } 
    } catch (exc) {
        console.log('Leave error', exc, 'memberId:', memberId, 'meetingId:', meetingId, 'callManager', callManager.callById);
    }
}




function join(memberId, meetingId, ws) {
    callManager.registerCall(meetingId, function(success, call) {
        if (success) {
            console.log('Register call success ', meetingId);
            call.registerMember(memberId, ws, function(success, member) {
                console.log('Register member success ', memberId);
                ws.send(JSON.stringify({
                    id: 'joinResponse',
                    response: 'accepted',
                }));
                updateMemberList(meetingId);
            });
        } else ws.send(JSON.stringify({
            id: 'joinResponse',
            response: 'rejected',
        }));
    });
}

function end(meetingId) {
    callManager.unregisterCall(meetingId);
}

function chat(memberId, meetingId, text) {
    try {
        var call = callManager.getCallById(meetingId);
        var member = call.getMemberById(memberId);
        call.broadcastChat(member, text)
    } catch (exc) {
        console.log('Chat error ',exc, memberId, meetingId);
    }
}

function whiteboard(memberId, object, event) {
    try {
        var call = callManager.getCallById(meetingId);
        var member = call.getMemberById(memberId);
        call.broadcastWhiteboard(member, object,event)
    } catch (exc) {
        console.log('Whiteboard error ',exc, memberId, meetingId);
    }
}
