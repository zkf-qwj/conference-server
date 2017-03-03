var _ = require('underscore');
var CallMember = require('./member.js')
var Member = require('../../api/member/member.model');

function Call(id)
{
    this.id = id;
    this.memberById = {};
    this.channelList = [];
}

Call.prototype.connectChannel = function(channel)
{
    this.channelList = _.reject(this.channelList,function(ch) {
       if ( ch.id == channel.id || (ch.source == channel.source && ch.publisherId==channel.publisherId)) {    
           return true;
       } 
       return false;
    });
    this.channelList.push(channel);
    _.each(this.memberById, function(m)
    {
        try
        {
            if (m.id != channel.publisherId)
                m.ws.send(JSON.stringify(
                {
                    id: 'connect',
                    channel: channel
                }));
        }
        catch (exception)
        {
            console.log(exception);
        }
    });
}


Call.prototype.disconnectChannel = function(channel)
{
    var self = this;
    this.channelList = _.reject(this.channelList ,function(ch) {
       if ( ch.id == channel.id) {
           return true;
       } 
       return false;
    });
    _.each(this.memberById, function(m)
    {
        try
        {
            if (m.id != channel.publisherId)
                m.ws.send(JSON.stringify(
                {
                    id: 'disconnect',
                    channel: channel
                }));
        }
        catch (exception)
        {
            console.log(exception);
        }
    });
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
