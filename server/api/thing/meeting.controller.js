/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/meeting              ->  index
 * POST    /api/meeting              ->  create
 * GET     /api/meeting/:id          ->  show
 * PUT     /api/meeting/:id          ->  upsert
 * PATCH   /api/meeting/:id          ->  patch
 * DELETE  /api/meeting/:id          ->  destroy
 */

'use strict';

var jsonpatch =require( 'fast-json-patch'),
 Meeting = require('./meeting.model');

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

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

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

module.exports = {
// Gets a list of Meeting
        index: function (req, res) {
  return Meeting.find().exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
},

// Gets a single Thing from the DB
show: function (req, res) {
  return Meeting.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
},

// Creates a new Thing in the DB
create: function (req, res) {
  return Meeting.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
},

// Upserts the given Thing in the DB at the specified ID
upsert: function (req, res) {
  if(req.body._id) {
    delete req.body._id;
  }
  return Meeting.findOneAndUpdate(req.params.id, req.body, {upsert: true, setDefaultsOnInsert: true, runValidators: true}).exec()

    .then(respondWithResult(res))
    .catch(handleError(res));
},

// Updates an existing Thing in the DB
patch: function (req, res) {
  if(req.body._id) {
    delete req.body._id;
  }
  return Meeting.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(patchUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
},

// Deletes a Thing from the DB
destroy: function (req, res) {
  return Meeting.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
}