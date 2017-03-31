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
    conferenceP2P: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Conference Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Conference Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Conference Connection ' + sessionId + ' closed');
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
                console.log('Conference Connection ' + sessionId + ' received message ', message.id +
                    '  from user ' + message.memberId);
                sessionMap[sessionId] = {
                    memberId: message.memberId,
                    meetingId: message.meetingId
                };
                switch (message.id) {
                    case 'join':
                        join(message.memberId, message.meetingId,ws);
                        break;
                    case 'end':
                        end(message.meetingId);
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
                    case 'grantPresent':
                        grantPresent(message.memberId, message.meetingId,message.livePresenterId);
                        break;
                    case 'releasePresent':
                        releasePresent(message.memberId, message.meetingId,message.livePresenterId);
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



function leave(memberId, meetingId) {
    try {
        console.log(memberId,meetingId);
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



function grantPresent(memberId, meetingId,livePresenterId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var newPresenter = room.getMemberById(livePresenterId);
        var oldPresenterId = room.livePresenterId;
        room.livePresenterId = livePresenterId;
        room.broadcastPresent(livePresenterId);
        if (oldPresenterId) {
            var oldPresenter = room.getMemberById(oldPresenterId);
            oldPresenter.releasePresent();
        }
    } catch (exc) {
        console.log('Grant present error ',exc, memberId, meetingId);
    }
}

function releasePresent(memberId, meetingId,livePresenterId) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var currentPresenter = room.getMemberById(livePresenterId);
        if (currentPresenter) {
            currentPresenter.releasePresent();
            romm.livePresenterId = null;
        }
    } catch (exc) {
        console.log('Release present error ', exc,memberId, meetingId);
    }
}

function chat(memberId, meetingId, text) {
    try {
        var room = roomManager.getRoomById(meetingId);
        var member = room.getMemberById(memberId);
        room.broadcastChat(member, text)
    } catch (exc) {
        console.log('Chat error ',exc, memberId, meetingId);
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
        console.log('Fileshare error ', memberId, meetingId,exc);
    }
}