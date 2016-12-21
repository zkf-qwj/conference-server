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
    many2many: function(wss) {
        wss.on('connection', function(ws) {
            var sessionId = nextUniqueId();
            console.log('Many2Many Connection received with sessionId ' + sessionId);
            ws.on('error', function(error) {
                console.log('Many2Many Connection ' + sessionId + ' error');
                stop(sessionId);
            });
            ws.on('close', function() {
                console.log('Many2Many Connection ' + sessionId + ' closed');
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
                console.log('Many2Many Connection ' + sessionId + ' received message ', message.id);
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
    for (var groupId in convManager.conversationById) {
        var conversation = convManager.conversationById[groupId];
        conversation.removePartyInSession(sessionId);
        if (Object.keys(conversation.partyById).length == 0) {
            convManager.releaseConversation(conversation.id)
        }
    }
    
}

function connect(ws,sessionId, groupId,partyId,sdpOffer,candidateList,bitrate) {
    try {
        convManager.getConversation(groupId,function(conversation) {
            var party = new Party(partyId,sessionId);
            conversation.registerParty(party);
            party.join(conversation,sdpOffer,candidateList,bitrate, function(success, sdpAnswer,candidateList) {
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

