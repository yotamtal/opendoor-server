
const http          = require('http');
const Dispatcher    = require('httpdispatcher');
const fs            = require('fs');
const spawn         = require('child_process').spawn;
const socketIO      = require('socket.io');
const middleware    = require('socketio-wildcard')();
const kermit        = spawn('kermit' ,[__dirname + '/opendoor.sh'] );
const port          = process.argv[2] || 3333;

let dispatcher      = new Dispatcher();
let opening         = false;

kermit.stderr.on('data', (data) => console.log(`ps stderr: ${data}`) );
kermit.on('close', (code) => code !== 0 && console.log(`ps process exited with code ${code}`) );
kermit.stdout.on('data', (data) => {
    let msegSplit = data.toString().split('\n');
    // console.log(data.toString());
    if( msegSplit[0].startsWith('?OpenSSL') ) 
        kermit.stdin.write('AT+VDR=1,4\r\n');
    if( msegSplit[0].startsWith('BUSY') ) 
        kermit.stdin.write('ATH1\r\n');
    if( msegSplit[0].startsWith('NO CARRIER') ) 
        kermit.stdin.write('ATH1\r\n');
    // if( msegSplit.length >= 2 && msegSplit[2].startsWith('RING') ) 
        // console.log('Incoming landline call');
    if( msegSplit.length >= 5 && msegSplit[6].startsWith('RING') ){
        // console.log('Doorphone');
        ringing = true;
        io.emit('ringing', {});
        setTimeout(function(){ 
            ringing = false;
        }, 10000);
    }
});

let open_door = (uuid, from_home) => {
    /***
    * Get allowed devices UUID from stored JSON
    */
    try {
        let obj = JSON.parse(fs.readFileSync(__dirname + '/devices.json', 'utf-8'))
        /***
         * If device connected from home
         * and not listed in allowed JSON
         * add the UUID to the whitelist
         */
        if(from_home && obj.allowed.indexOf(uuid) === -1){
            obj.allowed.push(uuid)
            json = JSON.stringify(obj)
            fs.writeFile(__dirname + '/devices.json', json, 'utf8', (e) => e === null && console.log('Added a new device'))
            return 'added'
        }

        /***
         * Device is whitelisted - Try opening the door
         */
        if(obj.allowed.indexOf(uuid) !== -1){
            /***
             * Abort if someone already opened 
             * in the last 10 secondes
             */
            if(opening) return 'busy'

            /***
             * All clear - Open!
             */
            else {
                console.log(new Date() + ': Opening the door');

                opening = true;

                kermit.stdin.write('ATH1\r\n')
                kermit.stdin.write('ATDP551\r\n')
                
                setTimeout( () => opening = false, 10000)

                return 'opening'
            }

        }
        /***
         * Device is not whitelisted 
         * and not local connection]
         * Deny request
         */
        else return 'denied' 
            
    } catch (err) {
        console.log(err)
        console.log('JSON read error!')
        return 'error' 
    }
    
}

let server_config = (request, response) => {
    try {
        // log the request on console
        console.log(request.url)
        // Dispatch
        dispatcher.dispatch(request, response)
    } catch(err) {
        console.log(err)
    }
}

app = http.createServer(server_config);

dispatcher.onPost("/open", function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    let payload = JSON.parse(req.body);
    let open_res = 'denied';
    if(payload && payload.uuid)
        open_res = open_door(payload.uuid)
    
    res.end(JSON.stringify({"res":open_res}));
});


io = socketIO(app)
io.use(middleware)

io.on('error', (e) => console.log(e) )
io.on('connection', (socket) => {
    /**
     * Get connected client IP adress
     */
    let clientIPV4 = socket.handshake.address.split('::ffff:')[1];

    // console.log(clientIPV4 + ' connected');
    // socket.on('disconnect', () => console.log(clientIPV4 + ' disconnected') );

    socket.on('*', function (payload) {
        
        let uuid = payload.data[1].uuid,
            action = payload.data[0]

        /***
         * If ip starts with a local ip address numbers
         * Allow device to be added to stored JSON
         */
        let from_home = false,
            req_ip = clientIPV4.split('.');

        if(req_ip[0] == "10" && req_ip[1] == "100" && req_ip[2] == '102') 
            from_home = true;

        /**
         * If action requested is 'open' and uuid is set...
         */
        if(action === 'open' && uuid){
            let open_res = open_door(uuid, from_home);
            switch(open_res){
                case 'opening':
                    socket.broadcast.emit('opening', { uuid: uuid })
                    break;
                default:
                    socket.emit(open_res, { uuid: uuid })
                    break;
            }
        }
        
        /***
         * Unkown action
         */
        else socket.emit('denied', { uuid: uuid });

    });

    socket.on('disconnect', () => {
        if(Object.keys(io.sockets.sockets).length === 0 ) 
            broadcast = null;
     });
});

console.log(' [*] Listening' );
app.listen(port);

