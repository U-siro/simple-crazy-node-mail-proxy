var net = require('net');
var dns = require('dns');

var server = net.createServer(function (socket) {


    var client = new net.Socket();

    // works like server temporary

    let cachedCommands = []
    let cachedResponses = 0

    let sender = ''
    let receiver = ''
    let originalReceiver = ''

    socket.write('220 culture-skh.pislhost.xyz ESMTP postfixNode\r\n');

    let proxied = false
    socket.on('error', () => {})
    socket.on('data', (data) => {
        console.log(data.toString())
        if (!proxied) { // 프록시 된 이후, 서버는 데이터 이외에는 전혀 관여 금지
            cachedCommands.push(data)
            let msg = data.toString()
            if (msg.startsWith('HELO') || msg.startsWith('EHLO') || msg.startsWith('helo') || msg.startsWith('ehlo')) {
                socket.write('250 culture-skh.pislhost.xyz, I am glad to meet you\r\n')
                console.log('250 culture-skh.pislhost.xyz, I am glad to meet you')
            } else if (msg.startsWith('MAIL FROM') || msg.startsWith('mail from')) {
                socket.write('250 Ok\r\n')
                console.log('250 Ok')
                sender = msg.split(':<')[1].split('>')[0]
                console.log('sender: ' + sender)
            } else if (msg.startsWith('RCPT TO') || msg.startsWith('rcpt to')) {
                console.log('Proxying..')

                // Let's start proxy
                console.log('SMTP MSG ' + msg)
                originalReceiver = msg.split(':<')[1].split('>')[0]
                console.log('original reciver: ' + originalReceiver)
                // ex: castarnet.gmail.com
                receiver = originalReceiver.split('@')[0].replace('.', '@')
                console.log('final reciver: ' + receiver)
                let receiverServer = receiver.split('@')[1]
                dns.resolveMx(receiverServer, function (err, addresses) {
                    if (err) throw err;

                    console.log('[SMTP Detected]' + addresses[0]['exchange']);


                    client.connect(25, addresses[0]['exchange'], function () {
                        console.log('Connected');
                        //socket.pipe(client);
                        client.on('data', (data) => {

                            if (cachedCommands[cachedResponses]) {
                                console.log(cachedResponses + '(max ' + cachedCommands.length + '): ' + data.toString())
                                if (cachedCommands[cachedResponses].toString().startsWith('mail') || cachedCommands[cachedResponses].toString().startsWith('MAIL')) {
                                    console.log('send from packet')
                                    client.write('MAIL FROM:<proxy@culture-skh.pislhost.xyz>\r\n')
                                } else if (cachedCommands[cachedResponses].toString().startsWith('rcpt') || cachedCommands[cachedResponses].toString().startsWith('RCPT')) {
                                    console.log('send rcpt packet')
                                    client.write('RCPT TO:<' + receiver + '>\r\n')
                                    console.log('going to real!')
                                    proxied = true
                                    client.on('end', socket.end)
                                    socket.on('end', client.end)
                                } else {
                                    client.write(cachedCommands[cachedResponses])
                                }
    
                                cachedResponses++
                            } else {
                                console.log(data.toString())
                                // Client -> Server

                                socket.write(data.toString())

                                

                            }




                        })
                    });

                    client.on('error', () => {})

                });

            } else {
                socket.write('502 No such command, maybe honoka have?')
            }
        } else {
            console.log('write data')
            // Server -> Client
            client.write(data.toString().replace(originalReceiver, receiver).replace(sender, 'proxy@culture-skh.pislhost.xyz').replace(originalReceiver, receiver).replace(sender, 'proxy@culture-skh.pislhost.xyz').replace(originalReceiver, receiver).replace(sender, 'proxy@culture-skh.pislhost.xyz'))
        }
    })





});

server.on('error', () => {})

server.listen(25);
