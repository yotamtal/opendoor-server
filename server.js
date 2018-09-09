
const app           = require('http').createServer(handler);
const path          = require('path');
const url           = require('url');
const fs            = require('fs');
const spawn         = require('child_process').spawn;
const io            = require('socket.io')(app);
const middleware    = require('socketio-wildcard')();
const kermit        = spawn('kermit' ,[__dirname + '/opendoor.sh'] );
const port          = process.argv[2] || 3333;

let opening         = false;

kermit.stdout.on('data', (data) => {
    let msegSplit = data.toString().split('\n');
    console.log(data.toString());
    if( msegSplit[0].startsWith('?OpenSSL') ) 
        kermit.stdin.write('AT+VDR=1,4\r\n');
    if( msegSplit[0].startsWith('BUSY') ) 
        kermit.stdin.write('ATH1\r\n');
    if( msegSplit[0].startsWith('NO CARRIER') ) 
        kermit.stdin.write('ATH1\r\n');
    // if( msegSplit.length >= 2 && msegSplit[2].startsWith('RING') ) 
        // console.log('Incoming landline call');
    if( msegSplit.length >= 5 && msegSplit[6].startsWith('RING') ){
        console.log('Doorphone');
        ringing = true;
        io.emit('ringing', {});
        setTimeout(function(){ 
            ringing = false;
        }, 10000);
    }
});

kermit.stderr.on('data', (data) => {
    console.log(`ps stderr: ${data}`);
});

kermit.on('close', (code) => {
    if (code !== 0) {
        console.log(`ps process exited with code ${code}`);
    }
});

io.on('error', function(e){	
	console.log(e)
});

function handler (req, res) {
    // parse URL
    const parsedUrl = url.parse(req.url);
    // extract URL path serve index.html by default
    let pathname = `.${parsedUrl.pathname}`;
    if(pathname === './') 
        pathname = `./index.html`;
    // based on the URL path, extract the file extention. e.g. .js, .doc, ...
    const ext = path.parse(pathname).ext;
    // maps file extention to MIME typere
    const map = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };

    fs.exists(pathname, function (exist) {
        if(!exist) {
            // if the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // if is a directory search for index file matching the extention
        if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

        // read file from file system
        fs.readFile(pathname, function(err, data){
            if(err){
            res.statusCode = 500;
            res.end(`Error getting the file: ${err}.`);
            } else {
            // if the file is found, set Content-type and send data
            res.setHeader('Content-type', map[ext] || 'text/plain' );
            res.end(data);
            }
        });
    });
}

io.use(middleware);
io.on('connection', function (socket) {
    let clientIPV4 = socket.handshake.address.split('::ffff:')[1];
    console.log(clientIPV4 + ' connected');
    socket.on('disconnect', function() {
        console.log(clientIPV4 + ' disconnected');
    });
    socket.on('*', function (data) {
        let uuid = data.data[1].uuid;
        let action = data.data[0];
        let fromHome = false;
        let reqIp = clientIPV4.split('.');
        if(reqIp[0] == "10" && reqIp[1] == "100" && reqIp[2] == '102')
            fromHome = true;

        if(action === 'open' && uuid){
            fs.readFile(__dirname + '/devices.json', 'utf8', function readFileCallback(err, file){
                if (err)
                    console.log(err);
                else {
                obj = JSON.parse(file); 
                if(fromHome && obj.allowed.indexOf(uuid) === -1){
                    obj.allowed.push(uuid);
                    json = JSON.stringify(obj);
                    socket.emit('added', { uuid: uuid })
                    fs.writeFile(__dirname + '/devices.json', json, 'utf8', (e) => e === null && console.log('Added a new device')); 
                }
                if(obj.allowed.indexOf(uuid) !== -1){
                    if(opening === false){
                        console.log(new Date() + ': Opening the door');
                        opening = true;
                        // console.log(opening);
                        socket.broadcast.emit('opening', { uuid: uuid })
                        kermit.stdin.write('ATH1\r\n');
                        kermit.stdin.write('ATDP551\r\n');
                        setTimeout(function(){ 
                            opening = false;
                            // console.log(opening);
                        }, 10000);
                    } else {
                        console.log('busy');
                        socket.emit('busy', { uuid: uuid });
                    }
                } else {
                    socket.emit('denied', { uuid: uuid })
                }
            }});
        } else socket.emit('denied', { uuid: uuid })
    });
    socket.on('disconnect', function() {
        if(Object.keys(io.sockets.sockets).length === 0 ) 
            broadcast = null;
     });
});

console.log(' [*] Listening' );
app.listen(port);

