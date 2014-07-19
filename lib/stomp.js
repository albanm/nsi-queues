var _ = require('lodash');
var uuid = require('node-uuid');

function STOMPQueuesManager(client, callback) {
	var that = this;
	that.client = client;
	that.correlationCallbacks = {};
	that.errorCallbacks = {};
	that.receiptCallbacks = {};

	// generate a random name for the response queue
	that.responseQueue = '/queue/nsi.responses-' + uuid.v4();

	// Subscribe to a shared response queue for inOut messages
	that.client.subscribe({
		destination: that.responseQueue
	}, function(body, headers) {
		if (that.correlationCallbacks[headers.correlationId]) {
			that.correlationCallbacks[headers.correlationId](null, body[0], headers);
			delete that.correlationCallbacks[headers.correlationId];
		}
	});

	that.client.on('receipt', function(receiptId) {
		if (that.receiptCallbacks[receiptId]) {
			that.receiptCallbacks[receiptId]();
			delete that.receiptCallbacks[receiptId];
		}
	});

	that.client.on('error', function(frame) {
		if (that.errorCallbacks[frame.headers['receipt-id']]) {
			that.errorCallbacks[frame.headers['receipt-id']](new Error(frame.body));
			delete that.errorCallbacks[frame.headers['receipt-id']];
		}
	});

	callback(null, that);
}

// Publish a message to a queue
STOMPQueuesManager.prototype.to = function(queue, message, headers, callback) {
	var that = this;
	// deal with optional headers argument
	if (typeof headers === 'function') {
		callback = headers;
		headers = {};
	}

	// stomp-js is weird on this point, we have to mix headers and body
	stompHeaders = _.clone(headers);
	stompHeaders.destination = '/queue/' + queue;
	stompHeaders.persistent = true;
	stompHeaders.body = message;

	// send the message with its headers and require a receipt
	that.client.send(stompHeaders, true);

	// stomp-js puts the receipt id in the headers, we can get it by reference
	// expect error event to run callback with error
	that.errorCallbacks[stompHeaders.receipt] = callback;
	that.receiptCallbacks[stompHeaders.receipt] = function() {
		// success, just return the message as received
		callback(null, message, headers);
	};
};

// Publish a message to a queue and declare a callback on the responses queu
STOMPQueuesManager.prototype.inOut = function(queue, message, headers, callback) {
	var that = this;
	// deal with optional headers argument
	if (typeof headers === 'function') {
		callback = headers;
		headers = {};
	}

	// stomp-js is weird on this point, we have to mix headers and body
	headers = _.clone(headers);
	headers.destination = '/queue/' + queue;
	headers.persistent = true;
	headers.body = message;
	headers.correlationId = uuid.v4();
	headers.replyTo = that.responseQueue;

	// send the message with its headers and require a receipt
	that.client.send(headers, true);

	// stomp-js puts the receipt id in the headers, we can get it by reference
	// expect error event to run callback with error
	that.errorCallbacks[headers.receipt] = callback;

	// Prepare waiting for the response message
	that.correlationCallbacks[headers.correlationId] = callback;
};

// Subscribe to messages from a queue
STOMPQueuesManager.prototype.from = function(queue, readyCallback, callback) {
	var that = this;
	// ready callback is optional
	if (callback === null) {
		callback = readyCallback;
		readyCallback = null;
	}

	that.client.subscribe({
		destination: '/queue/' + queue,
		ack: 'client'
	}, function(body, headers) {
		// prepare a callback that the user program will call to acknowledge reception of the message
		var responseCallback = function(err, responseMessage, responseHeaders, responseAckCallback) {
			if (err) {
				that.client.nack(headers['message-id']);
			} else {
				that.client.ack(headers['message-id']);
			}
			// Send a response message if requested
			if (headers.replyTo && headers.correlationId) {
				// stomp-js is weird on this point, we have to mix headers and body
				stompHeaders = _.clone(responseHeaders);
				stompHeaders.destination = headers.replyTo;
				stompHeaders.persistent = true;
				stompHeaders.body = responseMessage;
				stompHeaders.correlationId = headers.correlationId;

				that.client.send(stompHeaders, !!responseAckCallback);

				// stomp-js puts the receipt id in the headers, we can get it by reference
				// expect error event to run callback with error
				if (responseAckCallback) {
					that.errorCallbacks[stompHeaders.receipt] = responseAckCallback;
					that.receiptCallbacks[stompHeaders.receipt] = function() {
						// success, just return the message as received
						responseAckCallback(null, responseMessage, responseHeaders);
					};
				}
			} else {
				if (responseAckCallback) responseAckCallback();
			}
		};
		callback(null, body[0], headers, responseCallback);
	});

	if (readyCallback) readyCallback();
};

module.exports = STOMPQueuesManager;