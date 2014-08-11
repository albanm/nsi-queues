var stomp = require('stomp');
var should = require('should');

var prepareQueues = require('../');
var commonTests = require('./common');

describe('queues helper based on STOMP clients', function() {
	// 2 stomp queues helpers are created, the first one is created from a client
	var stompClientProducer;
	before(function(callback) {
		stompClientProducer = new stomp.Stomp({
			port: 61613,
			host: 'localhost',
			debug: false,
			login: 'guest',
			passcode: 'guest',
		});
		stompClientProducer.connect();
		stompClientProducer.on('connected', callback);
	});
	before(function(callback) {
		prepareQueues('stomp', stompClientProducer, function(err, helper) {
			global.producer = helper;
			callback();
		});
	});
	// the other one will create its own connection
	before(function(callback) {
		prepareQueues('stomp', {}, function(err, helper) {
			global.consumer = helper;
			callback();
		});
	});
	after(function() {
		global.consumer.client.disconnect();
		stompClientProducer.disconnect();
	});
	it('should have created STOMP queues managers', function() {
		should.equal(producer.constructor.name, 'STOMPQueuesManager');
		should.equal(consumer.constructor.name, 'STOMPQueuesManager');
	});

	commonTests('stomp');
});