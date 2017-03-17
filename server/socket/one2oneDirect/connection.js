var config = require('../../config/environment');
var _ = require('underscore');
var Endpoint = require('./endpoint');
var kurentoClient = null

function Connection(id)
{
    this.id = id;
    this.endpoints = [];
}

Connection.prototype.getEndpointById = function(id)
{
    var endpoint = _.find(this.endpoints,function(obj) {
        return obj.id == id;
    }); 
    if (!endpoint) { 
        console.log('Create enpoint',id);
        endpoint = new Endpoint(id);
        this.endpoints.push(endpoint);
    }
    return endpoint;
}

Connection.prototype.sendOffer = function(source,sdpOffer) {
    _.each(this.endpoints,function(endpoint) {
       if (endpoint.ws && endpoint.id != source.id) {
           endpoint.ws.send(JSON.stringify({
               id: 'offer',
               sdpOffer:sdpOffer
           }));
       } 
    });      
}

Connection.prototype.sendAnswer = function(source,sdpAnswer) {
    _.each(this.endpoints,function(endpoint) {
        if (endpoint.ws && endpoint.id != source.id) {
            endpoint.ws.send(JSON.stringify({
                id: 'answer',
                sdpAnswer:sdpAnswer
            }));
        } 
     });      
}

Connection.prototype.sendIceCandidate = function(source,candidate) {
    _.each(this.endpoints,function(endpoint) {
       if (endpoint.ws && endpoint.id != source.id) {
           endpoint.ws.send(JSON.stringify({
               id: 'iceCandidate',
               candidate:candidate
           }));
       } 
    });      
}

module.exports = Connection