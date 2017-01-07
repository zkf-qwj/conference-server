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
    training: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Training Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Training Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Training Connection ' + sessionId + ' closed');
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
                console.log('Training Connection ' + sessionId + ' received message ', message.id +
                    '  from user ' + message.memberId);
                sessionMap[sessionId] = {
                    memberId: message.memberId,
                    meetingId: message.meetingId
                };
                switch (message.id) {
                    case 'join':
                        join(message.memberId, message.meetingId, ws);
                        break;
                    case 'registerChannel':
                        registerChannel(message.memberId, message.meetingId,message.channel);
                        break;
                    case 'unregisterChannel':
                        unregisterChannel(message.memberId, message.meetingId,message.channel);
                        break;
                    case 'handUp':
                        handUp(message.memberId, message.meetingId);
                        break;
                    case 'handDown':
                        handDown(message.memberId, message.meetingId);
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
                    case 'fileShare':
                        fileShare(message.memberId, message.meetingId,message.event,message.object);
                        break;
                    case 'presentation':
                        presentation(message.memberId, message.meetingId,message.event,message.object);
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

function registerChannel(memberId, meetingId,channel) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var publisher = room.getMemberById(memberId);
        publisher.registerChannel(channel);
    } catch (exc) {
        console.log('Register channel error ', memberId, meetingId,channel);
    }
}

function unregisterChannel(memberId, meetingId,channel) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var publisher = room.getMemberById(memberId);
        publisher.unregisterChannel(channel);
    } catch (exc) {
        console.log('Register channel error ', memberId, meetingId,channel);
    }
}

function leave(memberId, meetingId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        if (member) {
            member.leave();
            room.unregisterMember(member.id);
            room.broadcastMember();
        }        
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
                        presentation:room.presentationBuffer,
                        fileShare: room.fileShare,
                        channelList:room.broadcastChannelList
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

function handUp(memberId, meetingId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        member.raiseHand();
    } catch (exc) {
        console.log('Raise hand error ', memberId, meetingId, exc);
    }
}

function handDown(memberId, meetingId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        member.lowHand();
    } catch (exc) {
        console.log('Low hand error ', memberId, meetingId, exc);
    }
}

function end(meetingId) {
    roomManager.unregisterRoom(meetingId);
}

function invite(meetingId, inviteeId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var invitee = room.getMemberById(inviteeId);
        if (invitee)
            invitee.onDiscussion();
    } catch (exc) {
        console.log('Invite error ', inviteeId, meetingId,exc);
    }
}

function discard(meetingId, inviteeId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var invitee = room.getMemberById(inviteeId);
        invitee.offDiscussion();
        room.broadcastMember();
    } catch (exc) {
        console.log('Discard error ', inviteeId, meetingId, exc);
    }
}

function chat(memberId, meetingId, text) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastChat(member, text)
    } catch (exc) {
        console.log('Chat error ', memberId, meetingId, exc);
    }
}

function presentation(memberId, meetingId, event,object) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastPresentation(member,event,object);
    } catch (exc) {
        console.log('Presentation error ', memberId, meetingId, exc);
    }
}

function fileShare(memberId, meetingId, event,object) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastFileShare(member,event,object);
    } catch (exc) {
        console.log('Fileshare error ', memberId, meetingId, exc);
    }
}