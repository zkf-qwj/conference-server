var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var Endpoint = require('./endpoint');
var Connection = require('./connection');
var ConnectionManager = require('./connection_manager');
var connectionManager = new ConnectionManager();
/*
 * Global variable
 */
var idCounter = 0;
function nextUniqueId() {
    idCounter++;
    return idCounter.toString();
}

module.exports = {
    one2oneDirect: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Streaming Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Streaming Connection ' + sessionId + ' error');
                unbind(sessionId);
            });
            ws.on('close', function() {
                console.log('Streaming Connection ' + sessionId + ' closed');
                unbind(sessionId);
            });
            ws.on('message', function(_message) {
                var message = null;
                try {
                    message = JSON.parse(_message);
                } catch (exc) {
                    console.log('Corrupted JSON message ' + _message);
                    return;
                }
                console.log('Streaming Connection ' + sessionId + ' received message ', message.id);
                switch (message.id) {
                    case 'bind':
                        bind(ws,sessionId,message.meetingId,message.memberId);
                        break;
                    case 'offer':
                        generateOffer(ws,sessionId,message.meetingId,message.memberId,message.sdpOffer);
                        break;
                    case 'answer':
                        processOffer(ws,sessionId,message.meetingId,message.memberId,message.sdpAnswer);
                        break;
                    case 'iceCandidate':
                        iceCandidate(ws,sessionId,message.meetingId,message.memberId,message.candidate);
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

function bind(ws,sessionId,meetingId,memberId) {
    try {
        var connection = connectionManager.getConnectionById(meetingId);
        var endpoint = connection.getEndpointById(memberId);
        endpoint.ws = ws;
        endpoint.sessionId = sessionId;
    } catch (exc) {
        console.log('Bind  error ', meetingId,memberId, sdpOffer);
    }
}

function unbind(ws,sessionId) {
    try {
        connectionManager.releaseEndpointInSession(meetingId);
    } catch (exc) {
        console.log('Unbind ',sessionId);
    }
}


function generateOffer(ws,sessionId,meetingId,memberId, sdpOffer) {
    try {
        var connection = connectionManager.getConnectionById(meetingId);
        var endpoint = connection.getEndpointById(memberId);
        connection.sendOffer(endpoint,sdpOffer);
    } catch (exc) {
        console.log('Generate offer error ', meetingId,memberId, sdpOffer);
    }
}

function processOffer(ws,sessionId,meetingId,memberId, sdpAnswer) {
    try {
        var connection = connectionManager.getConnectionById(meetingId);
        var endpoint = connection.getEndpointById(memberId);
        endpoint.ws = ws;
        connection.sendAnswer(endpoint,sdpAnswer);
    } catch (exc) {
        console.log('Proccess offer error ', meetingId,memberId, sdpOffer);
    }
}

function iceCandidate(ws,sessionId,meetingId,memberId, candidate) {
    try {
        var connection = connectionManager.getConnectionById(meetingId);
        var endpoint = connection.getEndpointById(memberId);
        endpoint.ws = ws;
        connection.sendIceCandidate(endpoint,candidate);
    } catch (exc) {
        console.log('Send candidate error ', exc, meetingId,memberId, candidate);
    }
}

