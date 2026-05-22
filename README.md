# chat-app-frontend

Expo React Native chat app frontend.

## Configuration

Set `EXPO_PUBLIC_API_URL` to your backend API base URL. It defaults to:

```text
http://localhost:3000/api
```

For Expo on a real device, use your computer's LAN IP instead of `localhost`, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.31.147:3000/api
```

For Android emulator, use:

```text
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

The auth flow expects these endpoints:

```text
POST /auth/login
POST /auth/signup
```

Both endpoints should return a JWT as `token`, `accessToken`, or `jwt`, and may include a `user` object.
