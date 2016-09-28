'use strict';

var jsonpatch =require( 'fast-json-patch'),
Meeting = require('./meeting.model');


function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.remove()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}



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
        end:end
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
  return Meeting.findOne({'meetingId':req.query.meetingId}).exec()
    .then(function(entity){
        if(entity) {
            res.json({'meeting':entity,status:true})
          }
          return entity;
    })
    .catch(handleError(res));
}

// Creates a new Meeting in the DB
function create(req, res) {
   var meeting = JSON.parse(req.body.meeting);
  return Meeting.create(meeting)
    .then(function(entity){
        res.json({'id':entity._id,status:true})
    })
    .catch(handleError(res));
}

// Upserts the given Meeting in the DB at the specified ID
function update(req, res) {
    var meeting = JSON.parse(req.body.meeting);
  return Meeting.findOneAndUpdate({'meetingId':meeting.meetingId}, meeting).exec()
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
  return Meeting.findOne({'meetingId':req.body.meetingId}).exec()
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
