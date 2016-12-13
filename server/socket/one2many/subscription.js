var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');

var subcriptionlId  = 0;

function nextSubscriptionId() {
    subcriptionlId++;
    return subcriptionlId.toString();
}

function getKurentoClient(callback)
{
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            console.log( 'Coult not find media server at address ' + argv.ws_uri);
            callback(null);
        } 
        else
            callback(_kurentoClient);
    });
}

function getWebRtcEndpoint(pipeline,callback) {
    pipeline.create('WebRtcEndpoint', function(error, _webRtcEndpoint)
    {
        if (error)
        {
            console.log('Create WebRtcEndpoint  error',error);
            callback(null);
        } else
            callback(_webRtcEndpoint);
    });
}


function Subscription()
{
    this.id = nextSubscriptionId();
    this.subCandidateSendQueue = [];
    this.subWebRtcEndpoint = null;
    this.kurentoClient = null;
    this.sdpAnswer = null;
}

Subscription.prototype.release = function() {
    console.log("Release resoure for subscription" + this.id);
    if (this.subWebRtcEndpoint) 
        this.subWebRtcEndpoint.release();
}


Subscription.prototype.subscribe = function(channel, sdpOffer, candidateList,bitrate,callback)
{
    var self = this;
    getKurentoClient(function( kurentoClient)
    {
        if (!kurentoClient)
        {
            return callback(false);
        }
        self.kurentoClient =  kurentoClient;
        if (!channel.pipeline)
        {
            console.log(channel);
            console.log('Channel not ready ' + channel.id);
            return callback(false);
        }
        getWebRtcEndpoint(channel.pipeline,function(webRtcEndpoint) {
            if (!webRtcEndpoint)
            { 
                return callback(false);
            }
            console.log('Create WebRtcEndpoint for subscription'+self.id +' channel:' + channel.id +' successfully');
            self.subWebRtcEndpoint =  webRtcEndpoint;
            webRtcEndpoint.setMaxVideoSendBandwidth(bitrate,function(error) {
                if (error)
                { 
                    console.log('Set bitrate for subscription '+self.id +' channel:' + channel.id +' error');
                    return callback(false);
                }
                webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Subscriber'+self.id +' fail to process offer , channel ',channel.id );
                        console.log(error)
                        return callback(false);;
                    }
                    self.sdpAnswer = sdpAnswer;
                    console.log('Process offer for subscriber'+self.id +' channel:' + channel.id +' successfully');
                    _.each(candidateList,function(_candidate) {
                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                        webRtcEndpoint.addIceCandidate(candidate);
                    });
                    self.subCandidateSendQueue = [];
                    
                });
                webRtcEndpoint.gatherCandidates(function(error)
                {
                    if (error)
                    {
                        console.log(error)
                        console.log('Subscriber'+self.id +' fail to gather candidate , channel ',channel.id );
                        return callback(false);
                    }
                });
                webRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Subscription  ' + self.id+': save local candidate',new Date());
                    self.subCandidateSendQueue.push(event.candidate);
                });
                webRtcEndpoint.on('OnIceGatheringDone', function(event)
                {
                    console.log('Subscription  ' + self.id+': complete gather candidate');
                    callback(true, self.sdpAnswer,self.subCandidateSendQueue);
                });
            });
        });
    })
}

module.exports = Subscription
