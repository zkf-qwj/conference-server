var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var Conversation = require('./conversation');
var Party = require('./party');
var ConversationManager = require('./conversation_manager');
var convManager = new ConversationManager();
/*
 * Global variable
 */
var idCounter = 0;
function nextUniqueId() {
    idCounter++;
    return idCounter.toString();
}

module.exports = {
    one2many: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Streaming Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Streaming Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Streaming Connection ' + sessionId + ' closed');
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
                console.log('Streaming Connection ' + sessionId + ' received message ', message.id);
                switch (message.id) {
                    case 'call':
                        publish(ws,sessionId,message.groupId,message.partyId,message.sdpOffer,message.candidateList,message.bitrate);
                        break;
                    case 'stop':
                        stop(sessionId);
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


function stop(sessionId) {
    channelManager.releaseChannelInSession(sessionId);
    subscriptionManager.releaseSubInSession(sessionId);
}

function publish(ws,sessionId, publisherId,source,sdpOffer,candidateList,bitrate) {
    try {
        var channel = new Channel(sessionId,source);
        channel.publish(sdpOffer,candidateList,bitrate, function(success, sdpAnswer,candidateList) {
            if (success) {
                channelManager.registerChannel(channel);
                console.log('Register channel success', channel.id);
                ws.send(JSON.stringify({
                    id: 'publishResponse',
                    response: 'accepted',
                    channelId:channel.id,
                    publisherId:publisherId,
                    source:source,
                    sdpAnswer: sdpAnswer,
                    candidateList:candidateList
                }));
            } else {
                ws.send(JSON.stringify({
                    id: 'publishResponse',
                    response: 'rejected',
                    source:source,
                    publisherId:publisherId
                }));
            }
        })
    } catch (exc) {
        console.log('Publish error ', sessionId, publisherId);
    }
}

