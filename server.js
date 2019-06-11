
const http          = require('http');
const path          = require('path');
const url           = require('url');
const fs            = require('fs');
const spawn         = require('child_process').spawn;
const socketIO      = require('socket.io');
const middleware    = require('socketio-wildcard')();
const kermit        = spawn('kermit' ,[__dirname + '/opendoor.sh'] );
const port          = process.argv[2] || 3333;

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

let server_config = (req, res) => {
    res.statusCode = 400;
    res.end(`Nothing to do here.`);
}

app = http.createServer(server_config);
io = socketIO(app);

io.on('error', (e) => console.log(e) );
io.use(middleware);
io.on('connection', (socket) => {

    /**
     * Get connected client IP adress
     */
    let clientIPV4 = socket.handshake.address.split('::ffff:')[1];

    // console.log(clientIPV4 + ' connected');
    // socket.on('disconnect', () => console.log(clientIPV4 + ' disconnected') );

    socket.on('*', function (data) {
        let uuid = data.data[1].uuid;
        let action = data.data[0];

        /***
         * If ip starts with a local ip address numbers
         * Allow device to be added to stored JSON
         */
        let fromHome = false;
        let reqIp = clientIPV4.split('.');
        if(reqIp[0] == "10" && reqIp[1] == "100" && reqIp[2] == '102') 
            fromHome = true;

        /**
         * If action requested is 'open' and uuid is set...
         */
        if(action === 'open' && uuid){
            /***
             * Get allowed devices UUID from stored JSON
             */
            try {
                let obj = JSON.parse(fs.readFileSync('/devices.json', 'utf-8'))
                /***
                 * If device connected from home
                 * and not listed in allowed JSON
                 * add the UUID to the whitelist
                 */
                if(fromHome && obj.allowed.indexOf(uuid) === -1){
                    obj.allowed.push(uuid);
                    json = JSON.stringify(obj);
                    socket.emit('added', { uuid: uuid })
                    fs.writeFile(__dirname + './devices.json', json, 'utf8', (e) => e === null && console.log('Added a new device')); 
                }

                /***
                 * Device is whitelisted - Try opening the door
                 */
                if(obj.allowed.indexOf(uuid) !== -1){
                    /***
                     * Abort if someone already opened 
                     * in the last 10 secondes
                     */
                    if(opening) socket.emit('busy', { uuid: uuid });

                    /***
                     * All clear - Open!
                     */
                    else {
                        console.log(new Date() + ': Opening the door');

                        opening = true;
                        socket.broadcast.emit('opening', { uuid: uuid })

                        kermit.stdin.write('ATH1\r\n');
                        kermit.stdin.write('ATDP551\r\n');

                        setTimeout( () => opening = false, 10000);
                    }

                }
                /***
                 * Device is not whitelisted 
                 * and not local connection]
                 * Deny request
                 */
                else socket.emit('denied', { uuid: uuid })

            } catch (err) {
                console.log(err)
                console.log('JSON read error!');
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

