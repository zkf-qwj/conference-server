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
    this.pubCandidateSendQueue =  [];
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


Channel.prototype.connect = function(subscription)
{
    this.pubWebRtcEndpoint.connect(subscription.subWebRtcEndpoint, function( error)
    {
        if (error)
        {
            console.log(error)
        } else
        console.log(
            'Connect WebRtcEndpoint for subscription'+subscription.id +' channel:' + this.id +' successfully'
        );
    });
}

Channel.prototype.release = function() {
    console.log("Release resoure for channel" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.pubWebRtcEndpoint) 
        this.pubWebRtcEndpoint.release();
}

Channel.prototype.publish = function(sdpOffer,candidateList, bitrate,callback)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error',error);
            return callback(false);
        }
        kurentoClient.create('MediaPipeline', function(error, pipeline)
        {
            if (error)
            {
                console.log('Create MediaPipeline error',error);
                return callback(false);
            }
            pipeline.create('WebRtcEndpoint', function(error, pubWebRtcEndpoint)
            {
                if (error)
                {
                    console.log('Create WebRtcEndpoint for publisher' +self.id+' error',error);
                    return callback(false);
                }
                self.pipeline = pipeline;
                self.pubWebRtcEndpoint = pubWebRtcEndpoint;
                self.pubCandidateSendQueue = [];
                console.log('Channel offer',sdpOffer);
                self.pubWebRtcEndpoint.setMaxVideoRecvBandwidth(bitrate,function(error) {
                    if (error)
                    {
                        console.log('Set bitrate publisher' +self.id+' error',error);
                        return callback(false);
                    }
                    self.pubWebRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                    {
                        if (error)
                        {
                            console.log('Channel'+self.id +' fail to process offer',error );
                            return callback(false);;
                        }
                        _.each(candidateList,function(_candidate) {
                            var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                            self.pubWebRtcEndpoint.addIceCandidate(candidate);
                        });
                        pubWebRtcEndpoint.gatherCandidates(function(error)
                        {
                            if (error)
                            {
                                console.log(error)
                                console.log('Channel'+self.id +' fail to gather candidate' );
                                return callback(false);;
                            }
                        });
                    });
                });
                pubWebRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Channel  ' + self.id+': save local candidate', new Date());
                    self.pubCandidateSendQueue.push(event.candidate);
                });
                pubWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                {
                    console.log('Channel'+self.id +' complete gather candidate' );
                    callback(true, sdpAnswer,self.pubCandidateSendQueue);
                });
            });
        });
    });
}



module.exports = Channel