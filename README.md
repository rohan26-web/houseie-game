# HOUSEIE - Online Tambola Game

## Requirements

- Node.js
- VS Code

## 1. Install frontend

Open a terminal in the project folder:

```bash
npm install
```

## 2. Install backend

Open another terminal:

```bash
cd backend
npm install
```

## 3. Start backend

Inside `backend`:

```bash
node server.js
```

You should see:

```text
🏠 Houseie server running on port 5000
```

## 4. Start frontend

Open another terminal in the main project folder:

```bash
npm run dev
```

Open the Vite URL shown in the terminal.

## Current features

- Home screen
- Create game
- Join game
- Room code
- Available games
- Waiting room
- Host controls
- Real-time Socket.IO game
- Tambola ticket generation
- Manual ticket marking
- 1-90 number board
- Server-side win validation
- Early Five
- Top Line
- Middle Line
- Bottom Line
- Full House
- Winner screen
- Full-screen responsive live game

## Important prototype limitations

This is still a local-development prototype.

- Games are stored in server memory.
- Refreshing the host page changes its Socket.IO ID.
- Player names are not yet persistent.
- Player count is not fully cleaned up on disconnect.
- Winners are not yet locked per pattern.
- There is no database or authentication.
- Do not use real-money wagering.
