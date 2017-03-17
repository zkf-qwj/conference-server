var Connection = require('./connection');
var _ = require('underscore');


function ConnectionManager()
{
    this.connectionById = {};
}

ConnectionManager.prototype.releaseEndpointInSession = function(sessionId)
{
    _.each(this.connectionById,function(connection) {
        connection.endpoints = _.reject(connection.endpoints,function(endpoint) {
            return endpoint.sessionId = sessionId;
        });
    })
}


ConnectionManager.prototype.getConnectionById = function(id)
{
    if  (!this.connectionById[id])
        this.connectionById[id] =  new Connection(id);
    return this.connectionById[id]; 
}

module.exports = ConnectionManager