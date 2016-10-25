var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var RoomManager = require('./room_manager.js');
var roomManager = new RoomManager();
var sessionMap = {};
/*
 * Global variable
 */
var idCounter = 0;

function nextUniqueId() {
    idCounter++;
    return idCounter.toString();
}
module.exports = {
    conference: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Connection ' + sessionId + ' closed');
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
                console.log('Connection ' + sessionId + ' received message ', message.id +
                    '  from user ' + message.memberId);
                sessionMap[sessionId] = {
                    memberId: message.memberId,
                    meetingId: message.meetingId
                };
                switch (message.id) {
                    case 'join':
                        join(message.memberId, message.meetingId, ws);
                        break;
                    case 'publish':
                        publish(message.memberId, message.meetingId, message.sdpOffer,message.candidateList);
                        break;
                    case 'subscribe':
                        subscribe(message.memberId, message.meetingId, message.pubId, message.sdpOffer,message.candidateList);
                        break;
                    case 'publishAvail':
                        publishAvail(message.memberId, message.meetingId);
                        break;
                    case 'subscribeAvail':
                        subscribeAvail(message.memberId, message.meetingId, message.pubId);
                        break;
                    case 'end':
                        end(message.meetingId);
                        break;
                    case 'invite':
                        invite(message.meetingId, message.inviteeId);
                        break;
                    case 'discard':
                        discard(message.meetingId, message.inviteeId);
                        break;
                    case 'leave':
                        leave(message.memberId, message.meetingId);
                        break;
                    case 'stop':
                        stop(sessionId);
                        break;
                    case 'chat':
                        chat(message.memberId, message.meetingId, message.text);
                        break;
                    case 'whiteboard':
                        whiteboard(message.memberId, message.meetingId,message.event,message.object);
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

function publishAvail(memberId, meetingId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var publisher = room.getMemberById(memberId);
        publisher.readyToPublish();
        room.broadcastMember();
    } catch (exc) {
        console.log('Pub Avail error ', memberId, meetingId);
    }
}

function subscribeAvail(memberId, meetingId,pubId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var subscriber = room.getMemberById(memberId);
        var publisher = room.getMemberById(pubId);
        subscriber.readyToSubscribe(publisher);
    } catch (exc) {
        console.log('Sub Avail error ', memberId, meetingId,pubId);
    }
}

function leave(memberId, meetingId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        member.leave();
        room.unregisterMember(member.id);
        room.broadcastMember();
    } catch (exc) {
        console.log('Leave error', exc, 'memberId:', memberId, 'meetingId:', meetingId, 'roomManager', roomManager.roomById);
    }
}

function stop(sessionId) {
    var session = sessionMap[sessionId];
    if (session) {
        leave(session.memberId, session.meetingId);
        delete sessionMap[sessionId];
    }
}

function publish(memberId, meetingId, sdpOffer,candidateList) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var publisher = room.getMemberById(memberId);
        var rejectCause = 'User ' + memberId + ' is not registered';
        publisher.publish(sdpOffer,candidateList, function(success, sdpAnswer,candidateList) {
            if (success) {
                publisher.sendMessage({
                    id: 'publishResponse',
                    response: 'accepted',
                    sdpAnswer: sdpAnswer,
                    candidateList:candidateList
                });
            } else {
                publisher.sendMessage({
                    id: 'publishResponse',
                    response: 'rejected'
                });
            }
        })
    } catch (exc) {
        console.log('Publish error ', memberId, meetingId);
    }
}

function subscribe(memberId, meetingId, pubId, sdpOffer,candidateList) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var publisher = room.getMemberById(pubId);
        var subscriber = room.getMemberById(memberId);
        var rejectCause = 'User ' + memberId + ' is not registered';
        subscriber.subscribe(publisher, sdpOffer, candidateList,function(success, sdpAnswer,candidateList) {
            if (success) {
                subscriber.sendMessage( {
                    id: 'subscribeResponse',
                    response: 'accepted',
                    pubId: pubId,
                    sdpAnswer: sdpAnswer,
                    candidateList:candidateList
                });
            } else {
                subscriber.sendMessage( {
                    id: 'subscribeResponse',
                    response: 'rejected',
                    pubId: pubId
                });
            }
        })
    } catch (exc) {
        console.log('Subscribe error ', memberId, meetingId);
    }
}

function join(memberId, meetingId, ws) {
    roomManager.registerRoom(meetingId, function(success, room) {
        if (success) {
            console.log('Register room success ', meetingId);
            room.registerMember(memberId, ws, function(success, member) {
                console.log('Register member success ', memberId);
                if (success) {
                    ws.send(JSON.stringify({
                        id: 'joinResponse',
                        response: 'accepted',
                        whiteboard:room.whiteboardBuffer
                    }));
                    room.broadcastMember();
                } else ws.send(JSON.stringify({
                    id: 'joinResponse',
                    response: 'rejected',
                }));
            });
        } else ws.send(JSON.stringify({
            id: 'joinResponse',
            response: 'rejected',
        }));
    });
}


function end(meetingId) {
    roomManager.unregisterRoom(meetingId);
}

function invite(meetingId, inviteeId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var invitee = room.getMemberById(inviteeId);
        invitee.onDiscussion();
        room.broadcastMember();
    } catch (exc) {
        console.log('Invite error ', memberId, meetingId);
    }
}

function discard(meetingId, inviteeId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var invitee = room.getMemberById(inviteeId);
        invitee.offDiscussion();
        room.broadcastMember();
    } catch (exc) {
        console.log('Discard error ', memberId, meetingId);
    }
}

function chat(memberId, meetingId, text) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastChat(member, text)
    } catch (exc) {
        console.log('Chat error ', memberId, meetingId);
    }
}

function whiteboard(memberId, meetingId, event,object) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastWhiteboard(member,event,object);
    } catch (exc) {
        console.log('Whiteboard error ', memberId, meetingId);
    }
}