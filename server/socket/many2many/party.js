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
    this.candidateRecvQueue = [];
    this.sdpOffer = null;
    this.port = null;
}

Party.prototype.sendCandidate = function(_candidate) {
	console.log('Party ' + this.id +' process candiddate');
	var self = this;
	var candidate = kurento.getComplexType('IceCandidate')(_candidate);
	self.candidateRecvQueue.push(candidate)
    if (this.sdpOffer && this.webRtcEndpoint) {
        while(this.webRtcEndpoint.length) {
            var candidate = this.candidateRecvQueue.shift();
            this.webRtcEndpoint.addIceCandidate(candidate);
        }
    }
}

Party.prototype.release = function() {
    console.log("Release resoure for party" + this.id);
    if (this.webRtcEndpoint) 
        this.webRtcEndpoint.release();
    if (this.port) 
        this.port.release();
}


Party.prototype.sendOffer = function(conversation,sdpOffer,bitrate, onConnectResponse,onConnectCandidate)
{
    var self = this;
    conversation.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint)
    {
        if (error)
        {
            console.log('Create WebRtcEndpoint for party' +self.id+' error',error);
            return onConnectResponse(false);
        }
        self.webRtcEndpoint = webRtcEndpoint;
        self.webRtcEndpoint.on('OnIceCandidate', function(event)
        {
            console.log('Party  ' + self.id+': save local candidate', new Date());
            onConnectCandidate(event.candidate);
        });
        console.log('Channel offer',sdpOffer);
        getHubport(conversation.composite,function(port) {
            self.port = port;
            self.port.connect(self.webRtcEndpoint);
            self.webRtcEndpoint.connect(port);
            self.webRtcEndpoint.setMaxVideoRecvBandwidth(bitrate,function(error) {
                if (error)
                {
                    console.log('Set bitrate party' +self.id+' error',error);
                    return onConnectResponse(false);
                }
                self.webRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Party'+self.id +' fail to process offer',error );
                        return onConnectResponse(false);;
                    }
                    self.sdpOffer =  sdpOffer;
                    while(self.candidateRecvQueue.length) {
                        self.webRtcEndpoint.addIceCandidate(self.candidateRecvQueue.shift());
                    };
                    self.webRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log('Party'+self.id +' fail to gather candidate',error );
                            return onConnectResponse(false);;
                        }
                        onConnectResponse(true,sdpAnswer);
                    });
                });
            });
        });   
    });
}



module.exports = Party