var kurento = require('kurento-client');
var config = require('../config/environment');
var _ = require('underscore');
var kurentoClient = null;

function getKurentoClient(callback)
{
    if (kurentoClient !== null)
    {
        return callback(null, kurentoClient);
    }
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            var message = 'Coult not find media server at address ' + argv.ws_uri;
            return callback(message + ". Exiting with error " + error);
        }
        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function resetKurentoClient() {
    kurentoClient = null;
}

function RoomMember(id,profile, ws,room)
{
    this.id = id;
    this.ws = ws;
    this.room = room;
    this.avail = false;
    this.profile = profile;
    if (this.profile.role == 'presenter') 
        this.invited = true;
    else this.invited = false;
    this.pipeline = null;
    this.pubWebRtcEndpoint = null;
    this.pubCandidateQueue = [];
    this.subCandidateQueue = {};
    this.subWebRtcEndpoint = {};
}


RoomMember.prototype.sendMessage = function(message)
{
    try
    {
        this.ws.send(JSON.stringify(message));
    }
    catch (exception)
    {
        console.log('Fail to send message', this.id, message,exception);
    }
}

RoomMember.prototype.deviceReady = function(message)
{
    this.avail = true;
}

RoomMember.prototype.raiseHand =  function() {
    var moderator = this.room.moderator(); 
    if (moderator) {
            moderator.sendMessage(  {
                id: 'handUp',
                memberId: this.id
            });       
    }
}

RoomMember.prototype.lowHand =  function() {
    var moderator = this.room.moderator(); 
    if (moderator) {
            moderator.sendMessage( {
                id: 'handDown',
                memberId: this.id
            });
        }
}

RoomMember.prototype.onDiscussion =  function() {
    this.invited = true;
}

RoomMember.prototype.offDiscussion =  function() {
    this.invited = false;
}

RoomMember.prototype.onPublishIceCandidate =function( _candidate)
{
    var candidate = kurento.getComplexType('IceCandidate')(_candidate);
    console.log('Save ice candidate publisher:' + this.id );
    if (this.pipeline && this.pubWebRtcEndpoint)
    {
        this.pubWebRtcEndpoint.addIceCandidate(candidate);
    }
    else
    {
        this.pubCandidateQueue.push(candidate);
    }
}

RoomMember.prototype.onSubscribeIceCandidate= function(publisher, _candidate)
{
    var candidate = kurento.getComplexType('IceCandidate')(_candidate);
    console.log('Save ice candidate subscriber '+this.id +' publisher:' + publisher.id );
    if (publisher.pipeline && this.subWebRtcEndpoint[publisher.id])
    {
        this.subWebRtcEndpoint[publisher.id].addIceCandidate(candidate);
    }
    else
    {
        if (!this.subCandidateQueue[publisher.id]) 
            this.subCandidateQueue[publisher.id] = [];
        this.subCandidateQueue[publisher.id].push(candidate);
    }
}

RoomMember.prototype.leave = function() {
    console.log("Release resoure for user" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.pubWebRtcEndpoint) 
        this.pubWebRtcEndpoint.release();
    for (var key in this.subWebRtcEndpoint) 
        this.subWebRtcEndpoint[key].release();
}

RoomMember.prototype.publish = function(sdpOffer, callback)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error');
            resetKurentoClient();
            return callback(false);
        }
        kurentoClient.create('MediaPipeline', function(error, pipeline)
        {
            if (error)
            {
                console.log('Create MediaPipeline error');
                resetKurentoClient();
                return callback(false);
            }
            pipeline.create('WebRtcEndpoint', function(error, pubWebRtcEndpoint)
            {
                if (error)
                {
                    console.log('Create WebRtcEndpoint for publisher' +self.id+' error');
                    resetKurentoClient();
                    pipeline.release();
                    return callback(false);
                }
                _.each(self.candidatesQueue, function(candidate)
                {
                    pubWebRtcEndpoint.addIceCandidate(candidate);
                });
                self.pubCandidateQueue = [];
                console.log('Publisher ' + self.id+': clear candidate')
                pubWebRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Remote WebRtcEndpoint of publisher'+self.id +' flush candidate');
                    var candidate = kurento.getComplexType('IceCandidate')
                        (event.candidate);
                    self.sendMessage( { id: 'onPublishIceCandidateResponse',
                        candidate: candidate
                    });
                });
                pubWebRtcEndpoint.processOffer(sdpOffer, function(error,
                    sdpAnswer)
                {
                    if (error)
                    {
                        console.log(error)
                        return callback(false);
                    }
                    pubWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            return callback(false);
                        }
                    });
                    callback(true, sdpAnswer);
                    self.pipeline = pipeline;
                    self.pubWebRtcEndpoint = pubWebRtcEndpoint;
                });
            });
        });
    })
}
RoomMember.prototype.subscribe = function(publisher, sdpOffer, callback)
{
    var self = this;
    getKurentoClient(function(error, kurentoClient)
    {
        if (error)
        {
            console.log('Create Kurento Client error');
            return callback(false);
        }
        if (!publisher.pipeline)
        {
            console.log(publisher);
            console.log('Publisher not ready ' + publisher.id);
            return callback(false);
        }
        publisher.pipeline.create('WebRtcEndpoint', function(error, subWebRtcEndpoint)
        {
            if (error)
            { 
                console.log('Create WebRtcEndpoint for subscriber '+self.id +' publisher:' + publisher.id +' error');
                return callback(false);
            }
            console.log('Create WebRtcEndpoint for subscriber'+self.id +' publisher:' + publisher.id +' successfully');
           
            subWebRtcEndpoint.on('OnIceCandidate', function(event)
            {
                var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                console.log('Remote WebRtcEndpoint of subscriber'+self.id +' flush candidate');
                self.sendMessage( { id: 'onSubscribeIceCandidateResponse',
                    candidate: candidate,
                    pubId: publisher.id
                });
               
            });
            subWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
            {
                if (error)
                {
                    console.log(error)
                    return callback(false);
                }
                console.log('Process offer for subscriber'+self.id +' publisher:' + publisher.id +' successfully');
                publisher.pubWebRtcEndpoint.connect(subWebRtcEndpoint, function(
                    error)
                {
                    if (error)
                    {
                        console.log(error)
                        return callback(false);
                    }
                    console.log(
                        'Connect WebRtcEndpoint for subscriber'+self.id +' publisher:' + publisher.id +' successfully'
                    );
                    callback(true, sdpAnswer);
                    
                    subWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            return callback(false);
                        }
                    });
                    _.each(self.subCandidateQueue[publisher.id], function(candidate)
                            {
                                subWebRtcEndpoint.addIceCandidate(candidate);
                            });
                        self.subCandidateQueue[publisher.id] = [];
                        self.subWebRtcEndpoint[publisher.id] =  subWebRtcEndpoint;
                        console.log('Subscriber  ' + self.id+': clear candidate on publisher:'+publisher.id )
                });
            });
        });
    })
}

module.exports = RoomMember