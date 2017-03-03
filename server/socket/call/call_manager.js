var Call = require('./call.js')
var Meeting = require('../../api/meeting/meeting.model');

function CallManager()
{
    this.callById = {};
}

CallManager.prototype.registerCall = function(id,callback)
{
    var self = this;
    if (self.callById[id]) 
        callback(true,self.callById[id]);
    else {
        var call = new Call(id);
        self.callById[id] = call;
        callback(true,call);
    }
}
CallManager.prototype.unregisterCall = function(id)
{
    try {
        this.callById[id].close();
        if (this.callById[id]) delete this.callById[id];
    } catch (exc) {
        console.log('End error ', id);
    }    
}

CallManager.prototype.getCallById = function(id)
{
    return this.callById[id];
}


module.exports = CallManager