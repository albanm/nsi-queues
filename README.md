nsi-queues
==========

[![Build status](https://travis-ci.org/albanm/nsi-queues.svg)](https://travis-ci.org/albanm/nsi-queues)
[![Code Climate](https://codeclimate.com/github/albanm/nsi-queues/badges/gpa.svg)](https://codeclimate.com/github/albanm/nsi-queues)
[![NPM version](https://badge.fury.io/js/nsi-queues.svg)](http://badge.fury.io/js/nsi-queues)

*Node.js Services Integration - Queues helpers*

This project will provide an uniform and easy way to send and receive messages in [node.js](http://nodejs.org/) using queues.
It should be compatible with all possible major protocols and brokers.

The interface is based on asynchronous functions with callback passing for responses, acknowledgement, etc.
This allows a smooth integration with many node.js libraries and particularily with [async](https://github.com/caolan/async).

Install
-------

	npm install nsi-queues

Basic usage
-----------

Initialize a connection then forward messages from a queue to another.
Acknowledge reception of a message only when it is successfully transmitted.

```js
var nsiQueues = require('nsi-queues');

nsiQueues('amqp', {}, function(err, queuesHelper){
	queuesHelper.from('my-receiving-queue', function(body, headers, ackCallback) {
		queuesHelper.to('my-destination-queue', body, headers, ackCallback);
	})
});
```

The body of the message can be a string or an object.
If it is an object the 'content-type' header will be set to 'application/json'.

Initialize AMQP connections
---------------------------

Initialize a queues helper for amqp message passing.
The second parameter is the options object for a [node-amqp](https://github.com/postwait/node-amqp) connection.

```js
var nsiQueues = require('nsi-queues');

nsiQueues('amqp', {}, function(err, queuesHelper){
	// queues helper is ready !
	// active amqp connection can be accessed here:
	console.log(queuesHelper.connection)
});
```

Initialize a queues helper with a [node-amqp](https://github.com/postwait/node-amqp) connection.

```js
var amqp = require('amqp');
var nsiQueues = require('nsi-queues');

var amqpConnection = amqp.createConnection();
amqpConnection.on('ready', function(){
	nsiQueues('amqp', amqpConnectionProducer, function(err, queuesHelper){
		// connection is active and queues helper is ready !
	});
});
```

Initialize STOMP connections
----------------------------

Initialize a queues helper for stomp message passing.
The second parameter is the options object for a [stomp-js](https://github.com/benjaminws/stomp-js) client.

```js
var nsiQueues = require('nsi-queues');

nsiQueues('stomp', {}, function(err, queuesHelper){
	// queues helper is ready !
	// active stomp client can be accessed here:
	console.log(queuesHelper.client)
});
```

Initialize a queues helper with a [stomp-js](https://github.com/benjaminws/stomp-js) client.

```js
var stomp = require('stomp');
var nsiQueues = require('nsi-queues');

var stompClient = new stomp.Stomp({
	port: 61613,
	host: 'localhost',
	debug: false,
	login: 'guest',
	passcode: 'guest',
});
stompClient.connect();
stompClient.on('connected', function(){
	nsiQueues('stomp', stompClient, function(err, queuesHelper){
		// connection is active and queues helper is ready !
	});
});
```

Send messages
-------------

Send messages to a queue, without expecting a response, using **to()**.

  - The headers parameter can be omitted.
  - The callback is executed when the broker acknowledges reception of the message.
  - The message and headers parameters of the callback are the same as the original parameters as no response is expected when using to().

```js
queuesHelper.to('my-queue', 'my message', {header1: 'header1'}, function(err, body, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Message was sent and acknowledged !');
});
```

Send messages to a queue, and expect a response, using **inOut()**.

  - The headers parameter can be omitted.
  - The callback is executed when the response is received or if an error occured when sending the message.

```js
queuesHelper.inOut('my-queue', 'my message', {header1: 'header1'}, function(err, body, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Response received: ' + body);
});
```

Receive messages
----------------

Expect messages from a queue and acknowledge reception to the broker using **from()**.

  - The acknowledgement callback takes an optional error parameter.
  - from() takes a second optional parameter: a callback function that will be executed once subscription to the broker is effective.

```js
queuesHelper.from('my-queue', function(body, headers, ackCallback) {
	// do something with message
	ackCallback(); // acknowlege reception to the broker
});
```

Expect messages from a queue and send responses using **from()**.

  - The responseCallback takes an optional fourth parameter: a callback that is executed when the broker acknowledges reception of the response message.

```js
queuesHelper.from('my-queue', function(body, headers, responseCallback) {
	// do something with message and prepare response
	responseCallback(null, responseBody, responseHeaders);
});
```

Deal with errors
----------------

If a socket error occurs before a connection is established with a broker this error will be returned as the first
parameter to the callback of the helper's initializer. If an error occurs later it will be emitted as an event by the helper.

Neither nsi-queues nor its underlying libraries will do any reconnect attempt as it would require to execute multiple times the same callback functions in a way that is not explicit enough. Of course you are free to implement your own reconnect policy.

**Opinion of the author:** do not try to implement a complex reconnect policy. Log the connection error, but let it be emitted and crash the process. A process whose main responsability is forwarding messages from and/or to a broker is as good as dead without its connection. Let it crash and use a higher level container (phusion-passenger, forever, etc.) that will automaticaly try to restart and therefore reconnect. Also make sure your incoming requests will be buffered and eventually timed out properly if the down time is too long. If the incoming source is a broker it will do it, if it is HTTP an intelligent web application container like phusion-passenger will do ok.

Control flow
------------

Use [async](https://github.com/caolan/async) for advanced control flow.

This lame example sends a message on 3 different queues and waits for all 3 acknowledgements to run its callback.

```js	
function myRoute(body, headers, callback) {
	async.parallel([
	    function(callback){
	        queuesHelper.to('queue1', body, headers, callback);
	    },
	    function(callback){
	        queuesHelper.to('queue2', body, headers, callback);
	    },
	    function(callback){
	        queuesHelper.to('queue3', body, headers, callback);
	    }
	], function (err) {
	   callback(err, body, headers);
	});	
}
```

Brokers compatibility
---------------------

AMQP helper tested with:

  - [rabbitmq](https://www.rabbitmq.com/)

STOMP helper tested with:

  - [rabbitmq stomp plugin](http://www.rabbitmq.com/stomp.html)


Tests
-----

The test suite covers both AMQP and STOMP helpers.
Therefore it requires a broker compatible with AMQP<1 and STOMP.
For example install and run [rabbitmq](https://www.rabbitmq.com/) with [stomp plugin](http://www.rabbitmq.com/stomp.html).

    mocha -t 20000 -R spec

The project is integrated with [travis-ci](https://travis-ci.org/) which only supports a bare installation of [rabbitmq](https://www.rabbitmq.com/). So the default test command only runs the tests for AMQP helper.

    npm test
