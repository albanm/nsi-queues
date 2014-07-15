var stomp = require('stomp');
var should = require('should');

var prepareQueues = require('../');
var commonTests = require('./common');

describe('queues helper based on STOMP clients', function() {
	var stompClientProducer;
	var stompClientConsumer;
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
		stompClientConsumer = new stomp.Stomp({
			port: 61613,
			host: 'localhost',
			debug: false,
			login: 'guest',
			passcode: 'guest',
		});
		stompClientConsumer.connect();
		stompClientConsumer.on('connected', callback);
	});
	before(function(callback) {
		global.producer = prepareQueues(stompClientProducer, callback);
	});
	before(function(callback) {
		global.consumer = prepareQueues(stompClientConsumer, callback);
	});
	after(function() {
		stompClientConsumer.disconnect();
		stompClientProducer.disconnect();
	});
	it('should have created AMQP queues managers', function() {
		should.equal(producer.constructor.name, 'STOMPQueuesManager');
		should.equal(consumer.constructor.name, 'STOMPQueuesManager');
	});

	commonTests('stomp');
});