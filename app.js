// =====================
// Global App Instance
// =====================
let app = null;

// =====================
// Data Management
// =====================

class MessagingApp {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.currentChatType = 'user';

        // network connection
        this.socket = io();
        this.setupSocket();

        this.loadCurrentUser();
        this.initializeEventListeners();
        this.render();
    }

    // Storage Keys
    get STORAGE_KEY() {
        return 'messaging_app_users';
    }

    get MESSAGES_KEY() {
        return 'messaging_app_messages';
    }

    get ROOMS_KEY() {
        return 'messaging_app_rooms';
    }

    get FRIENDS_KEY() {
        return 'messaging_app_friends';
    }

    get FRIEND_REQUESTS_KEY() {
        return 'messaging_app_friend_requests';
    }

    // =====================
    // Network / Socket Helpers
    // =====================

    setupSocket() {
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connect error:', error);
        });

        // receive a message from the server and save it locally
        this.socket.on('message', (msg) => {
            // save message so history persists offline as well
            this.saveMessage(msg.from, msg.to, {
                type: msg.type || 'text',
                text: msg.text,
                filename: msg.filename,
                data: msg.data
            });

            // if currently in this conversation, re-render
            if (this.currentChat === msg.from || this.currentChat === msg.to) {
                this.renderMessages();
            }
        });

        // list of active users (optionally)
        this.socket.on('users', (list) => {
            // naive: store in localStorage for UI convenience
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.reduce((acc,u)=>{acc[u]= {username:u};return acc;}, {})));
            if (this.currentChatType === 'user') this.updateAppUI();
        });
    }

    // =====================
    // Auth Methods
    // =====================

    loadCurrentUser() {
        const stored = sessionStorage.getItem('current_user');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    }

    saveCurrentUser() {
        if (this.currentUser) {
            sessionStorage.setItem('current_user', JSON.stringify(this.currentUser));
        }
    }

    getAllUsers() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    saveAllUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    }

    // ===== friendship =====
    getAllFriends() {
        const stored = localStorage.getItem(this.FRIENDS_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    saveAllFriends(friends) {
        localStorage.setItem(this.FRIENDS_KEY, JSON.stringify(friends));
    }

    // ===== friend requests =====
    getAllFriendRequests() {
        const stored = localStorage.getItem(this.FRIEND_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    saveAllFriendRequests(requests) {
        localStorage.setItem(this.FRIEND_REQUESTS_KEY, JSON.stringify(requests));
    }

    getFriendRequestsForCurrent() {
        if (!this.currentUser) return [];
        const all = this.getAllFriendRequests();
        return all[this.currentUser.username] || [];
    }

    getOutgoingFriendRequests() {
        if (!this.currentUser) return [];
        const all = this.getAllFriendRequests();
        const outgoing = [];
        for (const user in all) {
            if (all[user].includes(this.currentUser.username)) {
                outgoing.push(user);
            }
        }
        return outgoing;
    }

    cancelFriendRequest(toUsername) {
        if (!this.currentUser) return;
        const all = this.getAllFriendRequests();
        if (!all[toUsername]) return;
        all[toUsername] = all[toUsername].filter(u => u !== this.currentUser.username);
        this.saveAllFriendRequests(all);
    }

    sendFriendRequest(toUsername) {
        if (!this.currentUser) return { success: false, error: 'Not logged in' };
        const users = this.getAllUsers();
        if (!users[toUsername]) {
            return { success: false, error: 'User not found' };
        }
        if (toUsername === this.currentUser.username) {
            return { success: false, error: 'Cannot friend yourself' };
        }
        const friends = this.getFriendsForCurrent();
        if (friends.includes(toUsername)) {
            return { success: false, error: 'Already friends' };
        }
        const all = this.getAllFriendRequests();
        if (!all[toUsername]) all[toUsername] = [];
        if (all[toUsername].includes(this.currentUser.username)) {
            return { success: false, error: 'Request already sent' };
        }
        all[toUsername].push(this.currentUser.username);
        this.saveAllFriendRequests(all);
        return { success: true };
    }

    acceptFriendRequest(fromUsername) {
        if (!this.currentUser) return { success: false, error: 'Not logged in' };
        const requests = this.getAllFriendRequests();
        const arr = requests[this.currentUser.username] || [];
        if (!arr.includes(fromUsername)) {
            return { success: false, error: 'No such request' };
        }
        requests[this.currentUser.username] = arr.filter(u => u !== fromUsername);
        this.saveAllFriendRequests(requests);
        this.addFriend(fromUsername);
        const allFriends = this.getAllFriends();
        if (!allFriends[fromUsername]) allFriends[fromUsername] = [];
        if (!allFriends[fromUsername].includes(this.currentUser.username)) {
            allFriends[fromUsername].push(this.currentUser.username);
            this.saveAllFriends(allFriends);
        }
        return { success: true };
    }

    declineFriendRequest(fromUsername) {
        if (!this.currentUser) return;
        const requests = this.getAllFriendRequests();
        const arr = requests[this.currentUser.username] || [];
        requests[this.currentUser.username] = arr.filter(u => u !== fromUsername);
        this.saveAllFriendRequests(requests);
    }

    getFriendsForCurrent() {
        if (!this.currentUser) return [];
        const all = this.getAllFriends();
        return all[this.currentUser.username] || [];
    }

    addFriend(username) {
        if (!this.currentUser) return { success: false, error: 'Not logged in' };
        const users = this.getAllUsers();
        if (!users[username]) {
            return { success: false, error: 'User not found' };
        }
        if (username === this.currentUser.username) {
            return { success: false, error: 'Cannot friend yourself' };
        }
        const all = this.getAllFriends();
        if (!all[this.currentUser.username]) all[this.currentUser.username] = [];
        if (all[this.currentUser.username].includes(username)) {
            return { success: false, error: 'Already friends' };
        }
        all[this.currentUser.username].push(username);
        this.saveAllFriends(all);
        return { success: true };
    }

    removeFriend(username) {
        if (!this.currentUser) return;
        const all = this.getAllFriends();
        if (!all[this.currentUser.username]) return;
        all[this.currentUser.username] = all[this.currentUser.username].filter(u => u !== username);
        this.saveAllFriends(all);
    }

    signup(username, password) {
        if (!username || !password) {
            return { success: false, error: 'Username and password required' };
        }
        if (username.length < 3) {
            return { success: false, error: 'Username must be at least 3 characters' };
        }
        if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }
        const users = this.getAllUsers();
        if (users[username]) {
            return { success: false, error: 'Username already exists' };
        }
        users[username] = {
            username,
            password,
            createdAt: new Date().toISOString()
        };
        this.saveAllUsers(users);
        this.currentUser = { username };
        this.saveCurrentUser();
        return { success: true };
    }

    login(username, password) {
        const users = this.getAllUsers();
        if (!users[username]) {
            return { success: false, error: 'User not found' };
        }
        if (users[username].password !== password) {
            return { success: false, error: 'Incorrect password' };
        }
        this.currentUser = { username };
        this.saveCurrentUser();
        return { success: true };
    }

    logout() {
        this.currentUser = null;
        this.currentChat = null;
        this.currentChatType = 'user';
        sessionStorage.removeItem('current_user');
        this.render();
    }

    // =====================
    // Message Methods
    // =====================

    getConversationKey(user1, user2) {
        const sorted = [user1, user2].sort();
        return `${sorted[0]}_${sorted[1]}`;
    }

    // ===== Room helpers =====
    getAllRooms() {
        const stored = localStorage.getItem(this.ROOMS_KEY);
        const rooms = stored ? JSON.parse(stored) : {};
        let changed = false;
        for (const name in rooms) {
            const parts = rooms[name].participants || [];
            if (parts.length === 0) {
                delete rooms[name];
                changed = true;
            }
        }
        if (changed) {
            this.saveAllRooms(rooms);
        }
        return rooms;
    }

    saveAllRooms(rooms) {
        localStorage.setItem(this.ROOMS_KEY, JSON.stringify(rooms));
    }

    getUserRooms() {
        const rooms = this.getAllRooms();
        return Object.keys(rooms).filter(r => rooms[r].participants.includes(this.currentUser.username)).sort();
    }

    getRoomMessages(roomName) {
        const rooms = this.getAllRooms();
        if (rooms[roomName]) {
            return rooms[roomName].messages || [];
        }
        return [];
    }

    saveRoomMessage(roomName, from, content) {
        const rooms = this.getAllRooms();
        if (!rooms[roomName]) return;
        if (!rooms[roomName].messages) {
            rooms[roomName].messages = [];
        }
        const msg = Object.assign({
            from,
            timestamp: new Date().toISOString()
        }, content);
        rooms[roomName].messages.push(msg);
        this.saveAllRooms(rooms);
    }

    joinRoom(roomName, password) {
        const rooms = this.getAllRooms();
        if (!rooms[roomName]) {
            return { success: false, error: 'Room not found' };
        }
        if (rooms[roomName].password !== password) {
            return { success: false, error: 'Incorrect room password' };
        }
        if (!rooms[roomName].participants.includes(this.currentUser.username)) {
            rooms[roomName].participants.push(this.currentUser.username);
            this.saveAllRooms(rooms);
        }
        return { success: true };
    }

    createRoom(roomName, password) {
        const rooms = this.getAllRooms();
        if (rooms[roomName]) {
            return { success: false, error: 'Room already exists' };
        }
        if (!password) {
            return { success: false, error: 'Password required to create room' };
        }
        rooms[roomName] = {
            password,
            participants: [this.currentUser.username],
            messages: []
        };
        this.saveAllRooms(rooms);
        return { success: true, created: true };
    }

    joinOrCreateRoom(roomName, password) {
        const rooms = this.getAllRooms();
        if (rooms[roomName]) {
            return this.joinRoom(roomName, password);
        } else {
            return this.createRoom(roomName, password);
        }
    }

    leaveRoom(roomName) {
        const rooms = this.getAllRooms();
        if (!rooms[roomName]) return;
        rooms[roomName].participants = rooms[roomName].participants.filter(u => u !== this.currentUser.username);
        if (rooms[roomName].participants.length === 0) {
            delete rooms[roomName];
        }
        this.saveAllRooms(rooms);
        if (this.currentChat === roomName && this.currentChatType === 'room') {
            this.currentChat = null;
            this.currentChatType = 'user';
        }
        this.updateAppUI();
    }

    getAllMessages() {
        const stored = localStorage.getItem(this.MESSAGES_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    saveAllMessages(messages) {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
    }

    getMessages(user1, user2) {
        const key = this.getConversationKey(user1, user2);
        const allMessages = this.getAllMessages();
        return allMessages[key] || [];
    }

    saveMessage(from, to, content) {
        const key = this.getConversationKey(from, to);
        const allMessages = this.getAllMessages();
        if (!allMessages[key]) {
            allMessages[key] = [];
        }
        const msg = Object.assign({
            from,
            to,
            timestamp: new Date().toISOString()
        }, content);
        allMessages[key].push(msg);
        this.saveAllMessages(allMessages);
    }

    sendTextMessage(text) {
        if (!this.currentChat || !text.trim()) return false;
        const msg = {
            from: this.currentUser.username,
            to: this.currentChat,
            type: 'text',
            text,
            timestamp: new Date().toISOString()
        };
        this.socket.emit('sendMessage', msg);
        // also save locally for history/offline
        this.saveMessage(msg.from, msg.to, { type: msg.type, text: msg.text });
        return true;
    }

    sendFileMessage(fileObj) {
        if (!this.currentChat || !fileObj) return false;
        const msg = {
            from: this.currentUser.username,
            to: this.currentChat,
            type: 'file',
            filename: fileObj.filename,
            data: fileObj.data,
            timestamp: new Date().toISOString()
        };
        // send to server for delivery
        this.socket.emit('sendMessage', msg);
        // also keep local copy
        try {
            this.saveMessage(msg.from, msg.to, Object.assign({ type: 'file' }, fileObj));
            return true;
        } catch (err) {
            console.error('error saving file message', err);
            alert('Failed to save file message (storage limit?)');
            return false;
        }
    }

    getDirectConversations() {
        const allMessages = this.getAllMessages();
        const conversations = new Set();
        for (const key in allMessages) {
            const [user1, user2] = key.split('_');
            const otherUser = user1 === this.currentUser.username ? user2 : user1;
            if (allMessages[key].length > 0) {
                conversations.add(otherUser);
            }
        }
        const friends = this.getFriendsForCurrent();
        friends.forEach(f => conversations.add(f));
        return Array.from(conversations).sort();
    }

    getConversations() {
        const directs = this.getDirectConversations().map(u => ({ name: u, type: 'user' }));
        const rooms = this.getUserRooms().map(r => ({ name: r, type: 'room' }));
        return [...rooms, ...directs];
    }

    // =====================
    // UI Methods
    // =====================

    render() {
        this.updateAuthUI();
        if (this.currentUser) {
            this.updateAppUI();
        }
    }

    updateAuthUI() {
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        if (this.currentUser) {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
        } else {
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    }

    updateAppUI() {
        this.updateCurrentUserDisplay();
        this.updateFriendsList();
        this.updateConversationsList();
        this.updateChatView();
    }

    updateCurrentUserDisplay() {
        const display = document.getElementById('currentUserDisplay');
        if (display) {
            display.textContent = `@${this.currentUser.username}`;
        }
    }

    // =====================
    // Friendship UI
    // =====================
    updateFriendsList() {
        const list = document.getElementById('friendsList');
        const datalist = document.getElementById('friendList');
        const inviteSelect = document.getElementById('inviteFriendSelect');
        const reqList = document.getElementById('friendRequestsList');
        if (!list || !datalist || !inviteSelect || !reqList) return;

        const friends = this.getFriendsForCurrent();
        const requests = this.getFriendRequestsForCurrent();
        list.innerHTML = '';
        datalist.innerHTML = '';
        inviteSelect.innerHTML = '';
        reqList.innerHTML = '';

        if (requests.length > 0) {
            const header = document.createElement('div');
            header.style.fontSize = '13px';
            header.style.color = '#333';
            header.style.marginBottom = '4px';
            header.textContent = 'Friend Requests';
            reqList.appendChild(header);

            requests.forEach(from => {
                const item = document.createElement('div');
                item.className = 'request-item';
                item.textContent = '@' + from;
                const accept = document.createElement('button');
                accept.className = 'request-button';
                accept.textContent = 'Accept';
                accept.onclick = () => {
                    this.acceptFriendRequest(from);
                    this.updateFriendsList();
                };
                const decline = document.createElement('button');
                decline.className = 'request-button decline';
                decline.textContent = 'Decline';
                decline.onclick = () => {
                    this.declineFriendRequest(from);
                    this.updateFriendsList();
                };
                item.appendChild(accept);
                item.appendChild(decline);
                reqList.appendChild(item);
            });
        }

        const outgoing = this.getOutgoingFriendRequests();
        if (outgoing.length > 0) {
            const hdr2 = document.createElement('div');
            hdr2.style.fontSize = '13px';
            hdr2.style.color = '#333';
            hdr2.style.marginBottom = '4px';
            hdr2.textContent = 'Pending (sent)';
            reqList.appendChild(hdr2);
            outgoing.forEach(to => {
                const item = document.createElement('div');
                item.className = 'request-item';
                item.textContent = '@' + to;
                const cancel = document.createElement('button');
                cancel.className = 'request-button decline';
                cancel.textContent = 'Cancel';
                cancel.onclick = () => {
                    this.cancelFriendRequest(to);
                    this.updateFriendsList();
                };
                item.appendChild(cancel);
                reqList.appendChild(item);
            });
        }

        friends.forEach(f => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            item.textContent = '@' + f;
            const rm = document.createElement('button');
            rm.className = 'friend-remove';
            rm.textContent = '×';
            rm.onclick = () => {
                this.removeFriend(f);
                this.updateFriendsList();
            };
            item.appendChild(rm);
            list.appendChild(item);

            const opt = document.createElement('option');
            opt.value = f;
            datalist.appendChild(opt);

            const invOpt = document.createElement('option');
            invOpt.value = f;
            inviteSelect.appendChild(invOpt);
        });
    }

    handleAddFriend(name) {
        const errorEl = document.getElementById('addFriendError');
        if (!name) return;
        const result = this.sendFriendRequest(name);
        if (result.success) {
            document.getElementById('addFriendInput').value = '';
            if (errorEl) errorEl.textContent = 'Request sent';
            this.updateFriendsList();
        } else {
            if (errorEl) errorEl.textContent = result.error;
            else alert(result.error);
        }
    }

    handleInviteFriend() {
        const select = document.getElementById('inviteFriendSelect');
        const friend = select.value;
        if (!friend) return;
        if (this.currentChatType !== 'room' || !this.currentChat) {
            alert('No room selected');
            return;
        }
        const res = this.inviteFriendToRoom(friend);
        if (!res.success) {
            alert(res.error);
        } else {
            alert(`@${friend} invited to room`);
            this.updateAppUI();
        }
    }

    inviteFriendToRoom(friend) {
        if (!this.currentChat || this.currentChatType !== 'room') {
            return { success: false, error: 'Not in room' };
        }
        const rooms = this.getAllRooms();
        const room = rooms[this.currentChat];
        if (!room) {
            return { success: false, error: 'Room does not exist' };
        }
        if (!room.participants.includes(friend)) {
            room.participants.push(friend);
            this.saveAllRooms(rooms);
            return { success: true };
        } else {
            return { success: false, error: 'Already in room' };
        }
    }

    updateConversationsList() {
        const list = document.getElementById('conversationsList');
        list.innerHTML = '';

        const conversations = this.getConversations();

        if (conversations.length === 0) {
            list.innerHTML = '<p style="color: #999; padding: 20px 5px; text-align: center; font-size: 12px;">No conversations yet</p>';
            return;
        }

        conversations.forEach(conv => {
            const { name, type } = conv;
            const item = document.createElement('div');
            item.className = 'conversation-item';
            if (this.currentChat === name && this.currentChatType === type) {
                item.classList.add('active');
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'conversation-name';
            nameSpan.textContent = (type === 'room' ? '#' : '@') + name;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'conversation-delete';
            deleteBtn.textContent = type === 'room' ? 'Leave' : 'Delete';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (type === 'room') {
                    this.leaveRoom(name);
                } else {
                    this.deleteConversation(name);
                }
            };

            item.onclick = () => this.selectChat(name, type);
            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);
            list.appendChild(item);
        });
    }

    selectChat(name, type = 'user') {
        this.currentChat = name;
        this.currentChatType = type;
        this.updateAppUI();
    }

    deleteConversation(username) {
        if (!confirm(`Delete all messages with @${username}?`)) return;
        const key = this.getConversationKey(this.currentUser.username, username);
        const allMessages = this.getAllMessages();
        delete allMessages[key];
        this.saveAllMessages(allMessages);
        if (this.currentChat === username) {
            this.currentChat = null;
        }
        this.updateAppUI();
    }

    updateChatView() {
        const noChatSelected = document.getElementById('noChatSelected');
        const chatView = document.getElementById('chatView');

        if (!this.currentChat) {
            noChatSelected.classList.remove('hidden');
            chatView.classList.add('hidden');
            return;
        }

        noChatSelected.classList.add('hidden');
        chatView.classList.remove('hidden');

        const chatWithElement = document.getElementById('chatWith');
        chatWithElement.textContent = (this.currentChatType === 'room' ? '#' : '@') + this.currentChat;

        const inviteSection = document.getElementById('roomInviteSection');
        if (this.currentChatType === 'room' && inviteSection) {
            const friends = this.getFriendsForCurrent();
            const room = this.getAllRooms()[this.currentChat] || { participants: [] };
            const avail = friends.filter(f => !room.participants.includes(f));
            if (avail.length > 0) {
                inviteSection.classList.remove('hidden');
            } else {
                inviteSection.classList.add('hidden');
            }
        } else if (inviteSection) {
            inviteSection.classList.add('hidden');
        }

        this.renderMessages();
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        let messages = [];
        if (this.currentChatType === 'room') {
            messages = this.getRoomMessages(this.currentChat);
        } else {
            messages = this.getMessages(this.currentUser.username, this.currentChat);
        }

        if (messages.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#999';
            placeholder.style.textAlign = 'center';
            placeholder.style.marginTop = '20px';
            placeholder.textContent = 'No messages yet';
            container.appendChild(placeholder);
        }

        messages.forEach(msg => {
            const sent = this.currentUser && msg.from &&
                (msg.from === this.currentUser.username ||
                 msg.from.toLowerCase() === this.currentUser.username.toLowerCase());

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sent ? 'sent' : 'received'}`;

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            if (msg.type === 'file') {
                if (msg.data && msg.data.startsWith('data:image')) {
                    const img = document.createElement('img');
                    img.src = msg.data;
                    img.style.maxWidth = '200px';
                    img.style.maxHeight = '200px';
                    bubble.appendChild(img);
                    const name = document.createElement('div');
                    name.textContent = msg.filename;
                    name.style.fontSize = '12px';
                    bubble.appendChild(name);
                } else {
                    const link = document.createElement('a');
                    link.href = msg.data;
                    link.textContent = msg.filename || 'file';
                    link.download = msg.filename;
                    bubble.appendChild(link);
                }
            } else {
                bubble.textContent = msg.text;
            }

            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            const date = new Date(msg.timestamp);
            timestamp.textContent = this.formatTime(date);

            const senderDiv = document.createElement('div');
            senderDiv.className = 'message-sender';
            senderDiv.textContent = sent ? 'You' : '@' + msg.from;

            messageDiv.appendChild(bubble);
            messageDiv.appendChild(timestamp);
            messageDiv.appendChild(senderDiv);
            container.appendChild(messageDiv);
        });

        container.scrollTop = container.scrollHeight;
    }

    formatTime(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (msgDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    // =====================
    // Event Handlers
    // =====================

    initializeEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('signupBtn').addEventListener('click', () => this.handleSignup());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        document.getElementById('sendBtn').addEventListener('click', () => this.handleSendMessage());
        document.getElementById('sendFileBtn').addEventListener('click', () => this.handleSendFile());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        document.getElementById('startChatBtn').addEventListener('click', () => this.handleStartChat());
        document.getElementById('chatNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleStartChat();
        });

        document.getElementById('chatTypeSelect').addEventListener('change', (e) => {
            const pwInput = document.getElementById('chatPasswordInput');
            const helper = document.getElementById('roomHelperText');
            const startBtn = document.getElementById('startChatBtn');
            const val = e.target.value;
            if (val === 'room-create') {
                pwInput.classList.remove('hidden');
                helper.classList.remove('hidden');
                startBtn.textContent = 'Create Room';
            } else if (val === 'room-join') {
                pwInput.classList.remove('hidden');
                helper.classList.remove('hidden');
                startBtn.textContent = 'Join Room';
            } else {
                pwInput.classList.add('hidden');
                pwInput.value = '';
                helper.classList.add('hidden');
                startBtn.textContent = 'Open Chat';
            }
        });

        document.getElementById('addFriendBtn').addEventListener('click', () => {
            const name = document.getElementById('addFriendInput').value.trim();
            this.handleAddFriend(name);
        });
        document.getElementById('addFriendInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = document.getElementById('addFriendInput').value.trim();
                this.handleAddFriend(name);
            }
        });
        document.getElementById('inviteFriendBtn').addEventListener('click', () => this.handleInviteFriend());

        document.getElementById('exportQrBtn').addEventListener('click', () => this.showQrExportModal());
        document.getElementById('importQrBtn').addEventListener('click', () => this.showQrImportModal());
        document.getElementById('downloadQrBtn').addEventListener('click', () => {
            const canvas = document.querySelector('#qrCodeContainer canvas');
            if (canvas) {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = 'securemessage_qr.png';
                a.click();
            }
        });
        document.getElementById('stopScanBtn').addEventListener('click', () => this.stopScanner());
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        // Validate inputs
        if (!username || !password) {
            errorDiv.textContent = 'Please enter username and password';
            return;
        }

        // Check socket connection
        if (!this.socket.connected) {
            errorDiv.textContent = 'Not connected to server. Please refresh the page.';
            console.error('Socket not connected:', this.socket.connected);
            return;
        }
        
        // send credentials to server
        this.socket.emit('login', { username, password }, (resp) => {
            if (resp.success) {
                this.currentUser = resp.user;
                this.saveCurrentUser();
                document.getElementById('loginUsername').value = '';
                document.getElementById('loginPassword').value = '';
                errorDiv.textContent = '';
                this.render();
            } else {
                errorDiv.textContent = resp.error || 'Login failed';
            }
        });
    }

    handleSignup() {
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        const password2 = document.getElementById('signupPassword2').value;
        const errorDiv = document.getElementById('signupError');
        
        // Validate inputs
        if (!username || !password || !password2) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }
        
        if (password !== password2) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }

        // Check socket connection
        if (!this.socket.connected) {
            errorDiv.textContent = 'Not connected to server. Please refresh the page.';
            console.error('Socket not connected:', this.socket.connected);
            return;
        }
        
        // forward to server
        this.socket.emit('signup', { username, password }, (resp) => {
            if (resp.success) {
                this.currentUser = resp.user;
                this.saveCurrentUser();
                document.getElementById('signupUsername').value = '';
                document.getElementById('signupPassword').value = '';
                document.getElementById('signupPassword2').value = '';
                errorDiv.textContent = '';
                this.render();
            } else {
                errorDiv.textContent = resp.error || 'Signup failed';
            }
        });
    }

    handleSendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value;
        if (!text.trim() || !this.currentChat) return;
        if (this.currentChatType === 'room') {
            this.saveRoomMessage(this.currentChat, this.currentUser.username, { type: 'text', text });
        } else {
            // send via socket; message handler will store and render for us
            this.sendTextMessage(text);
        }
        input.value = '';
        this.renderMessages();
    }

    handleSendFile() {
        const fileInput = document.getElementById('fileInput');
        if (!(fileInput && fileInput.files && fileInput.files[0]) || !this.currentChat) return;
        const file = fileInput.files[0];
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File too large (max 5MB)');
            fileInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const fileObj = { type: 'file', filename: file.name, data };
            try {
                if (this.currentChatType === 'room') {
                    this.saveRoomMessage(this.currentChat, this.currentUser.username, fileObj);
                } else {
                    this.sendFileMessage(fileObj);
                }
            } catch (err) {
                console.error('error saving file message', err);
                alert('Failed to save file (storage limit?)');
            }
            fileInput.value = '';
            this.renderMessages();
        };
        reader.onerror = (err) => {
            console.error('file reader error', err);
            alert('Failed to read file');
        };
        reader.readAsDataURL(file);
    }

    handleStartChat() {
        const type = document.getElementById('chatTypeSelect').value;
        const nameInput = document.getElementById('chatNameInput');
        const pwInput = document.getElementById('chatPasswordInput');
        const name = nameInput.value.replace(/^[@#]/, '').trim();
        const password = pwInput.value;

        if (!name) {
            alert('Please enter a name');
            return;
        }

        if (type === 'user') {
            if (name === this.currentUser.username) {
                alert('Cannot chat with yourself');
                return;
            }
            this.currentChatType = 'user';
            this.currentChat = name;
            nameInput.value = '';
            this.updateAppUI();

        } else if (type === 'room-create') {
            if (!password) {
                alert('A password is required to create a room');
                return;
            }
            const result = this.createRoom(name, password);
            if (!result.success) {
                alert(result.error);
                return;
            }
            this.currentChatType = 'room';
            this.currentChat = name;
            nameInput.value = '';
            pwInput.value = '';
            this.updateAppUI();

        } else if (type === 'room-join') {
            if (!password) {
                alert('A password is required to join a room');
                return;
            }
            const result = this.joinRoom(name, password);
            if (!result.success) {
                alert(result.error);
                return;
            }
            this.currentChatType = 'room';
            this.currentChat = name;
            nameInput.value = '';
            pwInput.value = '';
            this.updateAppUI();
        }
    }

    // =====================
    // QR export/import
    // =====================
    showQrExportModal() {
        document.getElementById('qrExportModal').classList.remove('hidden');
        const data = {
            users: this.getAllUsers(),
            messages: this.getAllMessages(),
            rooms: this.getAllRooms()
        };
        const json = JSON.stringify(data);
        const container = document.getElementById('qrCodeContainer');
        container.innerHTML = '';
        const qr = new QRious({
            element: document.createElement('canvas'),
            value: json,
            size: 250
        });
        container.appendChild(qr.canvas);
    }

    closeQrExportModal() {
        document.getElementById('qrExportModal').classList.add('hidden');
    }

    showQrImportModal() {
        document.getElementById('qrImportModal').classList.remove('hidden');
        this.startScanner();
    }

    closeQrImportModal() {
        document.getElementById('qrImportModal').classList.add('hidden');
        this.stopScanner();
    }

    startScanner() {
        if (this.html5QrCode) return;
        this.html5QrCode = new Html5Qrcode('qrReaderContainer');
        this.html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            qrMessage => {
                this.stopScanner();
                this.importData(qrMessage);
                this.closeQrImportModal();
            },
            errorMsg => {
                console.log('scan error', errorMsg);
            }
        ).catch(err => {
            console.error('Unable to start scanner', err);
            document.getElementById('qrStatus').textContent = 'Camera not available';
        });
    }

    stopScanner() {
        if (this.html5QrCode) {
            this.html5QrCode.stop().then(() => {
                this.html5QrCode.clear();
                this.html5QrCode = null;
            }).catch(err => {
                console.error('Error stopping scanner', err);
            });
        }
    }

    importData(json) {
        try {
            const data = JSON.parse(json);
            if (data.users) localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.users));
            if (data.messages) localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(data.messages));
            if (data.rooms) localStorage.setItem(this.ROOMS_KEY, JSON.stringify(data.rooms));
            alert('Data imported successfully');
            this.render();
        } catch (e) {
            alert('Failed to parse QR data');
        }
    }
}

// =====================
// Initialize App
// =====================

let app;

// =====================
// Global Helper Functions
// =====================

function toggleAuthForm(e) {
    e.preventDefault();
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('signupForm').classList.toggle('active');
}

function closeQrExportModal() {
    if (app) app.closeQrExportModal();
}

function closeQrImportModal() {
    if (app) app.closeQrImportModal();
}

// =====================
// App Initialization
// =====================

document.addEventListener('DOMContentLoaded', () => {
    app = new MessagingApp();
});