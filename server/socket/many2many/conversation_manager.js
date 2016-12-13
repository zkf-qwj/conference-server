var Conversation = require('./conversation');
var kurento = require('kurento-client');
var config = require('../../config/environment');
var _ = require('underscore');



function getKurentoClient(callback)
{
    kurento(config.ws_uri, function(error, _kurentoClient)
    {
        if (error)
        {
            var message = 'Coult not find media server at address ' + argv.ws_uri;
            callback(null);
        } 
        else
            callback(_kurentoClient);
    });
}

function getMediaPipeline(kurentoClient,callback) {
    kurentoClient.create('MediaPipeline', function(error, _pipeline)
    {
        if (error)
        {
            console.log('Create MediaPipeline error',error);
            callback(null);
        }else
            callback(_pipeline);
    });
}

function getWebRtcEndpoint(pipeline,callback) {
    pipeline.create('WebRtcEndpoint', function(error, _webRtcEndpoint)
    {
        if (error)
        {
            console.log('Create WebRtcEndpoint  error',error);
            callback(null);
        } else
            callback(_webRtcEndpoint);
    });
}

function getComposite(pipeline,callback) {
    pipeline.create('Composite', function(error, _composite )
    {
        if (error)
        {
            console.log('Create Composite  error',error);
            callback(null);
        } else
            callback(_composite );
    });
}

function getHubport(hub,callback) {
    hub.createHubPort( function(error, _hubPort) {
        if (error) {
            console.log('Create Hubport  error',error);
            callback(null);
        }
        callback(_hubPort );
    });
}

function ConversationManager()
{
    this.conversationById = {};
}

ConversationManager.prototype.getConversation = function(id,callback)
{
    var self = this;
    if (this.conversationById[id]) {
        console.log('Existing conversation');
        callback(this.conversationById[id]);
    }
    else {
        conversation = new Conversation(id);    
        getKurentoClient(function( kurentoClient)
        {
            if (!kurentoClient)
                return callback(null);
            conversation.kurentoClient = kurentoClient;
            getMediaPipeline(kurentoClient, function( pipeline)
            {
                if (!pipeline)
                    return callback(null);
                conversation.pipeline = pipeline;
                getComposite(pipeline,function (composite)
                {
                    if (!composite)
                        return callback(null);
                    conversation.composite = composite;
                    self.conversationById[id] = conversation;
                    callback(conversation);
                });
            });
        });
    }
}   

ConversationManager.prototype.releaseConversation = function(id)
{
    var conversation = this.conversationById[id];
    try {
        if (conversation)
            conversation.release();
        delete this.conversationById[id];
    } catch (exc) {
        console.log('Release conversationById error ', id);
        delete this.conversationById[id];
    }    
}


module.exports = ConversationManager