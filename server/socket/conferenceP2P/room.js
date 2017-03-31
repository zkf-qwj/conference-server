var _ = require('underscore');
var RoomMember = require('./member.js')
var Member = require('../../api/member/member.model');

function Room(id)
{
    this.id = id;
    this.memberById = {};
    this.presentationBuffer = [];
    this.fileShare = [];
    this.livePresenterId = null;
}
Room.prototype.registerMember = function(id,ws,callback)
{
    var self = this;
    Member.findById( id , function (err, profile) {
        if (err) 
            callback(false,null);
        else {
            var member = new RoomMember(id,profile,ws,self);
            self.memberById[id] = member;
            callback(true,member);
        }
    });
}
Room.prototype.unregisterMember = function(id)
{
    if (this.memberById[id]) delete this.memberById[id];
}
Room.prototype.getMemberById = function(id)
{
    return this.memberById[id];
}


Room.prototype.presenter = function()
{
     return _.find(this.memberById, function(member) {
        return member.profile.role == 'presenter';
    });
}

Room.prototype.broadcastChat = function(source,text)
{
    _.each(this.memberById, function(m)
            {
                try
                {
                    m.ws.send(JSON.stringify(
                    {
                        id: 'chat',
                        user: source.profile.name,
                        text: text
                    }));
                }
                catch (exception)
                {
                    console.log(exception);
                }
            });
}


Room.prototype.broadcastPresentation = function(source,event,object)
{
    this.presentationBuffer.push({memberId:source.id,event:event,object:object}); 
    _.each(this.memberById, function(m)
    {
        if (source.id != m.id )
            try
            {            
                m.ws.send(JSON.stringify(
                {
                    id: 'presentation',
                    event: event,
                    object: object
                }));
            }
            catch (exception)
            {
                console.log(exception);
            }
    });
}


Room.prototype.broadcastPresent = function(livePresenterId)
{
    _.each(this.memberById, function(m)
    {
            try
            {            
                m.ws.send(JSON.stringify(
                {
                    id: 'grantPresent',
                    livePresenterId: livePresenterId
                }));
            }
            catch (exception)
            {
                console.log(exception);
            }
    });
}



Room.prototype.broadcastFileShare = function(source,event,object)
{
    this.fileShare.push({memberId:source.id,event:event,object:object}); 
    _.each(this.memberById, function(m)
    {
        if (source.id != m.id )
            try
            {            
                m.ws.send(JSON.stringify(
                {
                    id: 'fileShare',
                    event: event,
                    object: object
                }));
            }
            catch (exception)
            {
                console.log(exception);
            }
    });
}

Room.prototype.close =function() {
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

Room.prototype.broadcastMember =function()
{
    var onlineList = _.map(this.memberById, function(member)
    {
        return {
            _id: member.id,
        }
    });
    
    _.each(this.memberById, function(member)
    {
        try
        {
            member.ws.send(JSON.stringify(
            {
                id: 'memberStatus',
                onlineList: onlineList
            }));
        }
        catch (exception)
        {
            console.log(exception);
        }
    });
}

module.exports = Room
