var config = require('../../config/environment');
var _ = require('underscore');

function Endpoint(id) {
    this.id = id;
    this.ws = null;
    this.sessionId = null;
}


module.exports = Endpoint