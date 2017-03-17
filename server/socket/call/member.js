var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');

function CallMember(id,profile, ws,call)
{
    this.id = id;
    this.ws = ws;
    this.call = call;
    this.profile = profile;
}




module.exports = CallMember