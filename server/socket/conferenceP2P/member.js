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

RoomMember.prototype.registerChannel = function(channel)
{
    this.channelList.push(channel);
    this.room.broadcastChannel(channel);
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




RoomMember.prototype.releasePresent =  function() {
    this.sendMessage(  {
            id: 'releasePresent'
        });       
}

RoomMember.prototype.leave = function() {
    this.room.unbroadcastPublisher(this); 
}


module.exports = RoomMember