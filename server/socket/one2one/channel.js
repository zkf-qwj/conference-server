var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');
var kurentoClient = null
var channelId  = 0;

function nextChannelId() {
    channelId++;
    return channelId.toString();
}


function Channel(sessionId,publisherId,source)
{
    this.id = nextChannelId();
    this.publisherId = publisherId;
    this.source = source;
    this.sessionId = sessionId;
    this.pipeline = null;
    this.pubWebRtcEndpoint = null;
    this.sdpOffer = null;
    this.pubCandidateRecvQueue =  [];
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


Channel.prototype.connect = function(subscription,callback)
{
    this.pubWebRtcEndpoint.connect(subscription.subWebRtcEndpoint, function( error)
    {
        if (error)
        {
            console.log(error)
        } else
        console.log(
            'Connect WebRtcEndpoint for subscription'+subscription.id +' channel:' + this.id +' successfully');
            callback();
    });
}

Channel.prototype.release = function() {
    console.log("Release resoure for channel" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.pubWebRtcEndpoint) 
        this.pubWebRtcEndpoint.release();
}

Channel.prototype.publishCandidate = function(_candidate) {
	console.log('Channel ' + this.id +' process candiddate');
	var self = this;
	var candidate = kurento.getComplexType('IceCandidate')(_candidate);
	self.pubCandidateRecvQueue.push(candidate)
    if (self.sdpOffer && self.pubWebRtcEndpoint) {
        while(self.pubCandidateRecvQueue.length) {
            var candidate = self.pubCandidateRecvQueue.shift();
            self.pubWebRtcEndpoint.addIceCandidate(candidate);
        }
    }
}

Channel.prototype.publish = function(sdpOffer,bitrate, onPublishCandidate,onPublishResponse)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error',error);
            return onPublishResponse(false);
        }
        kurentoClient.create('MediaPipeline', function(error, pipeline)
        {
            if (error)
            {
                console.log('Create MediaPipeline error',error);
                return onPublishResponse(false);
            }
            pipeline.create('WebRtcEndpoint', function(error, pubWebRtcEndpoint)
            {
                if (error)
                {
                    console.log('Create WebRtcEndpoint for publisher' +self.id+' error',error);
                    return onPublishResponse(false);
                }
                self.pipeline = pipeline;
                self.pubWebRtcEndpoint = pubWebRtcEndpoint;
                self.pubWebRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Channel  ' + self.id+': save local candidate', new Date());
                    var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                    onPublishCandidate(candidate);
                });                    
                console.log('Channel offer',sdpOffer);
                    self.pubWebRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                    {
                        if (error)
                        {
                            console.log('Channel'+self.id +' fail to process offer',error );
                            return onPublishResponse(false);
                        }
                        self.sdpOffer = sdpOffer;
                        console.log('Channel'+self.id +' answer',sdpAnswer );
                        while(self.pubCandidateRecvQueue.length) {
                            var candidate = self.pubCandidateRecvQueue.shift();
                            self.pubWebRtcEndpoint.addIceCandidate(candidate);
                        }
                        self.pubWebRtcEndpoint.gatherCandidates(function(error)
                        {
                            if (error)
                            {
                                console.log(error)
                                return onPublishResponse(false);
                            }
                            console.log('Channel'+self.id +' start to gather candidate' );
                            onPublishResponse(true,sdpAnswer);
                        });
                        
                    });
            });
        });
    });
}



module.exports = Channel