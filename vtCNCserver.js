var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;
// var WebSocketClient = require('websocket').client;
// var WebSocketFrame  = require('websocket').frame;
// var WebSocketRouter = require('websocket').router;
// var W3CWebSocket = require('websocket').w3cwebsocket;
 
var express = require('express')

var app;
var server;

const main = () => {

    app = express()
    server = http.createServer(app);

    server.listen(8080)

    // GET method route
    app.get('/', function (req, res) {
        if (req.url == '/') {
            fs.readFile(__dirname + '/index.html',function (err, data){
                if (err) {
                    console.log(err);
                } 
                console.log('returning html');
                res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
                res.write(data);
                res.end();
                return;
        });
        }
    });

    app.get('/availablePorts', function (req, res) {
            
            console.log('returning available ports');

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(ports));
            res.end();
        return;
    });


    app.use("/", express.static(__dirname));


    // var server = http.createServer(function(request, response) {

    //     if (request.url == '/') {
    //       fs.readFile('index.html',function (err, data){
    //         response.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
    //         response.write(data);
    //         response.end();
    //       });
    //       return;
    //     }

    //     console.log((new Date()) + ' Received request for ' + request.url);
    //     response.writeHead(404);
    //     response.end();
    // });
    // server.listen(8080, function() {
    //     console.log((new Date()) + ' Server is listening on port 8080');
    // });

    wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });
    
    function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
    }

    var connection;
    var vtCNC = require('./vtCNC.js');

    wsServer.on('request', function(request) {
        if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
        }
        
        connection = request.accept('echo-protocol', request.origin);
        console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                console.log('Received Message: ' + message.utf8Data);
                //connection.sendUTF(message.utf8Data);
                //send to vtCNC

                switch (true) {
                    case /^start:/.test(message.utf8Data):
                        var cmds = message.utf8Data.split(':');
                        vtCNC.start(cmds[1]);
                        break;
                    default:
                        vtCNC.sendCommand(message.utf8Data);
                    break;
                }

            }
            else if (message.type === 'binary') {
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                connection.sendBytes(message.binaryData);
            }
        });
        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });

        vtCNC.availablePorts(sendToClient);
        vtCNC.subscriber(sendToClient);
    });

    var sendToClient = function (data) {
        if (connection.state == 'open') {
            connection.sendUTF(data);
        }
    }

    console.log('vtcnc here!')

}

main();
