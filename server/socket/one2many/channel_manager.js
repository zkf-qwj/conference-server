var Channel = require('./channel');
var _ = require('underscore');


function ChannelManager()
{
    this.channelById = {};
}

ChannelManager.prototype.registerChannel = function(channel)
{
    this.channelById[channel.id] =  channel;
}

ChannelManager.prototype.releaseChannel = function(channelId)
{
    var channel = this.channelById[channelId];
    try {
        if (channel)
            channel.release();
        delete this.channelById[channelId];
    } catch (exc) {
        console.log('Release channel error ', channelId);
        delete this.channelById[channelId];
    }    
}

ChannelManager.prototype.getChannelById = function(id)
{
    return this.channelById[id];
}

ChannelManager.prototype.releaseChannelInSession = function(sessionId)
{
    for (var id in this.channelById) {
        var channel = this.channelById[id];
        if (channel.sessionId==sessionId) {
            this.releaseChannel(id);
        }
    }
}



module.exports = ChannelManager