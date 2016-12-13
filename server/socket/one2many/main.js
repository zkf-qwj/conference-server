var ws = require('ws');
var minimist = require('minimist');
var url = require('url');
var config = require('../../config/environment');
var _ = require('underscore');
var Channel = require('./channel');
var Subscription = require('./subscription');
var ChannelManager = require('./channel_manager');
var SubscriptionManager = require('./subscription_manager');
var channelManager = new ChannelManager();
var subscriptionManager = new SubscriptionManager();
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
                console.log('One2Many Connection ' + sessionId + ' received message ', message.id);
                switch (message.id) {
                    case 'publish':
                        publish(ws,sessionId,message.publisherId,message.source,message.sdpOffer,message.candidateList,message.bitrate);
                        break;
                    case 'subscribe':
                        subscribe(ws,sessionId,message.channelId, message.sdpOffer,message.candidateList,message.bitrate);
                        break;
                    case 'unpublish':
                        unpublish(message.channelId);
                        break;
                    case 'unpublishAll':
                        unpublishAll(sessionId);
                        break;
                    case 'unsubscribe':
                        unsubscribe(message.subId);
                        break;
                    case 'unsubscribeAll':
                        unsubscribeAll(sessionId);
                        break;
                    case 'connect':
                        connect(message.channelId,message.subscriptionId);
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

function unpublish(channelId) {
    channelManager.releaseChannel(channelId);
}

function unpublishAll(sessionId) {
    channelManager.releaseChannelInSession(sessionId);
}

function unsubscribe(subId) {
    subscriptionManager.releaseSub(subId);
}

function unsubscribeAll(sessionId) {
    subscriptionManager.releaseSubInSession(sessionId);
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

function subscribe(ws,sessionId,channelId, sdpOffer,candidateList,bitrate) {
    try {
        var subscription = new Subscription(sessionId);
        var channel = channelManager.getChannelById(channelId);
        subscription.subscribe(channel, sdpOffer, candidateList,bitrate,function(success, sdpAnswer,candidateList) {
            if (success) {
                subscriptionManager.registerSub(subscription);
                ws.send(JSON.stringify( {
                    id: 'subscribeResponse',
                    response: 'accepted',
                    channelId: channelId,
                    subscriptionId: subscription.id,
                    sdpAnswer: sdpAnswer,
                    candidateList:candidateList
                }));
            } else {
                ws.send(JSON.stringify( {
                    id: 'subscribeResponse',
                    response: 'rejected',
                    channelId: channelId
                }));
            }
        })
    } catch (exc) {
        console.log('Subscribe error ', sessionId, channelId);
    }
}

function connect(channelId, subId) {
    try {
        var channel = channelManager.getChannelById(channelId);
        var subscription = subscriptionManager.getSubById(subId);
        channel.connect(subscription);
    } catch (exc) {
        console.log('Connect error ', channelId, subId);
    }
}
