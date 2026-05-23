# Real-Time Chat App Frontend

A mobile real-time chat application built with Expo and React Native. The app supports authentication, user discovery, starting conversations, real-time messaging, typing indicators, seen status, online/offline presence, unread badges, and paginated message history.

## Project Overview

This repository contains the frontend for a real-time chat product. It communicates with a REST API for authentication, user search, conversation discovery, and message history, while Socket.IO is used for live chat events such as sending messages, receiving messages, typing, seen status, and presence updates.

The UI is designed around a familiar mobile messaging flow:

- Login or create an account.
- View existing conversations.
- Search users and start a new chat.
- Send and receive messages in real time.
- See online/offline and last-seen status inside the chat header.

## Features

- JWT-based login and signup
- Persistent auth session with AsyncStorage
- Conversation list with avatars, last message, timestamp, unread count, and online indicator
- User discovery with debounced search
- Start or reuse conversations from user search
- Real-time message sending through Socket.IO
- Paginated message history using inverted FlatList
- Optimistic outgoing message UI
- Typing indicator
- Seen/read status ticks
- Online/offline presence updates
- Last-seen display in chat header
- Pull-to-refresh for conversations
- Loading, empty, and error states
- Logout confirmation modal
- Shared socket service with listener cleanup

## Tech Stack

- Expo
- React Native
- Socket.IO Client
- Axios

## Folder Structure

```text
src/
  components/
    AuthButton.js
    AuthInput.js
    HeaderLogoutButton.js
    LogoutConfirmationModal.js
    ScreenContainer.js
    UserAvatar.js

  constants/
    colors.js
    config.js
    theme.js

  context/
    AuthContext.js

  navigation/
    AppNavigator.js
    AuthNavigator.js
    RootNavigator.js

  screens/
    ChatListScreen.js
    ChatScreen.js
    LoadingScreen.js
    LoginScreen.js
    NewChatScreen.js
    SignupScreen.js

  services/
    api.js
    authService.js
    conversationService.js
    logoutBus.js
    messageService.js
    socket.js
    userService.js

  utils/
    errors.js
    storage.js
    validation.js
```

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
```

For Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5000
```

For a physical device, use your machine's LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.x.x:5000
```

## Installation

Install dependencies:

```bash
npm install
```

## Frontend Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create `.env` with API and socket URLs.
4. Confirm the backend is running and reachable from your emulator or device.
5. Start Expo.

## Running Locally

Start the Expo development server:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## Socket Architecture

Socket.IO is centralized in `src/services/socket.js`.

The socket service is responsible for:

- Connecting after login or restored session
- Passing the JWT token through the socket auth payload
- Reconnection handling
- Joining and leaving conversations
- Sending messages through `send_message`
- Subscribing to incoming messages
- Subscribing to typing events
- Subscribing to seen/read events
- Subscribing to online/offline presence
- Preventing duplicate listeners by unregistering matching handlers before registration
- Returning cleanup functions for screen-level subscriptions

### Socket Connection Flow

1. User logs in.
2. `AuthContext` stores the JWT and user.
3. `AuthContext` calls `connectSocket(token)`.
4. `socket.js` creates or reuses a Socket.IO client with:

```js
auth: { token }
```

5. When the user logs out, auth state is cleared and the socket is disconnected.

### Message Sending Flow

Messages are sent through Socket.IO, not REST:

```js
socket.emit('send_message', {
  receiverId: '665fabc1234567890abc1234',
  text: 'Hello'
}, (response) => {
  console.log(response);
});
```

In the UI, `ChatScreen` creates an optimistic message immediately, then replaces it with the acknowledged socket response when available.

### Message Receiving Flow

`ChatScreen` subscribes to message events through the socket service. Incoming messages are merged into the current FlatList data and the list scrolls to the latest message.

Supported message event aliases include:

```text
receive_message
message
newMessage
message:new
```

### Typing Flow

When the user types, `ChatScreen` emits typing events and automatically sends a stop-typing event after a short delay. Incoming typing events update the typing indicator for the active conversation.

### Seen Status Flow

When messages are opened or received, the app emits seen status events. The chat list also clears local unread state after a conversation is opened, so unread badges do not remain stale while waiting for the next API refresh.

### Presence Flow

The app listens for online/offline events globally where needed. Chat rows show online indicators, while `ChatScreen` displays online or last-seen status in the header.

Supported presence aliases include:

```text
online
user_online
presence:online
offline
user_offline
presence:offline
```
