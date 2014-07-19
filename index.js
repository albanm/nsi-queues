var _ = require("lodash");
_.mixin(require("lodash-deep"));
var amqp = require('amqp');
var stomp = require('stomp');

var AMQPQueuesManager = require('./lib/amqp');
var STOMPQueuesManager = require('./lib/stomp');

module.exports = function(protocol, connection, callback) {
	var queuesManager;
	// case where an amqp connection is given already prepared
	if (protocol === 'amqp' && _.deepGet(connection, 'options.clientProperties.product') === 'node-amqp') {
		new AMQPQueuesManager(connection, callback);
	}
	// case where the amqp connection should be initialized here
	else if (protocol === 'amqp') {
		amqpConnection = amqp.createConnection(connection);
		amqpConnection.on('ready', function() {
			new AMQPQueuesManager(amqpConnection, callback);
		});
	}
	// case where a stomp client is given already prepared
	else if (protocol === 'stomp' && _.deepGet(connection, 'constructor.name') === 'Stomp') {
		new STOMPQueuesManager(connection, callback);
	}
	// case where the stomp client should be initialized here
	else if (protocol === 'stomp') {
		var options = _.merge({
			port: 61613,
			host: 'localhost',
			debug: false,
			login: 'guest',
			passcode: 'guest',
		}, connection);
		var stompClient = new stomp.Stomp(options);
		stompClient.connect();
		stompClient.on('connected', function() {
			new STOMPQueuesManager(stompClient, callback);
		});
	} else {
		return callback(new Error('NSI Queues helpers failed to recognize the given protocol. Supported: node-amqp connections and stomp-js clients.'));
	}
};