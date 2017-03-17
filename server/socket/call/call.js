var _ = require('underscore');
var CallMember = require('./member.js')
var Member = require('../../api/member/member.model');

function Call(id)
{
    this.id = id;
    this.memberById = {};
}


Call.prototype.registerMember = function(id,ws,callback)
{
    var self = this;
    Member.findById( id , function (err, profile) {
        if (err) 
            callback(false,null);
        else {
            var member = new CallMember(id,profile,ws,self);
            self.memberById[id] = member;
            callback(true,member);
        }
    });
}
Call.prototype.unregisterMember = function(id)
{
    if (this.memberById[id]) delete this.memberById[id];
}
Call.prototype.getMemberById = function(id)
{
    return this.memberById[id];
}

Call.prototype.broadcastChat = function(sender,text)
{
    _.each(this.memberById, function(m)
            {
                try
                {
                    if (sender.id != m.id)
                        m.ws.send(JSON.stringify(
                        {
                            id: 'chatEvent',
                            text:text
                        }));
                }
                catch (exception)
                {
                    console.log(exception);
                }
            });
}

Call.prototype.broadcastMember =function()
{
    var memberList = _.map(this.memberById, function(member) {
        return {
            id: member.id,
        }
    });
    
    _.each(this.memberById, function(member) {
        try
        {
            member.ws.send(JSON.stringify(
            {
                id: 'memberStatus',
                memberList: memberList
            }));
        }
        catch (exception)
        {
            console.log(exception);
        }
    });
}

Call.prototype.broadcastWhiteboard = function(sender,object,event)
{
    _.each(this.memberById, function(m)
            {
                try
                {
                    if (sender.id != m.id)
                        m.ws.send(JSON.stringify(
                        {
                            id: 'whiteboardEvent',
                            object:object,
                            event:event
                        }));
                }
                catch (exception)
                {
                    console.log(exception);
                }
            });
}

Call.prototype.close =function() {
_.each(this.memberById, function(member)
    {
        try
        {
            member.ws.send(JSON.stringify(
            {
                id: 'end',
            }));
        }
        catch (exception)
        {
            console.log(exception);
        }
    });
}

module.exports = Call
