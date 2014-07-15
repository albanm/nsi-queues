nsi-queues
==========

*Node.js Simple Integration - Queues helpers*

**Warning**: This project is very young and its test coverage is still incomplete. Feel free to use, but expect some quirks.

This project will provide an uniform and easy way to send and receive messages using queues.
It should be compatible with all possible major protocols and brokers.

The interface is based on asynchronous functions with callback passing for responses, acknowledgement, etc.
This allows a smooth integration with many node.js libraries and particularily with [async](https://github.com/caolan/async).

Install
-------

	npm install nsi-queues

Usage
-----

Initialize a queues helper with a [node-amqp connection](https://github.com/postwait/node-amqp):

```node
var amqp = require('amqp');
var nsiQueues = require('nsi-queues');

var amqpConnection = amqp.createConnection();
amqpConnection.on('ready', function(){
	var queuesHelper = nsiQueues(amqpConnectionProducer, function(err){
		// connection is active and queues helper is ready !
	});
});
```

Initialize a queues helper with a [stomp-js](https://github.com/benjaminws/stomp-js) client:

```node
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
	var queuesHelper = nsiQueues(stompClient, function(err){
		// connection is active and queues helper is ready !
	});
});
```

Send messages to a queue, without expecting a response, using to().
The headers parameter can be omitted.
The callback is executed when the broker acknowledges reception of the message.
The message and headers parameters of the callback are just copies of the original parameters as no response is expected when using to().

```node
queuesHelper.to('my-queue', 'my message', {header1: 'header1'}, function(err, message, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Message was sent and acknowledged !');
});
```

Send messages to a queue, and expects a response, using inOut().
The headers parameter can be omitted.
The callback is executed when the response is received or if an error occured when sending the message.

```node
queuesHelper.inOut('my-queue', 'my message', {header1: 'header1'}, function(err, message, headers) {
	if (err) console.log('Message sending failed.');
	else console.log('Response received: ' + message);
});
```

Expect messages from a queue and acknowledge reception to the broker using from().
The acknowledgement callback takes an optional error parameter.
from() takes a second optional parameter: a callback function that will be executed once subscription to the broker is effective.

```node
queuesHelper.from('my-queue', function(err, message, headers, ackCallback) {
	// do something with message
	ackCallback(); // acknowlege reception to the broker
});
```

Expect messages from a queue and send responses using from().
The responseCallback takes an optional fourth parameter: a callback that is executed when the broker acknowledges reception of the response message.

```node
queuesHelper.from('my-queue', function(err, message, headers, responseCallback) {
	// do something with message and prepare response
	responseCallback(null, responseMessage, responseHeaders);
});
```

Use [async](https://github.com/caolan/async) for advance control flow.
This lame example sends a message on 3 different queues and waits for all 3 acknowledgements to run its callback.

```node	
function myRoute(message, headers, callback) {
	async.parallel([
	    function(callback){
	        queuesHelper.to('queue1', message, headers, callback);
	    },
	    function(callback){
	        queuesHelper.to('queue2', message, headers, callback);
	    },
	    function(callback){
	        queuesHelper.to('queue3', message, headers, callback);
	    }
	], function (err) {
	   callback(err, message, headers);
	});	
}
```
	
Tests
-----

Require a broker compatible with AMQP<1 and STOMP. For example install and run [rabbitmq](https://www.rabbitmq.com/) with [stomp plugin](http://www.rabbitmq.com/stomp.html).

    npm test
