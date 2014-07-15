var amqp = require('amqp');
var should = require('should');

var prepareQueues = require('../');
var commonTests = require('./common');

describe('queues helper based on AMQP connections', function() {
	var amqpConnectionProducer;
	var amqpConnectionConsumer;
	before(function(callback) {
		amqpConnectionProducer = amqp.createConnection();
		amqpConnectionProducer.on('ready', callback);
	});
	before(function(callback) {
		amqpConnectionConsumer = amqp.createConnection();
		amqpConnectionConsumer.on('ready', callback);
	});
	before(function(callback) {
		global.producer = prepareQueues(amqpConnectionProducer, callback);
	});
	before(function(callback) {
		global.consumer = prepareQueues(amqpConnectionConsumer, callback);
	});
	it('should have created AMQP queues managers', function() {
		should.equal(producer.constructor.name, 'AMQPQueuesManager');
		should.equal(consumer.constructor.name, 'AMQPQueuesManager');
	});

	commonTests('amqp');
});