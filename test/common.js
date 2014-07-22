var should = require('should');

module.exports = function(queuePrefix) {
	describe('Simple integration queues', function() {

		var queue1Callback;
		it('should subscribe to a queue using "from"', function(callback) {
			consumer.from(queuePrefix + '-my-queue1', callback, function(err, message, headers, ackCallback) {
				if (queue1Callback) queue1Callback(err, message, headers);
				ackCallback();
			});
		});

		it('should send a simple message using "to"', function(callback) {
			queue1Callback = function(err, message, headers) {
				if (err) return callback(err);
				message.should.equal('test message');
				headers.should.have.property('header1', 'header1');
				callback();
			};
			producer.to(queuePrefix + '-my-queue1', 'test message', {
				header1: 'header1'
			}, function(err) {
				if (err) callback(err);
			});
		});

		it('should send an object as JSON "to"', function(callback) {
			queue1Callback = function(err, message, headers) {
				if (err) return callback(err);
				message.should.have.property('id', 'test');
				callback();
			};
			producer.to(queuePrefix + '-my-queue1', {
				id: 'test'
			}, function(err) {
				if (err) callback(err);
			});
		});

		it('should send many messages using "to"', function(callback) {
			var ct = 0;
			queue1Callback = function(err, message, headers) {
				if (err) return callback(err);
				message.should.equal('test message 2');
				ct += 1;
				if (ct >= 10) callback();
			};

			var toQueue = function() {
				producer.to(queuePrefix + '-my-queue1', 'test message 2', function(err) {
					if (err) callback(err);
				});
			};

			for (var i = 0; i < 10; i++) {
				toQueue();
			}
		});

		var queue2Callback;
		it('should subscribe to a second queue using "from"', function(callback) {
			consumer.from(queuePrefix + '-my-queue2', callback, function(err, message, headers, ackCallback) {
				if (queue2Callback) queue2Callback(err, message, headers);
				ackCallback();
			});
		});

		it('should send a message only to the requested queue', function(callback) {
			queue1Callback = function(err, message, headers) {
				callback(new Error('Queue 1 should not receive anything'));
			};
			queue2Callback = function(err, message, headers) {
				if (err) return callback(err);
				message.should.equal('test message 3');
				callback();
			};
			producer.to(queuePrefix + '-my-queue2', 'test message 3', function(err) {
				if (err) callback(err);
			});
		});


		var queueResponseCallback;
		it('should subscribe to a third queue ready to send responses', function(readyCallback) {
			consumer.from(queuePrefix + '-my-queue3', readyCallback, function(err, message, headers, responseCallback) {
				if (queueResponseCallback) queueResponseCallback(err, message, headers, responseCallback);
			});
		});
		it('should send a message expecting a response using "inOut"', function(callback) {
			// prepare receiving the message
			queueResponseCallback = function(err, message, headers, responseCallback) {
				if (err) return callback(err);
				message.should.equal('this message expects a response');
				// Send the response
				responseCallback(null, 'this is a response', {
					responseHeader: 'response header'
				});
			};
			producer.inOut(queuePrefix + '-my-queue3', 'this message expects a response', function(err, message, headers) {
				if (err) callback(err);
				// Expect to have received the response in callback
				message.should.equal('this is a response');
				headers.should.have.property('responseHeader', 'response header');
				callback();
			});
		});

		it('should send a message expecting a response as an object using "inOut"', function(callback) {
			// prepare receiving the message
			queueResponseCallback = function(err, message, headers, responseCallback) {
				if (err) return callback(err);
				message.should.equal('this message expects a response');
				// Send the response
				responseCallback(null, {
					id: 'response'
				});
			};
			producer.inOut(queuePrefix + '-my-queue3', 'this message expects a response', function(err, message, headers) {
				if (err) callback(err);
				// Expect to have received the response in callback
				message.should.have.property('id', 'response');
				callback();
			});
		});
	});
};