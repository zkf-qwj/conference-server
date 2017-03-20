var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');

var kurentoClient = null
var subcriptionlId  = 0;

function nextSubscriptionId() {
    subcriptionlId++;
    return subcriptionlId.toString();
}


function Subscription(channelId,subscriberId)
{
    this.id = nextSubscriptionId();
    this.channelId = channelId;
    this.subscriberId = subscriberId;
    this.subCandidateRecvQueue = [];
    this.subWebRtcEndpoint = null;
    this.sdpOffer = null;
}

Subscription.prototype.release = function() {
    console.log("Release resoure for subscription" + this.id);
    if (this.subWebRtcEndpoint) 
        this.subWebRtcEndpoint.release();
}

function getKurentoClient(callback)
{
    if (kurentoClient !== null)
    {
        console.log('Reuse existing client');
        return callback(null, kurentoClient);
    }
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            var message = 'Coult not find media server at address ' + argv.ws_uri;
            return callback(message + ". Exiting with error " + error);
        }
        console.log('Create new client');
        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

Subscription.prototype.subscribeCandidate = function(candidate) {
    this.subCandidateRecvQueue.push(candidate)
    if (this.sdpOffer) {
        console.log('Process candidate');
        _.each(this.subCandidateRecvQueue,function(_candidate) {
            var kurentoCandidate = kurento.getComplexType('IceCandidate')(_candidate);
            this.subWebRtcEndpoint.addIceCandidate(kurentoCandidate);
        });
        self.subCandidateRecvQueue = [];
    }
}

Subscription.prototype.subscribeOffer = function(channel, sdpOffer,bitrate,onSubscribeComplete,onSubscribeCandidate, onSubscribeResponse)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error');
            return callback(false);
        }
        if (!channel.pipeline)
        {
            console.log(channel);
            console.log('Channel not ready ' + channel.id);
            return callback(false);
        }
        channel.pipeline.create('WebRtcEndpoint', function(error, subWebRtcEndpoint)
        {
            if (error)
            { 
                console.log('Create WebRtcEndpoint for subscription '+self.id +' channel:' + channel.id +' error');
                return callback(false);
            }
            console.log('Create WebRtcEndpoint for subscription'+self.id +' channel:' + channel.id +' successfully');
            self.subWebRtcEndpoint =  subWebRtcEndpoint;
            
            self.subWebRtcEndpoint.setMaxVideoSendBandwidth(bitrate,function(error) {
                if (error)
                { 
                    console.log('Set bitrate for subscription '+self.id +' channel:' + channel.id +' error');
                    return callback(false);
                }
                subWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Subscriber'+self.id +' fail to process offer , channel ',channel.id );
                        console.log(error)
                        return callback(false);;
                    }
                    console.log('Process offer for subscriber'+self.id +' channel:' + channel.id +' successfully');
                    self.sdpOffer =  sdpOffer;
                    onSubscribeResponse(true,sdpAnswer);
                    _.each(self.subCandidateRecvQueue,function(_candidate) {
                        console.log('Process candidate');
                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                        self.subWebRtcEndpoint.addIceCandidate(candidate);
                    });
                    self.subCandidateRecvQueue = [];
                    subWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            console.log('Subscriber'+self.id +' fail to gather candidate , channel ',channel.id );
                            return callback(false);
                        }
                    });
                    subWebRtcEndpoint.on('OnIceCandidate', function(event)
                    {
                        console.log('Subscription  ' + self.id+': save local candidate',new Date());
                        onSubscribeCandidate(event.candidate);
                    });
                    subWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                    {
                        console.log('Subscription  ' + self.id+': complete gather candidate');
                        channel.connect(self,onSubscribeComplete);
                    });
                });
            });
        });
    })
}

module.exports = Subscription
