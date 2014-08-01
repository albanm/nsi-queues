var should = require('should');

module.exports = function(queuePrefix) {
	describe('Simple integration queues', function() {

		var queue1Callback;
		it('should subscribe to a queue using "from"', function(callback) {
			consumer.from(queuePrefix + '-my-queue1', callback, function(body, headers, ackCallback) {
				if (queue1Callback) queue1Callback(body, headers);
				ackCallback();
			});
		});

		it('should send a simple body using "to"', function(callback) {
			queue1Callback = function(body, headers) {
				body.should.equal('test body');
				headers.should.have.property('header1', 'header1');
				callback();
			};
			producer.to(queuePrefix + '-my-queue1', 'test body', {
				header1: 'header1'
			}, function(err) {
				if (err) callback(err);
			});
		});

		it('should send an object as JSON "to"', function(callback) {
			queue1Callback = function(body, headers) {
				body.should.have.property('id', 'test');
				callback();
			};
			producer.to(queuePrefix + '-my-queue1', {
				id: 'test'
			}, function(err) {
				if (err) callback(err);
			});
		});

		it('should send many bodys using "to"', function(callback) {
			var ct = 0;
			queue1Callback = function(body, headers) {
				body.should.equal('test body 2');
				ct += 1;
				if (ct >= 10) callback();
			};

			var toQueue = function() {
				producer.to(queuePrefix + '-my-queue1', 'test body 2', function(err) {
					if (err) callback(err);
				});
			};

			for (var i = 0; i < 10; i++) {
				toQueue();
			}
		});

		var queue2Callback;
		it('should subscribe to a second queue using "from"', function(callback) {
			consumer.from(queuePrefix + '-my-queue2', callback, function(body, headers, ackCallback) {
				if (queue2Callback) queue2Callback(body, headers);
				ackCallback();
			});
		});

		it('should send a body only to the requested queue', function(callback) {
			queue1Callback = function(body, headers) {
				callback(new Error('Queue 1 should not receive anything'));
			};
			queue2Callback = function(body, headers) {
				body.should.equal('test body 3');
				callback();
			};
			producer.to(queuePrefix + '-my-queue2', 'test body 3', function(err) {
				if (err) callback(err);
			});
		});


		var queueResponseCallback;
		it('should subscribe to a third queue ready to send responses', function(readyCallback) {
			consumer.from(queuePrefix + '-my-queue3', readyCallback, function(body, headers, responseCallback) {
				if (queueResponseCallback) queueResponseCallback(null, body, headers, responseCallback);
			});
		});
		it('should send a body expecting a response using "inOut"', function(callback) {
			// prepare receiving the body
			queueResponseCallback = function(err, body, headers, responseCallback) {
				if (err) return callback(err);
				body.should.equal('this body expects a response');
				// Send the response
				responseCallback(null, 'this is a response', {
					responseHeader: 'response header'
				});
			};
			producer.inOut(queuePrefix + '-my-queue3', 'this body expects a response', function(err, body, headers) {
				if (err) callback(err);
				// Expect to have received the response in callback
				body.should.equal('this is a response');
				headers.should.have.property('responseHeader', 'response header');
				callback();
			});
		});

		it('should send a body expecting a response as an object using "inOut"', function(callback) {
			// prepare receiving the body
			queueResponseCallback = function(err, body, headers, responseCallback) {
				if (err) return callback(err);
				body.should.equal('this body expects a response');
				// Send the response
				responseCallback(null, {
					id: 'response'
				});
			};
			producer.inOut(queuePrefix + '-my-queue3', 'this body expects a response', function(err, body, headers) {
				if (err) callback(err);
				// Expect to have received the response in callback
				body.should.have.property('id', 'response');
				callback();
			});
		});
	});
};