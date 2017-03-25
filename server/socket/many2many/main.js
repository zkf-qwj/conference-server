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
                	case 'bind':
                		partyBind(ws,sessionId,message.groupId,message.partyId);
                		break;
                    case 'offer':
                    	partyOffer(ws,sessionId,message.groupId,message.partyId,message.sdpOffer,message.bitrate);
                        break;
                    case 'candidate':
                    	partyCandidate(ws,sessionId,message.groupId,message.partyId,message.candidate);
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

function partyBind(ws,sessionId,groupId,partyId) {
	try {
			convManager.getConversation(groupId,function(conversation) {
			var party = conversation.getPartyById(partyId);
			if (party) {
				party.release();
				conversation.removeParty(partyId);
			}
			var party = new Party(partyId,sessionId);
            conversation.registerParty(party);
            ws.send(JSON.stringify({
                id: 'bindResponse'
            }));
		});        
    } catch (exc) {
        console.log('Party bind error ',exc, groupId, partyId);
    }
}

function partyCandidate(ws,sessionId,groupId,partyId,candidate) {
	try {
			convManager.getConversation(groupId,function(conversation) {
			var party = conversation.getPartyById(partyId);
			party.sendCandidate(candidate);
		});        
    } catch (exc) {
        console.log('Party candidate error ',exc, groupId, partyId);
    }
}

function partyOffer(ws,sessionId, groupId,partyId,sdpOffer,bitrate) {
    try {
        	convManager.getConversation(groupId,function(conversation) {
        	var party = conversation.getPartyById(partyId);
            var onConnectResponse = function(success, sdpAnswer) {
            	if (success) {
                    ws.send(JSON.stringify({
                        id: 'offerAnswer',
                        sdpAnswer: sdpAnswer,
                    }));
                } 
            }
            var onConnectCandidate =  function(candidate) {
                ws.send(JSON.stringify({
                    id: 'candidate',
                    candidate:candidate
                }));
            }
            party.sendOffer(conversation,sdpOffer,bitrate, onConnectResponse,onConnectCandidate);
        });
       
    } catch (exc) {
        console.log('Connect error ', sessionId, partyId);
    }
}

