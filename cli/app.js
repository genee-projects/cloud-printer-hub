#! /usr/bin/env node

require("buffertools").extend();// buffertools update to 2.*

var SerialPort = require("serialport");
var ZeroMQ = require("zmq");

var GSUtil = require("../lib/util");
var Config = require("../lib/config");

GSUtil.outputPrefix = "\x1b[33m[serial]\x1b[0m";
// GSUtil.showIdle();

var argv = require("optimist").argv;
if (argv.d) {
    GSUtil.setTraceLevel(argv.d);
}

process.title = "[cloud-printer] serial:" + argv._[0];

// 串口打印机
var sp = new SerialPort.SerialPort(argv._[0], {
    baudrate: 9600,
    parser: SerialPort.parsers.raw
});

// zmq (router)
var socket = ZeroMQ.socket("dealer");
var option = ZeroMQ.ZMQ_SNDHWM;
if(ZeroMQ.version.split('.')[0] == '2'){
    option = 'hwm';
}
socket.setsockopt(option, 1000);
socket.connect(Config.server.ipc);

socket
.on("error", function(err){
    GSUtil.print("\x1b[31m0MQ error: %s\x1b[0m\n", err);
    socket.connect(Config.server.ipc);
});

var _sending_queue = [];
var _sending = false;
function _sp_write(buf) {
    _sending_queue.push(buf);

    if (_sending) return;
    _sending = true;

    function _send(){
        var buf = _sending_queue.shift();

        var frame = ZProtocol.parseFrame(buf);
        GSUtil.trace(
            GSUtil.TRACE_DEBUG2, "\x1b[30;1mD(0x%s) <= SERIAL\x1b[0m op:0x%s reg:0x%s [ %s ]\n",
            GSUtil.toHex(frame.header.dst_addr, 2), GSUtil.toHex(frame.header.op, 2), GSUtil.toHex(frame.header.reg, 2), frame.data.toString("hex")
        );

        rlog("serial D(0x%s) SEND 0x%s 0x%s %s",
            GSUtil.toHex(frame.header.dst_addr, 2), GSUtil.toHex(frame.header.op, 2), GSUtil.toHex(frame.header.reg, 2), frame.data.toString("hex"));

        sp.write(buf);

        setTimeout(function(){
            if (!_sending_queue.length) {
                _sending = false;
            }
            else {
                _send();
            }
        }, 100);
    }

    setTimeout(_send, 1);
}

function spInit() {
    sp
    .on("error", function(err) {
            GSUtil.print("\x1b[31merror: %s\x1b[0m\n", err.openErr);
            setTimeout(function(){
                sp.open();
            }, 2000);
        })
    .on("open", function() {

        GSUtil.print("\x1b[32m%s connected\x1b[0m\n", sp.path);

        socket.on("message", function(uuid, data){
            var uuid_string = uuid.toString('hex');
            _sp_write(data);
        });

        var spBuf = new Buffer(0);

        sp.on("data", function(data) {

        });

    });
}

process.on('SIGINT', function() {
    setTimeout(function(){  process.exit(); }, 1000);
});

spInit();

