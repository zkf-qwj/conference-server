'use strict';

var formidable = require('formidable');
var path = require('path');
var jsonpatch =require( 'fast-json-patch'),
fs = require('fs');
var config = require('../../config/environment');
var url = require('url');

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).json({status:false});
  };
}

module.exports = {
        downChannel:downChannel,
        upChannel:upChannel
}



function upChannel(req, res) {
    res.json({status:true})
}

function downChannel(req, res) {
    var array = [];
    var arraySize = 12*1024*1024;
    var size = arraySize
    while(size--) array.push(1);
    res.json({status:true,payload:{data:array,size:arraySize}});
}



