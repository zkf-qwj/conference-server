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

Subscription.prototype.subscribeCandidate = function(_candidate) {
	console.log('Process candidate of subscription:', this.id);
	var self = this;
	var candidate = kurento.getComplexType('IceCandidate')(_candidate);
	self.subCandidateRecvQueue.push(candidate);
    if (self.sdpOffer && self.subWebRtcEndpoint) {
    	while(self.subCandidateRecvQueue.length) {
            var candidate = self.subCandidateRecvQueue.shift();
            self.subWebRtcEndpoint.addIceCandidate(candidate);
        }
    }
}

Subscription.prototype.subscribeOffer = function(channel, sdpOffer,bitrate,onSubscribeCandidate, onSubscribeResponse)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error');
            return onSubscribeResponse(false);
        }
        if (!channel.pipeline)
        {
            console.log('Channel not ready ' + channel.id);
            return onSubscribeResponse(false);
        }
        channel.pipeline.create('WebRtcEndpoint', function(error, subWebRtcEndpoint)
        {
            if (error)
            { 
                console.log('Create WebRtcEndpoint for subscription '+self.id +' channel:' + channel.id +' error');
                return onSubscribeResponse(false);
            }
            console.log('Create WebRtcEndpoint for subscription'+self.id +' channel:' + channel.id +' successfully');
            self.subWebRtcEndpoint =  subWebRtcEndpoint;
            self.subWebRtcEndpoint.on('OnIceCandidate', function(event)
                    {
                        console.log('Subscription  ' + self.id+': save local candidate',new Date());
                        var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                        onSubscribeCandidate(candidate);
                    });
                    self.subWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                    {
                        console.log('Subscription  ' + self.id+': complete gather candidate');
                        
                    });

                self.subWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Subscriber'+self.id +' fail to process offer , channel ',channel.id );
                        return onSubscribeResponse(false);;
                    }
                    console.log('Process offer for subscriber'+self.id +' channel:' + channel.id +' successfully');
                    self.sdpOffer =  sdpOffer;
                    while(self.subCandidateRecvQueue.length) {
                        var candidate = self.subCandidateRecvQueue.shift();
                        self.subWebRtcEndpoint.addIceCandidate(candidate);
                    }
                    self.subWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log('Subscriber'+self.id +' fail to gather candidate , channel ',channel.id ,error);
                            return onSubscribeResponse(false);
                        }
                        channel.connect(self,function() {
                        	onSubscribeResponse(true,sdpAnswer);
                        });
                        
                    });
                   
                });
            });
    })
}

module.exports = Subscription
