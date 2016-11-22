var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');

function RoomMember(id,profile, ws,room)
{
    this.id = id;
    this.ws = ws;
    this.room = room;
    this.profile = profile;
    this.channelList = [];
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

RoomMember.prototype.registerChannel = function(channel)
{
    this.channelList.push(channel);
    if (this.profile.role=='presenter')
        this.room.broadcastChannel(channel);
}

RoomMember.prototype.unregisterChannel = function(channel)
{
    this.channelList = _.reject(this.channelList,function(ch) {
       return ch.id == channel.id || (ch.source == channel.source); 
    });
    if (this.profile.role=='presenter')
        this.room.unbroadcastChannel(channel);
}

RoomMember.prototype.raiseHand =  function() {
    var presenter = this.room.presenter(); 
    if (presenter) {
        presenter.sendMessage(  {
                id: 'handUp',
                memberId: this.id
            });       
    }
}

RoomMember.prototype.lowHand =  function() {
    var presenter = this.room.presenter(); 
    if (presenter) {
        presenter.sendMessage( {
                id: 'handDown',
                memberId: this.id
            });
        }
}

RoomMember.prototype.onDiscussion =  function() {
    var channel = _.find(this.channelList,function(ch) {
        return ch.source =='webcam';
    });    
    this.room.broadcastChannel(channel);
}

RoomMember.prototype.offDiscussion =  function() {
    var channel = _.find(this.channelList,function(ch) {
       return ch.source =='webcam';
    });    
     this.room.unbroadcastChannel(channel);
}

RoomMember.prototype.leave = function() {
    this.room.unbroadcastPublisher(this);    
}


module.exports = RoomMember