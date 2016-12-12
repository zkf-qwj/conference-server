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



function Conversation(id)
{
    this.id = id;
    this.kurentoClient = null;
    this.pipeline = null;
    this.composite = null;
    this.partyById = {};
}

Conversation.prototype.release = function() {
    console.log("Release resoure for channel" + this.id);
    if (this.pipeline) 
        this.pipeline.release();
    if (this.composite) 
        this.composite.release();
}

Conversation.prototype.removeParty = function(id) {
    var party = this.partyById[id];
    try {
        if (party)
            party.release();
        delete this.partyById[id];
    } catch (exc) {
        console.log('removeParty error ', id);
        delete this.partyById[id];
    }    
}

Conversation.prototype.removePartyInSession = function(sessionId)
{
    _.pairs(this.partyById,function(id,party) {
        if (party.sessionId==sessionId)
            this.removeParty(id);
    });
}



module.exports = Conversation