'use strict';
var config = require('../config/environment');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var compose = require('composable-middleware');
var User = require('../api/user/user.model');
var sha1 = require('sha1');
var validateJwt = expressJwt({
    secret: config.secrets.session
});
/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
module.exports = {
    isAuthenticated: isAuthenticated,
    isTrusted: isTrusted,
    hasRole: hasRole,
    signToken: signToken,
    setTokenCookie: setTokenCookie
}

function isAuthenticated() {
        return compose()
            // Validate jwt
            .use(function(req, res, next) {
                // allow access_token to be passed through body parameter as well
                if (req.query && req.query.token) {
                    req.headers.authorization = 'Bearer ' + req.query.token;
                }
                if (req.body && req.body.token) {
                    req.headers.authorization = 'Bearer ' + req.body.token;
                }
                validateJwt(req, res, next);
            })
            // Attach user to request
            .use(function(req, res, next) {
                User.findById(req.user._id).exec().then(user => {
                    if (!user) {
                        return res.status(401).end();
                    }
                    next();
                }).catch(err => next(err));
            });
    }

function isTrusted() {
    return compose()
        .use(function(req, res, next) {
            console.log(req.body);
            var checksum = req.body.checksum;
            var payload = req.body.payload;
            if (sha1(payload+config.secrets.api)!=checksum) {
                console.log('Fail to validated external API call');
                return res.json({status:false});
            }
            var payloadJson = JSON.parse(payload);
            for(var elem in payloadJson) {
                    var json = payloadJson[elem];
                    if (typeof json != 'string') 
                        req.body[elem] = JSON.stringify(json);
                    else
                        req.body[elem] =  json;
             }
            next();
        });
}
    /**
     * Checks if the user role meets the minimum requirements of the route
     */
function hasRole(roleRequired) {
        if (!roleRequired) {
            throw new Error('Required role needs to be set');
        }
        return compose().use(isAuthenticated()).use(function meetsRequirements(req, res, next) {
            if (config.userRoles.indexOf(req.user.role) >= config.userRoles.indexOf(roleRequired)) {
                return next();
            } else {
                return res.status(403).send('Forbidden');
            }
        });
    }
    /**
     * Returns a jwt token signed by the app secret
     */
function signToken(id, role) {
        return jwt.sign({
            _id: id,
            role
        }, config.secrets.session, {
            expiresIn: 60 * 60 * 5
        });
    }
    /**
     * Set token cookie directly for oAuth strategies
     */
function setTokenCookie(req, res) {
    if (!req.user) {
        return res.status(404).send('It looks like you aren\'t logged in, please try again.');
    }
    var token = signToken(req.user._id, req.user.role);
    res.cookie('token', token);
    res.redirect('/');
}