var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');
var channelId  = 0;

function nextChannelId() {
    channelId++;
    return channelId.toString();
}

function getKurentoClient(callback)
{
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            var message = 'Coult not find media server at address ' + argv.ws_uri;
            callback(null);
        } 
        else
            callback(_kurentoClient);
    });
}

function getMediaPipeline(kurentoClient,callback) {
    kurentoClient.create('MediaPipeline', function(error, _pipeline)
    {
        if (error)
        {
            console.log('Create MediaPipeline error',error);
            callback(null);
        }else
            callback(_pipeline);
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

function getDispatcherOne2many(pipeline,callback) {
    pipeline.create('DispatcherOneToMany', function(error, _dispatcher)
    {
        if (error)
        {
            console.log('Create DispatcherOneToMany  error',error);
            callback(null);
        } else
            callback(_dispatcher);
    });
}

function getHubport(hub,callback) {
    hub.createHubPort( function(error, _hubPort) {
        if (error) {
            console.log('Create Hubport  error',error);
            callback(null);
        }
        callback(_hubPort );
    });
}

function Channel(sessionId,publisherId,source)
{
    this.id = nextChannelId();
    this.publisherId = publisherId;
    this.source = source;
    this.sessionId = sessionId;
    this.kurentoClient = null;
    this.pipeline = null;
    this.dispatcher = null;
    this.sourcePort = null;
    this.pubWebRtcEndpoint = null;
    this.pubCandidateSendQueue =  [];
    this.sdpAnswer = null;
}

Channel.prototype.connect = function(subscription)
{
    var self = this;
    getHubport(self.dispatcher,function (port) {
        if (port)
        {
            port.connect(subscription.subWebRtcEndpoint);
        }           
    });
  
}

Channel.prototype.release = function() {
    console.log("Release resoure for channel" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.dispatcher) 
        this.dispatcher.release();
    if (this.pubWebRtcEndpoint) 
        this.pubWebRtcEndpoint.release();
}

Channel.prototype.publish = function(sdpOffer,candidateList, bitrate,callback)
{
    var self = this;
    getKurentoClient(function( kurentoClient)
    {
        if (!kurentoClient)
            return callback(false);
        self.kurentoClient = kurentoClient;
        getMediaPipeline(kurentoClient, function( pipeline)
        {
            if (!pipeline)
                return callback(false);
            self.pipeline = pipeline;
            getDispatcherOne2many(pipeline,function (dispatcher)
            {
                if (!dispatcher)
                    return callback(false);
                self.dispatcher = dispatcher;
                getHubport(dispatcher,function (port) {
                    if (!port)
                        return callback(false);
                    self.sourcePort = port;
                    dispatcher.setSource(port,function(error) {
                        if (error) {
                            console.log('Cannot set source for dispatcher');
                            return callback(false);
                        }
                        getWebRtcEndpoint(pipeline,function(webRtcEndpoint) {
                            if (!webRtcEndpoint)
                                return callback(false);
                            webRtcEndpoint.connect(port);
                            self.pubWebRtcEndpoint = webRtcEndpoint;
                            self.pubCandidateSendQueue = [];
                            webRtcEndpoint.setMaxVideoRecvBandwidth(bitrate,function(error) {
                                if (error)
                                {
                                    console.log('Set bitrate publisher' +self.id+' error',error);
                                    return callback(false);
                                }
                                webRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                                {
                                    if (error)
                                    {
                                        console.log('Channel'+self.id +' fail to process offer',error );
                                        return callback(false);;
                                    }
                                    self.sdpAnswer = sdpAnswer;
                                    _.each(candidateList,function(_candidate) {
                                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                                        webRtcEndpoint.addIceCandidate(candidate);
                                    });
                                    
                                });
                                webRtcEndpoint.gatherCandidates(function(error)
                                {
                                    if (error)
                                    {
                                        console.log(error)
                                        console.log('Channel'+self.id +' fail to gather candidate' );
                                        return callback(false);;
                                    }
                                });
                                webRtcEndpoint.on('OnIceCandidate', function(event)
                                {
                                    console.log('Channel  ' + self.id+': save local candidate', new Date());
                                    self.pubCandidateSendQueue.push(event.candidate);
                                });
                                webRtcEndpoint.on('OnIceGatheringDone', function(event)
                                {
                                    console.log('Channel'+self.id +' complete gather candidate' );
                                    callback(true, self.sdpAnswer,self.pubCandidateSendQueue);
                                });
                            });
                        });
                    });
                    
                });
            });
        });
    });     
}



module.exports = Channel