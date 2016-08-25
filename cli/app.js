#!/usr/bin/env node

var ZeroMQ = require("zmq");
var GSUtil = require("../lib/util");
var Config = require("../lib/config");

GSUtil.outputPrefix = "\x1b[32m[hub]\x1b[0m";

var argv = require("optimist").argv;
if (argv.d) {
    GSUtil.setTraceLevel(argv.d);
}

process.title = "[cloud-printer] hub:" + argv._[0];

var socket = ZeroMQ.socket("router");
var option = ZeroMQ.ZMQ_SNDHWM;
if(ZeroMQ.version.split('.')[0] == '2'){
    option = 'hwm';
}
socket.setsockopt(option, 1000);

// 以 Config.router.ipc 监听
socket.bind(Config.server, function(err){
    if (err) {
        GSUtil.print("\x1b[31msocket error: %s\x1b[0m\n", err);
        return;
    }

    GSUtil.print("listening \"%s\".\n", Config.server);
    // 接收到 message 后, 转给 node (每个 node 都是一个 pull/pub 模式的 zmq ipc)
    socket.on('message', function(tunnel_id, uuid, data) {
        var node = GSNode.get(socket, tunnel_id, uuid);
        node.emit('data', data);
        
    });

});
