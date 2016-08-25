var Util = require("util");
var Moment = require("moment");

var _trace_level = 0;

var GSUtil = {
	outputPrefix: "unknown",
    
    TRACE_INFO: 0,
    TRACE_WARNING: 1,
    TRACE_ERROR: 2,
    TRACE_DEBUG: 3,
    TRACE_DEBUG2: 4

};

GSUtil.setTraceLevel = function (trace_level) {
	_trace_level = trace_level;
};

process.on('SIGUSR2', function() {
    // SIGUSR2 可用来 toggle TRACE_DEBUG2: 4
    console.log('Got SIGUSR2.');
    console.log('current trace_level is: ' + _trace_level);
    if (_trace_level !== 4) {
        console.log('set trace_level to: 4');
        GSUtil.setTraceLevel(4);
    }
    else {
        console.log('set trace_level to: 0');
        GSUtil.setTraceLevel(0);
    }
});

GSUtil.clearLine = function () {
	Util.print("\x1b[2K");
	return GSUtil;
};

GSUtil.trace = function () {
	var args = Array.prototype.slice.call(arguments);
    var trace_level = args.shift();
    
	if (trace_level <= _trace_level) {
		var fmt = args.shift();
		fmt = "%s\x1b[30;1m[%d][%s]\x1b[0m " + fmt;
		args = [fmt, GSUtil.outputPrefix, process.pid, Moment().format("HH:mm:ss.S")].concat(args);
		Util.print(Util.format.apply(this, args));	
	}
    
	return GSUtil;
};

GSUtil.print = function () {
	var args = Array.prototype.slice.call(arguments);
	var fmt = args.shift();

	fmt = "%s[%d][%s] " + fmt;

	args = [fmt, GSUtil.outputPrefix, process.pid, Moment().format("HH:mm:ss.S")].concat(args);

	Util.print(Util.format.apply(this, args));	
	return GSUtil;
};

var _step=1;
GSUtil.showIdle = function (){
	setInterval(function (){
		if (_step > 5) _step = 1;
		GSUtil.clearLine().print("%s\r", Array(_step+1).join('.'));
		_step++;
	}, 1000);
};

GSUtil.toHex = function (n, len) {
	var s = n.toString(16);
	if (len && s.length < len) {
		s = Array(len - s.length + 1).join('0') + s;
	}
	return s;
};

module.exports = GSUtil;
