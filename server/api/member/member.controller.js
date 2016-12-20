'use strict';

var jsonpatch =require( 'fast-json-patch');
var config = require('../../config/environment');
var Member = require('./member.model');
var Meeting = require('../meeting/meeting.model');
var sha1 = require('sha1');

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
        invite:invite,
        remove:destroy,
        trustLogin:trustLogin
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
   console.log(member);
   return  Meeting.findById(req.body.meetingId).exec()
   .then(function(meeting) {       
       if (meeting) {
           return  Member.findOne({'email':member.email,'meetingId':member.meetingId}).exec()
           .then(function(entity){
               if (entity) {
                   res.json({'id':entity.id,status:true});
               }
               else {
                   Member.create(member)
                   .then(function(entity){
                       res.json({'id':entity.id,status:true});
                   });
               }
           })
         .catch(handleError(res));
       } else {
           console.log('Invalid meetingId', member.meetingId );
           res.json({status:false});
       }
   })
   .catch(handleError(res));
  
}



//Invite a new Member in the DB
function invite(req, res) {
    var member = JSON.parse(req.body.member);
    member.meetingId = req.body.meetingId;
    console.log(member);
    return  Meeting.findById(req.body.meetingId).exec()
    .then(function(meeting) {       
        if (meeting) {
            return  Member.findOne({'email':member.email,'meetingId':member.meetingId}).exec()
            .then(function(entity){
                if (!entity) 
                {
                    Member.create(member)
                    .then(function(entity){
                        var payload = {
                                memberId:entity._id,
                                meetingId:req.body.meetingId
                        }
                        var payload_encode = new Buffer(JSON.stringify(payload)).toString("base64");
                        var checksum = sha1(payload_encode+config.secrets.api);
                        var urlLink = url.format({
                            protocol: req.protocol,
                            hostname: config.hostname,
                            port: config.apiPort,
                            pathname: '/#/trustedlogin/',
                            query: {
                                payload:payload_encode,
                                checksum:checksum
                            }
                          });
                        res.json({'link':urlLink,status:true});
                    });
                }
            })
          .catch(handleError(res));
        } else {
            console.log('Invalid meetingId', member.meetingId );
            res.json({status:false});
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

function login(req, res) {
  if (req.body.meetingId)  
      return Member.findOne({'meetingId':req.body.meetingId,'email':req.body.email,'password':req.body.password}).select('-password').exec()
       .then(function(member) {
           if (member) {
               Member.find({'meetingId':req.body.meetingId}).select('-password').exec()
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
  if (req.body.domain)  
      return Meeting.findOne({'domain':req.body.domain}).exec()
              .then(function(meeting) {
                  console.log(meeting);
                  Member.findOne({'meetingId':meeting._id,'email':req.body.email,'password':req.body.password}).select('-password').exec()
                  .then(function(member) {
                      console.log(member);
                      if (member) {
                          Member.find({'meetingId':meeting._id}).select('-password').exec()
                          .then(function(memberList) {
                              res.json({status:true,memberList:memberList,meeting:meeting,member:member});
                          })
                      }
                  });
              })  
              .catch(handleError(res));
   
}


function trustLogin(req, res) {
    
  return Member.findOne({'meetingId':req.body.meetingId,'_id':req.body.memberId}).select('-password').exec()
   .then(function(member) {
       if (member) {
           Member.find({'meetingId':req.body.meetingId}).select('-password').exec()
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

