const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// simple in-memory stores
const users = {};      // username -> { password, displayName }
const sockets = {};    // username -> socket.id

function broadcastUserList() {
    io.emit('users', Object.keys(users));
}

io.on('connection', (socket) => {
    console.log('client connected', socket.id);

    socket.on('signup', ({ username, password }, cb) => {
        if (users[username]) {
            return cb({ success: false, error: 'Username taken' });
        }
        users[username] = { password };
        sockets[username] = socket.id;
        socket.username = username;
        cb({ success: true, user: { username } });
        broadcastUserList();
    });

    socket.on('login', ({ username, password }, cb) => {
        const u = users[username];
        if (!u || u.password !== password) {
            return cb({ success: false, error: 'Invalid credentials' });
        }
        sockets[username] = socket.id;
        socket.username = username;
        cb({ success: true, user: { username } });
        broadcastUserList();
    });

    socket.on('sendMessage', (msg) => {
        // msg = { to, text, from }
        if (!msg.to || !msg.from || !msg.text) return;
        const targetSocket = sockets[msg.to];
        if (targetSocket) {
            io.to(targetSocket).emit('message', msg);
        }
        // echo back to sender so it shows up instantly
        socket.emit('message', msg);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            delete sockets[socket.username];
            console.log(socket.username, 'disconnected');
        }
    });
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
