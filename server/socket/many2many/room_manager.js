var Room = require('./room.js')
var Meeting = require('../../api/meeting/meeting.model');

function RoomManager()
{
    this.roomById = {};
}

RoomManager.prototype.registerRoom = function(id,callback)
{
    var self = this;
    if (self.roomById[id]) 
        callback(true,self.roomById[id]);
    else
        Meeting.findById( id , function (err, meeting) {
        if (err) 
            callback(false,null);
        else {
            var room = new Room(id);
            self.roomById[id] = room;
            callback(true,room);
        }
    })

}
RoomManager.prototype.unregisterRoom = function(id)
{
    try {
        this.roomById[id].close();
        if (this.roomById[id]) delete this.roomById[id];
    } catch (exc) {
        console.log('End error ', id);
    }    
}

RoomManager.prototype.getRoomById = function(id)
{
    return this.roomById[id];
}


module.exports = RoomManager