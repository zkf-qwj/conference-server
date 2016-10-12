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
    this.pubCandidateSendQueue =  [];
    this.subCandidateSendQueue = {};
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

RoomMember.prototype.readyToPublish = function()
{
    this.avail = true;
}

RoomMember.prototype.readyToSubscribe = function(publisher)
{
    publisher.pubWebRtcEndpoint.connect(this.subWebRtcEndpoint[publisher.id], function( error)
    {
        if (error)
        {
            console.log(error)
        } else
        console.log(
            'Connect WebRtcEndpoint for subscriber'+this.id +' publisher:' + publisher.id +' successfully'
        );
    });
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

RoomMember.prototype.leave = function() {
    console.log("Release resoure for user" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.pubWebRtcEndpoint) 
        this.pubWebRtcEndpoint.release();
    for (var key in this.subWebRtcEndpoint) 
        this.subWebRtcEndpoint[key].release();
}

RoomMember.prototype.publish = function(sdpOffer,candidateList, callback)
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
                    pipeline.release();
                    return callback(false);
                }
                self.pipeline = pipeline;
                self.pubWebRtcEndpoint = pubWebRtcEndpoint;
                self.pubCandidateSendQueue = [];
                pubWebRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                {
                    if (error)
                    {
                        console.log(error)
                        return callback(false);
                    }
                    console.log('Publisher ' + self.id+': respnse');
                    _.each(candidateList,function(_candidate) {
                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                        self.pubWebRtcEndpoint.addIceCandidate(candidate);
                    });
                    pubWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            return callback(false);
                        }
                    });
                    pubWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                    {
                        callback(true, sdpAnswer,self.pubCandidateSendQueue);
                    });
                    
                });
                pubWebRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Publisher  ' + self.id+': save local candidate', new Date());
                    self.pubCandidateSendQueue.push(event.candidate);
                });
            });
        });
    })
}
RoomMember.prototype.subscribe = function(publisher, sdpOffer, candidateList,callback)
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
            self.subWebRtcEndpoint[publisher.id] =  subWebRtcEndpoint;
           
            subWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
            {
                if (error)
                {
                    console.log(error)
                    return callback(false);
                }
                console.log('Process offer for subscriber'+self.id +' publisher:' + publisher.id +' successfully');
                _.each(candidateList,function(_candidate) {
                    var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                    self.subWebRtcEndpoint[publisher.id].addIceCandidate(candidate);
                });
                self.subCandidateSendQueue[publisher.id] = [];
                subWebRtcEndpoint.on('OnIceCandidate', function(event)
                {
                    console.log('Subscriber  ' + self.id+': save local candidate',new Date());
                    self.subCandidateSendQueue[publisher.id].push(event.candidate);
                });
                subWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                {
                    callback(true, sdpAnswer,self.subCandidateSendQueue[publisher.id]);
                });
                subWebRtcEndpoint.gatherCandidates(function(error)
                {
                    if (error)
                    {
                        console.log(error)
                        return callback(false);
                    }
                });
            });
        });
    })
}

module.exports = RoomMember