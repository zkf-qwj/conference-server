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
    one2one: function(wss) {
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
                    case 'publishOffer':
                        publishOffer(ws,sessionId,message.channelId,message.sdpOffer,message.bitrate);
                        break;
                    case 'publishBind':
                        publishBind(ws,sessionId,message.publisherId,message.source);
                        break;
                    case 'publishCandidate':
                        publishCandidate(ws,sessionId,message.channelId,message.candidate);
                        break;
                    case 'subscribeOffer':
                        subscribeOffer(ws,sessionId,message.subscriptionId, message.sdpOffer,message.bitrate);
                        break;
                    case 'subscribeCandidate':
                        subscribeCandidate(ws,sessionId,message.subscriptionId,message.candidate);
                        break;
                    case 'subscribeBind':
                        subscribeBind(ws,sessionId,message.channelId,message.subscriberId);
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
                    case 'stop':
                        stop(sessionId);
                        break;
                    default:
                        console.log(message);
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

function publishBind(ws,sessionId, publisherId,source) {
    var channel = new Channel(sessionId,publisherId,source);
    channelManager.registerChannel(channel);
    console.log('Register channel success', channel.id);
    ws.send(JSON.stringify({
        id: 'publishBind',
        channelId:channel.id,
        publisherId:publisherId,
        source:source
    }));
}

function publishOffer(ws,sessionId, channelId,sdpOffer,bitrate) {
    try {
        var channel = channelManager.getChannelById(channelId);
        var onPublishComplete =  function() {
            ws.send(JSON.stringify({
                id: 'publishComplete',
                channelId:channel.id,
                publisherId:channel.publisherId,
                source:channel.source
            }));
        }
        var onPublishCandidate =  function(candidate) {
            ws.send(JSON.stringify({
                id: 'publishCandidate',
                channelId:channel.id,
                publisherId:channel.publisherId,
                source:channel.source,
                candidate:candidate
            }));
        }
        var onPublishResponse = function(success, sdpAnswer) {
            if (success) {
                ws.send(JSON.stringify({
                    id: 'publishAnswer',
                    channelId:channel.id,
                    publisherId:channel.publisherId,
                    source:channel.source,
                    sdpAnswer: sdpAnswer
                }));
            } 
        };
        channel.publish(sdpOffer,bitrate,onPublishComplete, onPublishCandidate,onPublishResponse);
        
    } catch (exc) {
        console.log('Publish offer error ',exc, sessionId, channelId);
    }
}


function publishCandidate(ws,sessionId, channelId,candidate) {
    try {
        var channel = channelManager.getChannelById(channelId);
        channel.publishCandidate(candidate);
        
    } catch (exc) {
        console.log('Publish candidate error ',exc, sessionId, channelId);
    }
}

function subscribeBind(ws,sessionId, channelId,subscriberId) {
    var subscription = new Subscription(channelId,subscriberId);
    subscriptionManager.registerSub(subscription);
    console.log('Register Sub success', subscription.id);
    ws.send(JSON.stringify({
        id: 'subscribeBind',
        channelId:channelId,
        subscriptionId:subscription.id,
    }));
}

function subscribeOffer(ws,sessionId,subscriptionId, sdpOffer,bitrate) {
    try {
        var subscription = subscriptionManager.getSubById(subscriptionId);
        var channel = channelManager.getChannelById(subscription.channelId);
        var onSubscribeComplete =  function() {
            ws.send(JSON.stringify({
                id: 'subscribeComplete',
                channelId:subscription.channelId,
                subscriptionId: subscription.id
            }));
        }
        var onSubscribeCandidate =  function(candidate) {
            ws.send(JSON.stringify({
                id: 'subscribeCandidate',
                channelId:subscription.channelId,
                subscriptionId: subscription.id,
                candidate:candidate
            }));
        }
        var onSubscribeResponse = function(success, sdpAnswer) {
            if (success) {
                ws.send(JSON.stringify({
                    id: 'subscribeAnswer',
                    channelId:subscription.channelId,
                    subscriptionId: subscription.id,
                    sdpAnswer: sdpAnswer
                }));
            } 
        };
        subscription.subscribeOffer(channel, sdpOffer,bitrate,onSubscribeComplete,onSubscribeCandidate, onSubscribeResponse); 
        
    } catch (exc) {
        console.log('Subscribe offer error ', exc,sessionId, channelId,subscriberId);
    }
}

function subscribeCandidate(ws,sessionId, subscriptionId,candidate) {
    try {
        var subscription = subscriptionManager.getSubById(subscriptionId);
        subscription.subscribeCandidate(candidate);
        
    } catch (exc) {
        console.log('Subscribe candidate error ',exc, sessionId, subscriptionId);
    }
}



