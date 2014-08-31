var amqp = require('amqp');
var should = require('should');

var prepareQueues = require('../');
var commonTests = require('./common');

describe('queues helper based on AMQP connections', function() {
	// 2 amqp queues helpers are created, the first one is created from a connection
	var amqpConnectionProducer;
	before(function(callback) {
		amqpConnectionProducer = amqp.createConnection();
		amqpConnectionProducer.on('ready', callback);
	});
	before(function(callback) {
		prepareQueues('amqp', amqpConnectionProducer, function(err, helper) {
			should.not.exist(err);
			global.producer = helper;
			callback();
		});
	});
	// the other one will create its own connection
	before(function(callback) {
		prepareQueues('amqp', {}, function(err, helper) {
			should.not.exist(err);
			global.consumer = helper;
			callback();
		});
	});

	it('should return an error when connection fails', function(callback) {
		prepareQueues('amqp', {
			port: 7000
		}, function(err, helper) {
			should.exist(err);
			callback();
		});
	});

	it('should have created AMQP queues managers', function() {
		should.equal(producer.constructor.name, 'AMQPQueuesManager');
		should.equal(consumer.constructor.name, 'AMQPQueuesManager');
	});

	commonTests('amqp');
});