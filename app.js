const express = require('express');
const app = express();
const http = require('http').Server(app);
const { Server } = require('socket.io');
const io = new Server(http);
const path = require('path');

const public_dir = path.join(__dirname,'./public/');

app.use(express.static(public_dir));

io.on('connection', (soc) => {
    console.log('New connection:\t\t', soc.id);
    
    soc.on('signup', ({ fname, lname })=>{
        soc.fname = fname;
        soc.lname = lname;
        console.log('New signup from\t\t',soc.id,':\n\t',soc.fname,soc.lname);
        //give new user tinfo about others users,
        //give previous users info about new user.
        notifyOnlineUsers(soc);
    });

    soc.on('broadcast-message-to-server',(msgText)=>{
        console.log('New message from\t',soc.id,' (',soc.fname,soc.lname,'):\n\t',msgText);
        let msg = {
            id: soc.id,
            date: Date(),
            fname: soc.fname,
            lname: soc.lname,
            text: msgText
        };
        //to sender
        soc.emit('message-to-client',msg);
        //to everyone else
        soc.broadcast.emit('message-to-client',msg);
    });

    soc.on('p2p-message-to-server',(recipientID, msgText)=>{
        console.log('New message from\t',soc.id,' (',soc.fname,soc.lname,')');
        let recipientSoc = io.sockets.sockets.get(recipientID);
        console.log('\t\tTo:\t',recipientID,' (',recipientSoc.fname,recipientSoc.lname,'):');
        console.log('\t',msgText);
        let msg = {
            isP2P: true,
            date: Date(),
            //sender data
            id: soc.id,
            fname: soc.fname,
            lname: soc.lname,
            //recipient data
            recipientID: recipientSoc.id,
            recipientFname: recipientSoc.fname,
            recipientLname: recipientSoc.lname,
            //payload
            text: msgText
        };
        //to recipient
        io.to(recipientID).emit('message-to-client',msg);
        //to sender, if not same as recipient
        if (recipientID != soc.id) {
            soc.emit('message-to-client',msg);
        }
    });

    soc.on('disconnect',()=>{
        console.log('User disconnected:\t', soc.id);
        //give users info about disconnected user.
        notifyOnlineUsers(soc);
    });
});

/**
 * Helper method
 */
const notifyOnlineUsers = (soc) => {     
    io.fetchSockets()
    .then((sockets) => {
        let users = [];
        sockets.forEach(socket => {
            let user = {
                id: socket.id,
                fname: socket.fname,
                lname: socket.lname
            }
            users.push(user);
        });
        return users;
    }).then((users) => {
        console.log(`Notifying that there are now ${users.length} users online.`);
        //to sender
        soc.emit('all-online-users',users);
        //to everyone else
        soc.broadcast.emit('all-online-users',users);
    }).catch(console.log);
}

http.listen(3000);