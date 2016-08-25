require("buffertools").extend();
var SerialPort = require("serialport");
var ZProtocol = require("../lib/zprotocol");
var Protocol = require("../lib/protocol");
var zigbeeCFG = require("../ZigbeeCFG.json");
var fs = require('fs');
var PinOperator = require("../lib/bbb_gpio");


var zigbeeRstPin = 46,//"P1_15",
    zigbeeCfgPin = 47,//"P1_14",
    zigbeeSleepPin = 44,//"P1_13",
    button = 61;
var configDeviceTimer;
var currUUIDStr;
var LedTimer;
var LED1 = 45, LED2 = 27, LED3 = 65;

PinOperator.open(LED1, "output", function (err) { });
PinOperator.open(LED2, "output", function (err) { });
PinOperator.open(LED3, "output", function (err) { });
PinOperator.open(zigbeeRstPin, "output", function (err) { });
PinOperator.open(zigbeeCfgPin, "output", function (err) { });
PinOperator.open(zigbeeSleepPin, "output", function (err) { });
PinOperator.open(button, "input", function (err) { });

process.title = "[gs:config]";
for (var i = 0; i < 0x8FFF; i++)
    i = i;

var ledState = 1;
function runLed() {
    ledState++;
    if (ledState > 3) {
        ledState = 1;
    }

    switch (ledState) {
        case 1:
            PinOperator.write(LED3, 1, function () { });
            PinOperator.write(LED1, 0, function () { });
            break;
        case 2:
            PinOperator.write(LED1, 1, function () { });
            PinOperator.write(LED2, 0, function () { });
            break;
        case 3:
            PinOperator.write(LED2, 1, function () { });
            PinOperator.write(LED3, 0, function () { });
            break;
    }
}
LedTimer = setInterval(runLed, 300);

var zigbeeConfiguration = {};
zigbeeConfiguration.defaultCFG = {
    channel: parseInt(zigbeeCFG.defaultCFG.channel, 16),
    net: parseInt(zigbeeCFG.defaultCFG.net, 16)
};
zigbeeConfiguration.normalCFG = {
    channel: parseInt(zigbeeCFG.normalCFG.channel, 16),
    net: parseInt(zigbeeCFG.normalCFG.net, 16)
};
zigbeeConfiguration.deviceADDR = zigbeeCFG.deviceADDR;

// 串口 (zigbee)
var sp = new SerialPort.SerialPort("/dev/ttyO1", {
    baudrate: 38400,
    parser: SerialPort.parsers.raw
});

function saveConfiguration(cfg) {
    var cfgStr = JSON.stringify(cfg, null, 4);
    fs.writeFile(__dirname + '/../ZigbeeCFG.json', cfgStr,
        function (err) {
            if (err) throw err;
        }
    );
}

var _sending_queue = [];
var _sending = false;
function _sp_write(buf) {
    _sending_queue.push(buf);

    if (_sending) return;

    _sending = true;

    function _send() {
        var buf = _sending_queue.shift();

        var frame = ZProtocol.parseFrame(buf);
        sp.write(buf);

        setTimeout(function () {
            if (!_sending_queue.length) {
                _sending = false;
            } else {
                _send();
            }
        }, 100);
    }

    setTimeout(_send, 1);
}

var sendBuf = new Buffer(16);
var rc = new Buffer([0xF0, 0xF1, 0xF2]);//需要确认的寄存器
var tryReset = 0;//尝试重启的次数

function configDevice() {
    var buf;
    if (rc.length == 0) {//三个参数都得到了确认
        buf = ZProtocol.makeFrame(1, ZProtocol.OP_WRITE, 0x02, new Buffer([0x01]));
        console.log("Reset Device...");
        _sp_write(buf);
        tryReset++;
        if (tryReset > 5) {
            currUUIDStr = undefined;//超时，复位变量
            rc = new Buffer([0xF0, 0xF1, 0xF2]);
            tryReset = 0;
        }
    } else {
        if (currUUIDStr == undefined) {
            buf = ZProtocol.makeFrame(1, ZProtocol.OP_READ, 0x00, new Buffer(0));
            console.log("Getting new device UUID...");
            _sp_write(buf);
        }else {
            buf = ZProtocol.makeFrame(1, ZProtocol.OP_WRITE, 0xF2,
                ZProtocol.makeData(zigbeeConfiguration.normalCFG.channel, "uint8"));
            console.log("Set device zigbee channel to " + zigbeeConfiguration.normalCFG.channel);
            _sp_write(buf);
            buf = ZProtocol.makeFrame(1, ZProtocol.OP_WRITE, 0xF1,
                ZProtocol.makeData(zigbeeConfiguration.normalCFG.net, "uint8"));
            _sp_write(buf);
            console.log("Set device zigbee netID to " + zigbeeConfiguration.normalCFG.net);
            buf = ZProtocol.makeFrame(1, ZProtocol.OP_WRITE, 0xF0,
                ZProtocol.makeData(zigbeeConfiguration.deviceADDR, "uint16"));
            _sp_write(buf);
            console.log("Set device zigbee address to " + zigbeeConfiguration.deviceADDR);
            console.log("======================================");
        }
    }
}

function configStep4() {
    var delayTime = 3000;
    PinOperator.write(zigbeeRstPin, 1, function () { });
    PinOperator.write(zigbeeSleepPin, 1, function () { });
    configDeviceTimer = setInterval(configDevice, delayTime);
}
/******************************
*字节数据格式：
*		第1、2字节为模块地址；
*		第3字节为网络ID：有效数据为00-FF；
*		第4字节为网络类型：01——网状网；02——星型网；07——对等网
*		第5字节为节点类型：01——中心节点；03——中继路由；04——终端节点
*		第6字节为发送模式：01——广播；02——主从；03——按地址点对点
*                                第7字节为波特率（  01——1200
*				 02——2400
*				 03——4800
*			   	 04——9600
*				 05——19200
*				 06——38400
*		第8字节为校验：01——NONE；02——EVEN；03——ODD
*		第9字节为数据位：01——8位；03——9位
*		第10字节为数据模式：01——ASCII；02——16进制
*		第11字节为串口超时；
*		第12字节为信道：有效数据为00-0F；
*		第13字节为发射功率；
*		第14字节为数据源地址选项：01——不输出；02——ASCII输出；03——16进制输出
************************************/
function configStep3(channel, net) {
    console.log('Config zigbee 2...');
    sendBuf[0] = 0x23;
    sendBuf[1] = 0xFE;
    //14个字节的配置参数
    sendBuf[2] = 0;								// ADDR(HIGH)
    sendBuf[3] = 0;								// ADDR(LOW)
    sendBuf[4] = net;								// NET_ID

    // TODO: 需要根据配置设置合法的参数
    sendBuf[5] = 1;								// 网络类型

    // TODO: 需要根据配置设置合法的参数
    sendBuf[6] = 1;								// 节点类型

    // TODO: 需要根据配置设置合法的参数
    sendBuf[7] = 1;								// 发送模式

    // 波特率 0x06: 38400
    sendBuf[8] = 0x06;								// 7

    sendBuf[9] = 0x01;								// 8cd 
    sendBuf[10] = 0x01;								// 9
    sendBuf[11] = 0x02;								// 10
    sendBuf[12] = 0x04;								// 11
    sendBuf[13] = channel;							// CHANNEL

    // power
    sendBuf[14] = 0x00;								// 13

    // address output mode: 01: no output; 02: ASCII; 03: hex mode
    sendBuf[15] = 0x01;								// 14

    sp.write(sendBuf);
    delayTime = 500;
    setTimeout(function () {
        // finish config, not necessary
        sendBuf[0] = 0x23;
        sendBuf[1] = 0x23;
        sp.write(sendBuf.slice(0, 2));
        delayTime = 100;
        console.log('Reset zigbee...');
        PinOperator.write(zigbeeRstPin, 0);
        setTimeout(configStep4, delayTime);
    }, delayTime);
}

function configStep2(channel, net) {
    console.log('Config zigbee 1...');
    PinOperator.write(zigbeeCfgPin, 1);
    //init buffer
    sendBuf[0] = 0x23;
    sendBuf[1] = 0xA0;
    sp.write(sendBuf.slice(0, 2));
    setTimeout(function () {
        configStep3(channel, net); 
    }, 100);
}

function configStep1(channel, net) {
    var delayTime = 3000;
    PinOperator.write(zigbeeRstPin, 1);
    //设置配置模式
    console.log('Set zigbee into configuration model...');
    PinOperator.write(zigbeeCfgPin, 0);
    setTimeout(function () { 
        configStep2(channel, net); 
    }, delayTime);
}

function configZigbeeModule(channel, net) {
    var delayTime = 30;
    console.log('Reset Zigbee...');
    PinOperator.write(zigbeeSleepPin, 1);
    //configStep1--重置系统	
    PinOperator.write(zigbeeRstPin, 0);
    setTimeout(function () { 
        configStep1(channel, net); 
    }, delayTime);
}

function deleteElement(buf, ele) {
    var len = buf.length;
    var temp;
    for (var i = 0; i < len; i++) {
        if (buf[i] == ele) {
            buf[i] = buf[len - 1];
            return buf.slice(0, len - 1);
        }
    }
    return buf;
}

function process1() {
    configZigbeeModule(zigbeeCFG.defaultCFG.channel, zigbeeCFG.defaultCFG.net);
    var spBuf = new Buffer(0);
    sp.on("data", function (data) {
        // 串口收到信息后, 先拼接信息到缓冲 buffer
        spBuf = Buffer.concat([spBuf, data]);
        for (; ;) {
            var pos = spBuf.indexOf(new Buffer([ZProtocol.FRAME_FLAG]));
            if (pos >= 0) {
                // 如果 buffer 中有包头, 则需去除包头前的内容
                spBuf = spBuf.slice(pos);
            } else {
                // 如果 buffer 中无包头, 则 buffer 全部为噪声, 抛弃
                spBuf = new Buffer(0);
                break;
            }

            // 解析 buffer
            var frame = ZProtocol.parseFrame(spBuf);
            // 如果解析发现 buffer 没到包应有的长度, 则继续等待
            if (frame.incomplete) {
                break;
            }
            // 如果 buffer 解析出的包非法, 则包头可能是假的, 其实是噪声,
            // 删除包头 (如果包头为多字节, 则删除包头的第一字节), 其余
            // 部分继续等待处理
            if (!frame.isValid()) {
                spBuf = spBuf.slice(1);
                continue;
            }
            var header = frame.header;
            if (header.op == ZProtocol.OP_ANSWER) {
                switch (header.reg) {
                    case 0x00:
                        {
                            currUUIDStr = frame.data.toString('hex');
                            zigbeeCFG.deviceADDR++;
                            if (zigbeeCFG.deviceADDR > 0xFFFF) {
                                zigbeeCFG.deviceADDR = 2;
                            }
                            zigbeeConfiguration.deviceADDR = zigbeeCFG.deviceADDR;
                            console.log("Current device UUID is " + currUUIDStr + ".");
                            break;
                        }
                    case 0x02:
                        {
                            zigbeeCFG[currUUIDStr] = zigbeeCFG.deviceADDR;
                            saveConfiguration(zigbeeCFG);//保存UUID与Net Addr的映射
                            currUUIDStr = undefined;//配置成功一台设备，复位变量
                            rc = new Buffer([0xF0, 0xF1, 0xF2]);
                            tryReset = 0;
                            console.log('Current device\'s addr is ' + zigbeeCFG.deviceADDR + '.');
                            break;
                        }
                    case 0xF0:
                        {
                            if (frame.data.readUInt16LE(0) == zigbeeConfiguration.deviceADDR) {
                                console.log("addr confirm");
                                rc = deleteElement(rc, 0xF0);
                            }
                            break;
                        }
                    case 0xF1:
                        {
                            if (frame.data.readUInt8(0) == zigbeeConfiguration.normalCFG.net) {
                                console.log("netID confirm");
                                rc = deleteElement(rc, 0xF1);
                            }
                            break;
                        }
                    case 0xF2:
                        {
                            if (frame.data.readUInt8(0) == zigbeeConfiguration.normalCFG.channel) {
                                console.log("channel confirm");
                                rc = deleteElement(rc, 0xF2);
                            }
                            break;
                        }
                }
            }
            // 处理完包后, 将处理过的部分删除, 其他仍放在 buffer 里
            spBuf = spBuf.slice(header.size);
        }
    });
}

function processEnd() {
    sp.close();
    //PinOperator.close(button);
    process.exit();
}

var buttonStat = 1;
function monitButton() {
    PinOperator.read(button, function (err, value) {
        if (err) {
            throw err;
        }
        if (!value && buttonStat) {
            clearInterval(configDeviceTimer);
            clearInterval(monitButtonTimer);
            clearInterval(LedTimer);
            PinOperator.write(LED1, 0);
            PinOperator.write(LED2, 0);
            PinOperator.write(LED3, 0);
            configZigbeeModule(zigbeeCFG.normalCFG.channel, zigbeeCFG.normalCFG.net);
            setTimeout(processEnd, 5000);
        }
        buttonStat = value;
    });
}

sp.on("open", process1);
sp.on("error", function (err) {
    console.log(err);
    if (err){
        throw err;
    }
    setTimeout(function () {
        sp.open();
    }, 2000);
});
var monitButtonTimer = setInterval(monitButton, 100);