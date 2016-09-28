'use strict';

var jsonpatch =require( 'fast-json-patch'),
Member = require('./member.model');


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
        remove:destroy
}
// Gets a list of Member
function index(req, res) {
  return Member.find({'meetingId':req.query.meetingId}).exec()
    .then(function(entity) {
        res.json({'memberList':entity,status:true})
    })
    .catch(handleError(res));
}

// Gets a single Member from the DB
function show(req, res) {
  return Member.findOne({'email':req.query.email,'meetingId':req.query.meetingId}).exec()
    .then(function(entity){
        if(entity) {
            res.json({'member':entity,status:true})
          }
          return entity;
    })
    .catch(handleError(res));
}

// Creates a new Member in the DB
function create(req, res) {
   var member = JSON.parse(req.body.member);
   member.meetingId = req.body.meetingId;
  return Member.create(member)
    .then(function(entity){
        res.json({'id':entity._id,status:true})
    })
    .catch(handleError(res));
}

// Upserts the given Member in the DB at the specified ID
function update(req, res) {
    var member = JSON.parse(req.body.member);
    member.meetingId = req.body.meetingId;
  return Member.findOneAndUpdate({'email':member.email,'meetingId':member.meetingId}, member).exec()
    .then(function(entity){
        res.json({status:true});
    })
    .catch(handleError(res));
}


// Deletes a Member from the DB
function destroy(req, res) {
  return Member.remove({'email':req.body.email,'meetingId':req.body.meetingId}).exec()
    .then(function(entity) {
        if (entity)
            res.json({status:true});
        else
            res.json({status:false});
    })
    .catch(handleError(res));
}

