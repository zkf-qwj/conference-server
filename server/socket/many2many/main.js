var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var Conversation = require('./conversation');
var Party = require('./party');
var ConversationManager = require('./conversation_manager');
var convManager = new ConversationManager();
var convMap = {};

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
                    case 'connect':
                        connect(ws,sessionId,message.groupId,message.partyId,message.sdpOffer,message.candidateList,message.bitrate);
                        break;
                    case 'disconnect':
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
    var conversation = convMap[sessionId];
    if (conversation) {
        conversation.removePartyInSession(sessionId);
        if (conversation.partyById.length==0)
            convManager.releaseConversation(conversation.id)
    }
}

function connect(ws,sessionId, groupId,partyId,sdpOffer,candidateList,bitrate) {
    try {
        convManager.getConversation(groupId,function(conversation) {
            convMap[sessionId] = conversation;
            var party = new Party(partyId,sessionId);
            party.join(sdpOffer,candidateList,bitrate, function(success, sdpAnswer,candidateList) {
                if (success) {
                    ws.send(JSON.stringify({
                        id: 'connectResponse',
                        response: 'accepted',
                        sdpAnswer: sdpAnswer,
                        candidateList:candidateList
                    }));
                } else {
                    ws.send(JSON.stringify({
                        id: 'connectResponse',
                        response: 'rejected',
                    }));
                }
            })
        });
       
    } catch (exc) {
        console.log('Connect error ', sessionId, partyId);
    }
}

