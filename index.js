var _ = require("lodash");
_.mixin(require("lodash-deep"));

var AMQPQueuesManager = require('./lib/amqp');
var STOMPQueuesManager = require('./lib/stomp');

module.exports = function(connection, callback) {
	var queuesManager;
	if(_.deepGet(connection, 'options.clientProperties.product') === 'node-amqp'){
		queuesManager = new AMQPQueuesManager(connection, callback);	
	} else if (_.deepGet(connection, 'constructor.name') === 'Stomp') {
		queuesManager = new STOMPQueuesManager(connection, callback);	
	} else {
		return callback(new Error('NSI Queues helpers failed to recognize the given connection. Supported: node-amqp connections and stomp-js clients.'));
	}
	// bind all functions to the queues manager so that they can be passed by reference
	_.bindAll(queuesManager);
};