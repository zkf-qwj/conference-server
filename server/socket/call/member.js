var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');

function CallMember(id,profile, ws,call)
{
    this.id = id;
    this.ws = ws;
    this.call = call;
    this.profile = profile;
    this.channel = null;
}

CallMember.prototype.connect = function(channel)
{
    this.channel = channel;
    this.call.connectChannel(channel);
}


CallMember.prototype.disconnect = function() {
    this.call.disconnectChannel(this.channel); 
}


module.exports = CallMember