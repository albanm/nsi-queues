nsi-queues
==========

*Node.js Services Integration - Queues helpers*

**Warning**: This project is very young and its test coverage is still incomplete. Feel free to use, but expect some quirks.

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

Initialize a queues helper for amqp message passing. The second parameter is the options object for a [node-amqp](https://github.com/postwait/node-amqp) connection.

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

Initialize a queues helper for stomp message passing. The second parameter is the options object for a [stomp-js](https://github.com/benjaminws/stomp-js) client.

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
Send message
------------

Send messages to a queue, without expecting a response, using to().
The headers parameter can be omitted.
The callback is executed when the broker acknowledges reception of the message.
The message and headers parameters of the callback are just copies of the original parameters as no response is expected when using to().

```js
queuesHelper.to('my-queue', 'my message', {header1: 'header1'}, function(err, body, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Message was sent and acknowledged !');
});
```

Send messages to a queue, and expect a response, using inOut().
The headers parameter can be omitted.
The callback is executed when the response is received or if an error occured when sending the message.

```js
queuesHelper.inOut('my-queue', 'my message', {header1: 'header1'}, function(err, body, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Response received: ' + body);
});
```
Receive messages
----------------

Expect messages from a queue and acknowledge reception to the broker using from().
The acknowledgement callback takes an optional error parameter.
from() takes a second optional parameter: a callback function that will be executed once subscription to the broker is effective.

```js
queuesHelper.from('my-queue', function(err, body, headers, ackCallback) {
	// do something with message
	ackCallback(); // acknowlege reception to the broker
});
```

Expect messages from a queue and send responses using from().
The responseCallback takes an optional fourth parameter: a callback that is executed when the broker acknowledges reception of the response message.

```js
queuesHelper.from('my-queue', function(body, headers, responseCallback) {
	// do something with message and prepare response
	responseCallback(null, responseBody, responseHeaders);
});
```

Control flow
------------

Use [async](https://github.com/caolan/async) for advance control flow.
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

Validated only against [rabbitmq](https://www.rabbitmq.com/) with [stomp plugin](http://www.rabbitmq.com/stomp.html) for now.

Tests
-----

Require a broker compatible with AMQP<1 and STOMP. For example install and run [rabbitmq](https://www.rabbitmq.com/) with [stomp plugin](http://www.rabbitmq.com/stomp.html).

    npm test

TODO
----

  * Support [zeromq](http://zeromq.org/) ?
  * More complete tests including error management.

