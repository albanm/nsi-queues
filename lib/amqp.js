var _ = require('lodash');
var uuid = require('node-uuid');

function AMQPQueuesManager(connection, callback) {
	var that = this;
	that.connection = connection;
	that.correlationCallbacks = {};

	// Prepare the exchange for simple-integration queues
	that.exchange = that.connection.exchange('nsi.direct', {
		type: 'direct',
		confirm: true
	});

	that.exchange.on('open', function() {
		// generate a random name for the response queue
		that.responseQueue = 'nsi.responses-' + uuid.v4();
		that.connection.queue(that.responseQueue, {
			durable: true,
			exclusive: true,
			autoDelete: true
		}, function(q) {
			q.bind(that.exchange, that.responseQueue);

			// Receive messages
			q.subscribe(function(message, headers, deliveryInfo) {
				// check if a correlationId matching this response was expected,
				// if so execute the matching callback
				if (that.correlationCallbacks[deliveryInfo.correlationId]) {
					// message can be either the expected object if it was sent as JSON, or an object with keys data and contentType
					if (message.data && message.contentType) {
						message = message.data.toString('utf-8');
					}
					that.correlationCallbacks[deliveryInfo.correlationId](null, message, headers);
					delete that.correlationCallbacks[deliveryInfo.correlationId];
				}
			});

			// The exchange is ready, the response queue is ready, we are ok here
			callback(null, that);
		});
	});
}

// Publish a message to a queue
AMQPQueuesManager.prototype.to = function(queue, message, headers, publishOptions, callback) {
	var that = this;
	// deal with optional headers and publishOptions argument
	if (typeof headers === 'function') {
		callback = headers;
		headers = {};
	}
	if (typeof publishOptions === 'function') callback = publishOptions;

	// prepare AMQP publish options and content
	var options = _.merge({
		mandatory: true,
		deliveryMode: 2 // persistence delivery
	}, publishOptions);
	options.headers = headers;

	// deal with message sent as object, it should serialized here then deserialized in from
	if (typeof message === 'object') {
		options.contentType = 'application/json';
		message = JSON.stringify(message);
	}

	that.exchange.publish(queue, message, options, function(err) {
		if (err) callback(new Error('Error when publishing to queue ' + queue));
		callback(null, message, headers);
	});
};

// Publish a message to a queue and declare a callback on the responses queu
AMQPQueuesManager.prototype.inOut = function(queue, message, headers, publishOptions, callback) {
	var that = this;
	// deal with optional publishOptions argument
	if (typeof headers === 'function') {
		callback = headers;
		headers = {};
	}
	if (typeof publishOptions === 'function') callback = publishOptions;

	// prepare AMQP publish options and content
	var correlationId = uuid.v4();
	var options = _.merge({
		mandatory: true,
		deliveryMode: 2, // persistence delivery
		correlationId: correlationId,
		replyTo: that.responseQueue
	}, publishOptions);
	options.headers = headers;

	// deal with message sent as object, it should serialized here then deserialized in from
	if (typeof message === 'object') {
		options.contentType = 'application/json';
		message = JSON.stringify(message);
	}

	// Prepare waiting for the response message
	that.correlationCallbacks[correlationId] = callback;

	that.exchange.publish(queue, message, options, function(err) {
		if (err) {
			callback(err);
			delete that.correlationCallbacks[correlationId];
		}
	});
};

// Subscribe to messages from a queue
AMQPQueuesManager.prototype.from = function(queue, readyCallback, callback) {
	var that = this;
	// ready callback is optional
	if (callback === null) {
		callback = readyCallback;
		readyCallback = null;
	}

	that.connection.queue(queue, {
		durable: true,
		autoDelete: false
	}, function(q) {
		q.bind(that.exchange, queue, function(err) {
			// readyCallback not passed as reference because bind sends a non null object as first parameter that is not an error
			if (readyCallback) readyCallback();
		});

		// Receive messages
		q.subscribe({
			ack: true, // require all messages to be acknowledged to the borker
			prefetchCount: 0 // but do not limit the rate of messages
		}, function(message, headers, deliveryInfo, ack) {
			// prepare a callback that the user program will call to acknowledge reception of the message
			var responseCallback = function(err, responseMessage, responseHeaders, responseAckCallback) {
				ack.acknowledge(!!err, true); // acknowledge reception, reject if err is defined and requeue

				// deal with optional headers and responsAckCallback arguments
				if (typeof responseHeaders === 'function') {
					callback = responseHeaders;
					responseHeaders = {};
				}
				responseHeaders = responseHeaders || {};

				// Send a response message if requested
				if (deliveryInfo.replyTo && deliveryInfo.correlationId) {
					var options = _.merge({
						mandatory: true,
						deliveryMode: 2, // persistence delivery
						correlationId: deliveryInfo.correlationId
					});
					options.headers = responseHeaders;

					// deal with message sent as object, it should be serialized here then deserialized in inOut response
					if (typeof responseMessage === 'object') {
						options.contentType = 'application/json';
						responseMessage = JSON.stringify(responseMessage);
					}

					that.exchange.publish(deliveryInfo.replyTo, responseMessage, options, function(err) {
						if (responseAckCallback) return responseAckCallback(err);
					});
				} else {
					if (responseAckCallback) responseAckCallback();
				}
			};
			// message can be either the expected object if it was sent as JSON, or an object with keys data and contentType
			if (message.data && message.contentType) {
				message = message.data.toString('utf-8');
			}

			callback(message, headers, responseCallback);
		});
	});
};

module.exports = AMQPQueuesManager;