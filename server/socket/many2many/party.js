var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');
var kurentoClient = null

function getHubport(hub,callback) {
    hub.createHubPort( function(error, _hubPort) {
        if (error) {
            console.log('Create Hubport  error',error);
            callback(null);
        }
        callback(_hubPort );
    });
}

function Party(id,sessionId)
{
    this.id = id;
    this.sessionId = sessionId;
    this.webRtcEndpoint = null;
    this.candidateSendQueue = [];
    this.sdpAnswer = null;
    this.port = null;
}



Party.prototype.release = function() {
    console.log("Release resoure for party" + this.id);
    if (this.webRtcEndpoint) 
        this.webRtcEndpoint.release();
    if (this.port) 
        this.port.release();
}


Party.prototype.join = function(conversation,sdpOffer,candidateList, bitrate,callback)
{
    var self = this;
    conversation.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint)
    {
        if (error)
        {
            console.log('Create WebRtcEndpoint for party' +self.id+' error',error);
            return callback(false);
        }
        self.webRtcEndpoint = webRtcEndpoint;
        self.candidateSendQueue = [];
        console.log('Channel offer',sdpOffer);
        getHubport(conversation.composite,function(port) {
            self.port = port;
            port.connect(webRtcEndpoint);
            webRtcEndpoint.connect(port);
            self.webRtcEndpoint.setMaxVideoRecvBandwidth(bitrate,function(error) {
                if (error)
                {
                    console.log('Set bitrate party' +self.id+' error',error);
                    return callback(false);
                }
                self.webRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Party'+self.id +' fail to process offer',error );
                        return callback(false);;
                    }
                    _.each(candidateList,function(_candidate) {
                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                        self.webRtcEndpoint.addIceCandidate(candidate);
                    });
                    webRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            console.log('Party'+self.id +' fail to gather candidate' );
                            return callback(false);;
                        }
                    });
                    webRtcEndpoint.on('OnIceCandidate', function(event)
                    {
                        console.log('Party  ' + self.id+': save local candidate', new Date());
                        self.candidateSendQueue.push(event.candidate);
                    });
                    webRtcEndpoint.on('OnIceGatheringDone', function(event)
                    {
                        console.log('Party'+self.id +' complete gather candidate' );
                        callback(true, sdpAnswer,self.candidateSendQueue);
                    });
                });
            });
        });   
    });
}



module.exports = Party