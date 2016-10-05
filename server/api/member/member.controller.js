'use strict';

var jsonpatch =require( 'fast-json-patch');
var Member = require('./member.model');
var Meeting = require('../meeting/meeting.model');

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
        login:login,
        remove:destroy
}
// Gets a list of Member
function index(req, res) {
  return Member.find({'meetingId':req.query.meetingId}).select('-password').exec()
    .then(function(entity) {
        res.json({'memberList':entity,status:true})
    })
    .catch(handleError(res));
}

// Gets a single Member from the DB
function show(req, res) {
  return Member.findById(req.query.id).exec()
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
  return  Member.findOne({'email':member.email,'meetingId':member.meetingId}).exec()
  .then(function(entity){
      if (entity)
          res.json({status:false});
      else {
          Member.create(member)
          .then(function(entity){
              res.json({'id':entity.id,status:true})
          });
      }
  })
    .catch(handleError(res));
}

// Upserts the given Member in the DB at the specified ID
function update(req, res) {
    var member = JSON.parse(req.body.member);
    member.meetingId = req.body.meetingId;
  return Member.findByIdAndUpdate(member._id, member).exec()
    .then(function(entity){
        res.json({status:true});
    })
    .catch(handleError(res));
}


// Deletes a Member from the DB
function destroy(req, res) {
  return Member.findByIdAndRemove(req.body.id).exec()
    .then(function(entity) {
        if (entity)
            res.json({status:true});
        else
            res.json({status:false});
    })
    .catch(handleError(res));
}

//Creates a new Meeting in the DB
function login(req, res) {
    
  return Member.findOne({'meetingId':req.body.meetingId,'email':req.body.email,'password':req.body.password}).exec()
   .then(function(member) {
       if (member) {
           Member.find({'meetingId':req.body.meetingId}).exec()
           .then(function(memberList) {
               Meeting.findById(req.body.meetingId).exec()
               .then(function(meeting) {
                   res.json({status:true,memberList:memberList,meeting:meeting,member:member});
               })
               .catch(handleError(res));
           })
           .catch(handleError(res));
       }
       else
           res.json({status:false});       
   })
   .catch(handleError(res));
}
