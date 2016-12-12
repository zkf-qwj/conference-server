var Subscription = require('./subscription');
var _ = require('underscore');


function SubscriptionManager()
{
    this.subById = {};
}

SubscriptionManager.prototype.registerSub = function(sub)
{
    this.subById[sub.id] =  sub;
}

SubscriptionManager.prototype.releaseSub = function(subId)
{
    var sub = this.subById[subId];
    try {
        if (sub)
            sub.release();
        delete this.subById[subId];
    } catch (exc) {
        console.log('Release subscription error ', subId);
        delete this.subById[subId];
    }    
}

SubscriptionManager.prototype.getSubById = function(id)
{
    return this.subById[id];
}

SubscriptionManager.prototype.releaseSubInSession = function(sessionId)
{
    _.pairs(this.subById,function(id,sub) {
        if (sub.sessionId==sessionId)
            this.releaseSub(sub);
    });
}



module.exports = SubscriptionManager