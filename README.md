# SecureMessage - Messaging App

A private messaging application that runs entirely in the browser using GitHub Pages. No server needed - all data is stored locally on your device.

## Features

 **Account Creation** - Create accounts with username and password protection
 **Direct Messages & Rooms** - Chat one-on-one or create password-protected rooms
 **Room Passwords** - You name a room and give it a password; others must enter it to join
 **Auto‑cleanup** - Rooms are automatically deleted when their last participant leaves
 **Friend System** - Add people as friends and easily invite them to chats / rooms
 **Message Storage** - All messages are saved locally in your browser
 **Sender Labels** - Each message shows who sent it (the label appears beneath the time); your messages display as “You”.
 **Multiple Conversations** - Chat with multiple people or rooms
 **Persistent Membership** - Once you join a room, your account stays in it until you leave
 **QR Sync** - Export your entire data set to a QR code and scan it on another device to transfer accounts, rooms, and messages
 **No Tracking** - All data stays on your device
 **GitHub Pages Deployment** - Free hosting with GitHub Pages

## How It Works

This app uses browser `localStorage` to store:
- User accounts (with passwords)
- All direct messages and room conversations
- Room definitions: password, participants, and message history

A new optional server component allows the app to sync data across devices in real time. When run with a backend, users and messages are stored in the server's memory and clients communicate via WebSocket (socket.io). You can still use the original local‑only mode, but it will not share data between browsers/devices. QR export/import remains available for manual transfer.

### Direct Messages
1. Log in to your account
2. In the left sidebar, choose "User" from the drop‑down
3. Enter the other person's username and click "Open Chat"
4. Type your message and click "Send" or press Enter
5. Type your message and click **Send** or press Enter.
6. To share a photo or file use the **Choose File** control, then click the new **Send File** button. The file will be uploaded and displayed inline (images) or as a download link. Files are limited to about 5 MB to prevent running out of browser storage.
   - On mobile, you can also take a photo using the camera option in the file picker.

### Rooms (Group Chats)
1. Select "Room" from the drop‑down in the left sidebar
2. Choose whether you want to **Join** an existing room or **Create** a new one using the extra selector that appears.
3. Enter the room name and password.
   - **Joining** requires the room to already exist; entering a non‑existent name will produce an error instead of creating a new room.
   - **Creating** will fail if the room name is already taken.
4. Everyone in the room can send messages that are visible to all participants
   - You can also exchange photos/files using the file picker beside the text box
   - You can invite friends from the room header using the friends dropdown
4. Once you join, your account remains a member of the room until you leave it
5. To leave the room, click the "Leave" button next to the room in the conversations list; if you're the last person to leave, the room is deleted

### QR Export / Import (Sync)
- Click **Export QR** in the header to generate a code containing all accounts, messages, and rooms
- Scan the code on another device by clicking **Scan QR** and pointing the camera at the code
- The imported data replaces the current local storage (backup if necessary)
- You can also download the QR code as an image for later use

### Delete Conversations
- Click the "Delete" button next to any direct chat to remove all messages
- Rooms show a "Leave" button instead of delete

### Log Out
- Click the "Logout" button in the top right
### Running with a Server

1. Make sure you have Node.js installed.
2. Run `npm install` in the project root to fetch dependencies.
3. Start the server with `npm start` (defaults to port 3000).
4. Open `http://localhost:3000` in multiple browsers/devices on the same network — they will now share accounts and messages instantly.

*The simplistic server keeps all data in memory and is for demonstration only. For production use, replace the in‑memory store with a database and add authentication/validation.*
## Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser sessionStorage for auth (requires login per tab); localStorage for other app data
- **No Backend**: Everything runs locally in the browser
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## Security Notes

⚠️ **This is for privacy from external parties, not from the browser itself**
- Your password is stored locally in localStorage (not hashed)
- Room passwords are also stored in localStorage
- If someone gets access to your device, they can access your messages
- For true security, consider using passwords carefully and clearing browser data when needed

> **Note:** Authentication state is now stored in `sessionStorage`, which is unique to each browser tab. You will be prompted to log in every time you open the app in a new tab or after closing one.

## File Structure

```
├── index.html    # Main HTML structure
├── styles.css    # All styling
├── app.js        # JavaScript app logic
└── README.md     # Documentation
```

## Tips

- Each browser/device keeps its own separate copy of accounts and messages
- You can have the same username on different devices with different messages
- Use QR export/import to sync between browsers/devices
- Clear all data by clearing browser cache and site data

---

**for private, decentralized messaging**
** i hope you like it!**