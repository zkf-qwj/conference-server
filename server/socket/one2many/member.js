var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');


function RoomMember(id,profile, ws,room)
{
    this.id = id;
    this.ws = ws;
    this.room = room;
    this.avail = false;
    this.screenAvail = false;
    this.profile = profile;
    if (this.profile.role == 'presenter') 
        this.invited = true;
    else this.invited = false;
    this.pipeline = null;
    this.pubWebRtcEndpoint = null;
    this.pubCandidateSendQueue =  [];
    this.subCandidateSendQueue = {};
    this.subWebRtcEndpoint = {};
    this.kurentoClient = null;
    this.screenPipeline = null;
    this.screenWebRtcEndpoint = null;
    this.screenCandidateSendQueue =  [];
}


RoomMember.prototype.getKurentoClient = function (callback)
{
    var self = this;
    if (self.kurentoClient !== null)
    {
        console.log('Reuse existing client');
        return callback(null, self.kurentoClient);
    }
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            var message = 'Coult not find media server at address ' + argv.ws_uri;
            return callback(message + ". Exiting with error " + error);
        }
        console.log('Create new client');
        self.kurentoClient = _kurentoClient;
        callback(null, self.kurentoClient);
    });
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

RoomMember.prototype.readyToPublishScreen = function()
{
    this.screenAvail = true;
}

RoomMember.prototype.notReadyToPublishScreen = function()
{
    this.screenAvail = false;
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


RoomMember.prototype.readyToSubscribeScreen = function(publisher)
{
    publisher.screenWebRtcEndpoint.connect(this.screenWebRtcEndpoint, function( error)
    {
        if (error)
        {
            console.log(error)
        } else
        console.log(
            'Connect WebRtcEndpoint for screen subscriber'+this.id +' publisher:' + publisher.id +' successfully'
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
    if (this.screenPipeline) 
        this.screenPipeline.release();
    if (this.screenWebRtcEndpoint) 
        this.screenWebRtcEndpoint.release();
}

RoomMember.prototype.publish = function(sdpOffer,candidateList, callback)
{
    var self = this;
        this.getKurentoClient(function(error, kurentoClient)
        {
            if (error)
            {
                console.log('Create Kurento Client error');
                return callback(false);
            }
            kurentoClient.create('MediaPipeline', function(error, pipeline)
            {
                if (error)
                {
                    console.log('Create MediaPipeline error');
                    return callback(false);
                }
                pipeline.create('WebRtcEndpoint', function(error, pubWebRtcEndpoint)
                {
                    if (error)
                    {
                        console.log('Create WebRtcEndpoint for publisher' +self.id+' error');
                        return callback(false);
                    }
                    self.pipeline = pipeline;
                    self.pubWebRtcEndpoint = pubWebRtcEndpoint;
                    self.pubCandidateSendQueue = [];
                    console.log('publisher offer',sdpOffer);
                    self.pubWebRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                    {
                        if (error)
                        {
                            console.log(error)
                            console.log('Publisher'+self.id +' fail to process offer' );
                            return callback(false);;
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
                                console.log('Publisher'+self.id +' fail to gather candidate' );
                                return callback(false);;
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
        });
  
}


RoomMember.prototype.publishScreen = function(sdpOffer,candidateList, callback)
{
    var self = this;
        this.getKurentoClient(function(error, kurentoClient)
        {
            if (error)
            {
                console.log('Create Kurento Client error');
                return callback(false);
            }
            kurentoClient.create('MediaPipeline', function(error, pipeline)
            {
                if (error)
                {
                    console.log('Create MediaPipeline error');
                    return callback(false);
                }
                pipeline.create('WebRtcEndpoint', function(error, screenWebRtcEndpoint)
                {
                    if (error)
                    {
                        console.log('Create WebRtcEndpoint for publisher' +self.id+' error');
                        return callback(false);
                    }
                    self.screenPipeline = pipeline;
                    self.screenWebRtcEndpoint = screenWebRtcEndpoint;
                    self.screenCandidateSendQueue = [];
                    self.screenWebRtcEndpoint.processOffer(sdpOffer, function(error,sdpAnswer)
                    {
                        if (error)
                        {
                            console.log(error)
                            console.log('Publisher'+self.id +' fail to process offer' );
                            return callback(false);;
                        }
                        console.log('Screen publisher ' + self.id+': respnse');
                        _.each(candidateList,function(_candidate) {
                            var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                            self.screenWebRtcEndpoint.addIceCandidate(candidate);
                        });
                        screenWebRtcEndpoint.gatherCandidates(function(error)
                        {
                            if (error)
                            {
                                console.log(error)
                                console.log('Publisher'+self.id +' fail to gather candidate' );
                                return callback(false);;
                            }
                        });
                        screenWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                        {
                            callback(true, sdpAnswer,self.screenCandidateSendQueue);
                        });
                        
                    });
                    screenWebRtcEndpoint.on('OnIceCandidate', function(event)
                    {
                        console.log('Publisher screen  ' + self.id+': save local candidate', new Date());
                        self.screenCandidateSendQueue.push(event.candidate);
                    });
                });
            });
        });
}

RoomMember.prototype.subscribe = function(publisher, sdpOffer, candidateList,callback)
{
    var self = this;
        this.getKurentoClient(function(error, kurentoClient)
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
                self.subWebRtcEndpoint[publisher.id] =  subWebRtcEndpoint;
               
                subWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Subscriber'+self.id +' fail to process offer , publisher ',publisher.id );
                        console.log(error)
                        return callback(false);;
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
                            console.log('Subscriber'+self.id +' fail to gather candidate , publisher ',publisher.id );
                            return callback(false);
                        }
                    });
                });
            });
        })
  
}


RoomMember.prototype.subscribeScreen = function(publisher, sdpOffer, candidateList,callback)
{
    var self = this;
        this.getKurentoClient(function(error, kurentoClient)
        {
            if (error)
            {
                console.log('Create Kurento Client error');
                return callback(false);
            }
            if (!publisher.screenPipeline)
            {
                console.log(publisher);
                console.log('Publisher screen not ready ' + publisher.id);
                return callback(false);
            }
            publisher.screenPipeline.create('WebRtcEndpoint', function(error, screenWebRtcEndpoint)
            {
                if (error)
                { 
                    console.log('Create WebRtcEndpoint for subscriber '+self.id +' publisher:' + publisher.id +' error');
                    return callback(false);
                }
                console.log('Create WebRtcEndpoint for screen subscriber'+self.id +' publisher:' + publisher.id +' successfully');
                self.screenWebRtcEndpoint =  screenWebRtcEndpoint;
               
                screenWebRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer)
                {
                    if (error)
                    {
                        console.log('Subscriber'+self.id +' fail to process offer , publisher ',publisher.id );
                        console.log(error)
                        return callback(false);;
                    }
                    console.log('Process offer for subscriber'+self.id +' publisher:' + publisher.id +' successfully');
                    _.each(candidateList,function(_candidate) {
                        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
                        self.screenWebRtcEndpoint.addIceCandidate(candidate);
                    });
                    self.screenCandidateSendQueue = [];
                    screenWebRtcEndpoint.on('OnIceCandidate', function(event)
                    {
                        console.log('Subscriber screen ' + self.id+': save local candidate',new Date());
                        self.screenCandidateSendQueue.push(event.candidate);
                    });
                    screenWebRtcEndpoint.on('OnIceGatheringDone', function(event)
                    {
                        callback(true, sdpAnswer,self.screenCandidateSendQueue);
                    });
                    screenWebRtcEndpoint.gatherCandidates(function(error)
                    {
                        if (error)
                        {
                            console.log(error)
                            console.log('Subscriber'+self.id +' fail to gather candidate , publisher ',publisher.id );
                            return callback(false);
                        }
                    });
                });
            });
        })
  
}

module.exports = RoomMember