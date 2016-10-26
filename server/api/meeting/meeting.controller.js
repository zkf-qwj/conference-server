'use strict';

var formidable = require('formidable');
var path = require('path');
var jsonpatch =require( 'fast-json-patch'),
fs = require('fs'),
Meeting = require('./meeting.model');
var config = require('../../config/environment');
var url = require('url');

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).json({status:false});
  };
}

module.exports = {
        index:index,
        info:show,
        create:create,
        update:update,
        remove:destroy,
        end:end,
        upload:upload
}
// Gets a list of Meeting
function index(req, res) {
  return Meeting.find().exec()
    .then(function(entity) {
        res.json({'meetingList':entity,status:true})
    })
    .catch(handleError(res));
}

// Gets a single Meeting from the DB
function show(req, res) {
  return Meeting.findById(req.query.id).exec()
    .then(function(entity){
        if(entity) 
            res.json({'meeting':entity,status:true})
        else
            res.json({status:false})
    })
    .catch(handleError(res));
}

// Creates a new Meeting in the DB
function create(req, res) {
   var meeting = JSON.parse(req.body.meeting);
    Meeting.create(meeting)
      .then(function(entity){
               res.json({'id':entity._id,status:true})
           })
   .catch(handleError(res));
}

// Upserts the given Meeting in the DB at the specified ID
function update(req, res) {
    var meeting = JSON.parse(req.body.meeting);
  return Meeting.findByIdAndUpdate(meeting.id, meeting).exec()
    .then(function(entity){
        res.json({status:true});
    })
    .catch(handleError(res));
}


// Deletes a Meeting from the DB
function destroy(req, res) {
  return Meeting.findById(req.params.id).exec()
    .then(removeEntity(res))
    .catch(handleError(res));
}

//Close an existing Meeting in the DB
function end(req, res) {
  return Meeting.findById(req.body.id).exec()
    .then(function(entity) {
        if (entity) {
            entity.active = false;
            entity.save();
            res.json({status:true});
        } else
            res.json({status:false});
    })
    .catch(handleError(res));
}

//Upload material for meeting
function upload(req, res) {
 // create an incoming form object
    var form = new formidable.IncomingForm();
    form.multiples = false;
    // store all uploads in the /uploads directory
    form.uploadDir = config.uploadDir;
    form.on('file', function(field, file) {
      var timestamp = new Date();
      var filename = timestamp.getTime() + file.name
      var filepath = path.join(form.uploadDir, filename ) ;
      fs.rename(file.path, filepath);
      var urlLink = url.format({
          protocol: req.protocol,
          hostname: config.hostname,
          port: config.apiPort,
          pathname: '/public/'+filename
        });
      if (filename.endsWith('pdf'))
          res.json({status:true,url:urlLink});
      else 
      {
          urlLink += '.pdf';
          var unoconv = require('child_process').spawn(
                  'unoconv',
                  // second argument is array of parameters, e.g.:
                  ['-o'
                  , filepath +'.pdf'
                  ,filepath]
                  );

          var output = "";
          unoconv.stdout.on('data', function(data){ output += data });
          unoconv.on('close', function(code){ 
            if (code !== 0) {  
                return res.json({status:false});
            }
            return res.json({status:true,url:urlLink});
          });
      } 
    });

    form.on('error', function(err) {
      console.log('An error has occured: \n' + err);
      res.json({status:false});
    });

    form.on('end', function() {
        
    });

    // parse the incoming request containing the form data
    form.parse(req);
    

}

