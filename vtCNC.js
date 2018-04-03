var SerialPort = require('serialport');
var M119;
var cmdInProg = false;
var probeStatus = 0;
var subscribedReader;
var port;
var parser;

function availablePorts(callback) {
    SerialPort.list(function (err, results)
    {
        if (err)
        {
            throw err;
        }
        var JSONstr = JSON.stringify(results);
        callback(JSONstr);
    })
    
};

function start(cmd) {
    port = new SerialPort(cmd, {
        buadRate: 115200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
    });
    init();
};

function sendCommand(cmd) {
    Gstack.push(cmd);
    processGstack();
};

function subscribeRead(callback) {
    subscribedReader = callback;
};

var probedPoints = [];

var Gstack = [];
// Gstack.push('G0 Z5 F3000')
// Gstack.push('G0 X0 Y0 F300')
// Gstack.push('G38.3 Z-20 F50')
// //Gstack.push('%wait')
// Gstack.push('G0 Z5 F3000')
// Gstack.push('G0 X100 Y0 F300')
// Gstack.push('G38.3 Z-20 F50')
// //Gstack.push('%wait')
// Gstack.push('G0 Z5 F3000')
// Gstack.push('G0 X0 Y100 F300')
// Gstack.push('G38.3 Z-20 F50')
// ////Gstack.push('%wait')
// Gstack.push('G0 Z5 F3000')
// Gstack.push('G0 X100 Y100 F300')
// Gstack.push('G38.3 Z-20 F50')
// //Gstack.push('%wait')
// Gstack.push('G0 Z5 F3000')
// Gstack.push('G0 X0 Y0 F300')

module.exports = {
    sendCommand: sendCommand,
    subscriber: subscribeRead,
    start: start,
    availablePorts: availablePorts
}

writeBufGcode = function (Gstring) {
    var buf = Buffer.from(Gstring, 'utf8')//.toString('hex');
    var bufEnd = Buffer.from('0a', 'hex');
    buf = Buffer.concat([buf,bufEnd]);
    writePort(buf);
} 

writePort = function (line) {
    port.write(line, function(err) {
        if (err) {
            return console.log('Error on write: ', err.message);
        }
        console.log('message written line: ' + line);
    });   
}


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


function waitAndDo(times) {
    setTimeout(function() {
      // Do something here
      //console.log('Doing a request');
      writePort('?'); 

      waitAndDo();
    }, 1000);
}

var processGstack = function() {
    console.log('prcessing g-stack...');

    if (cmdInProg) {
        console.log('waiting...');
        return;
    }

    if (Gstack.length == 0) {
        console.log('waiting...');
        return;
    }

    var isProbe = isProbeFunc(Gstack[0]);
    if (isProbe) {

        if (probeStatus == 0) {
            console.log('sending probe g-code...');
            var gCode = Gstack.shift();
            cmdInProg = true;
            writeBufGcode(gCode);             
        } else {
            console.log('waiting...');
        }

    } else {
        console.log('sending g-code...');
        var gCode = Gstack.shift();
        cmdInProg = true;
        writeBufGcode(gCode);             
    }
}

var openCallback = function () {
            waitAndDo(2000); // Do it 2000 times
            //writePort(Buffer.from('6d656d', 'hex')); //mem
            //writePort(Buffer.from('4d3131390d', 'hex')); //M119
            //writePort(Buffer.from('4d3131390a', 'hex')); //M119
            //writePort(Buffer.from('4730205835300a', 'hex')); //G0 X50
            //writeBufGcode('G0 X0 Y0 Z0');

            //processGstack();
            //writeBufGcode('M119');
            writePort(Buffer.from('76657273696f6e0a', 'hex')); //version
            //writePort(Buffer.from('24470a', 'hex')); //$G            
            //writePort(Buffer.from('4733300d', 'hex')); //G30
            //writePort('?'); 
            //writePort('$H'); 
            //writePort('M119'); 
            //writePort("4733300d"); 
            // port._read(6000);
            //writePort('G0 F300');

    // console.log('open callback');
    // setTimeout(function () {
    //     writePort('version');   
    //     //writePort('%wait');   
    //     writePort('?'); 
    //     //writePort('$G');  
    // },1000)
    processGstack();
}

function init() {
    port.on('close', function () {
        console.log('close');
        port.open(openCallback);
    });
    port.on('error', function () {
        console.log('error');
    });
    parser = port.pipe(new SerialPort.parsers.Readline({ delimiter: '\n' }));

    parser.on('data', function (data) {

        data = data.replace(/\r?\n|\r/g,'');

        subscribedReader(data);

        var words = data.split(' ');
        console.log('data: '+data);
        if (words[0] === 'ok') {
            cmdInProg = false;
            processGstack();
            return;
        }

        if(data.indexOf("PRB:") != -1 ) {
            console.log('PRB:');
            probedPoints.push(data);
            probeStatus = 1;
            getProbeStatus();
        };

        var words2 = data.split('Probe:');
        if (words2.length > 1) {
            var word3 = words2[1].replace(' ','');
            if (word3 == '0') {
                probeStatus = 0;
                console.log('probe = 0');
                return;
            } else {
                probeStatus = 1;
                console.log('probe = 1');
                return;
            }     
        }

    });

    port.open(openCallback);
}

function getProbeStatus() {
    if (probeStatus == 0) {
        return false;
    }
    setTimeout(function() {
    // Do something here
    //console.log('Doing a request');
    writePort(Buffer.from('4d3131390a', 'hex')); //M119
    processGstack();
    getProbeStatus();
    }, 1000);
}

var isProbeFunc = function (gCode) {
    var words = gCode.split(' ');
    if (words[0] == 'G38.2' || words[0] == 'G38.3') {
        return true;
    }
};

