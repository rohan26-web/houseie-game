import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// =====================================================
// PATH SETUP
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// EXPRESS
// =====================================================

const app = express();

const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// =====================================================
// PORT
// =====================================================

const PORT = process.env.PORT || 5000;

// =====================================================
// GAME STORAGE
// =====================================================

const games = new Map();

// socket.id -> ticket
const playerTickets = new Map();

// socket.id -> player profile
const playerProfiles = new Map();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function cleanPlayerName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);
}

function generateRoomCode() {
  let code;

  do {
    code = String(
      Math.floor(1000 + Math.random() * 9000)
    );
  } while (games.has(code));

  return code;
}

function generateGameId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

// =====================================================
// TICKET GENERATOR
// =====================================================

function generateTicket() {
  const ticket = Array.from(
    { length: 3 },
    () => Array(9).fill(null)
  );

  // ---------------------------------------------------
  // Generate numbers for each column
  // ---------------------------------------------------

  const columns = [];

  for (let col = 0; col < 9; col++) {
    let min;
    let max;

    if (col === 0) {
      min = 1;
      max = 9;
    } else if (col === 8) {
      min = 80;
      max = 90;
    } else {
      min = col * 10;
      max = col * 10 + 9;
    }

    const numbers = [];

    for (let n = min; n <= max; n++) {
      numbers.push(n);
    }

    // Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [numbers[i], numbers[j]] = [
        numbers[j],
        numbers[i]
      ];
    }

    columns.push(numbers);
  }

  // ---------------------------------------------------
  // Select 5 columns for each row
  // ---------------------------------------------------

  const rowColumns = [
    [],
    [],
    []
  ];

  // Every row must contain exactly 5 numbers.
  // Every column must contain at least 1 number.

  const allColumns = Array.from(
    { length: 9 },
    (_, i) => i
  );

  // First guarantee every column appears once.
  for (const col of allColumns) {
    const row =
      Math.floor(Math.random() * 3);

    rowColumns[row].push(col);
  }

  // Add remaining 6 positions.
  while (
    rowColumns[0].length < 5 ||
    rowColumns[1].length < 5 ||
    rowColumns[2].length < 5
  ) {
    const row =
      Math.floor(Math.random() * 3);

    if (rowColumns[row].length >= 5) {
      continue;
    }

    const col =
      Math.floor(Math.random() * 9);

    if (rowColumns[row].includes(col)) {
      continue;
    }

    rowColumns[row].push(col);
  }

  // ---------------------------------------------------
  // Put numbers into ticket
  // ---------------------------------------------------

  for (let row = 0; row < 3; row++) {
    rowColumns[row].sort((a, b) => a - b);

    for (const col of rowColumns[row]) {
      ticket[row][col] =
        columns[col].pop();
    }
  }

  // ---------------------------------------------------
  // Sort numbers in each column
  // ---------------------------------------------------

  for (let col = 0; col < 9; col++) {
    const values = [];

    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) {
        values.push(ticket[row][col]);
      }
    }

    values.sort((a, b) => a - b);

    let index = 0;

    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) {
        ticket[row][col] = values[index];
        index++;
      }
    }
  }

  return ticket;
}

// =====================================================
// VALIDATE TICKET
// =====================================================

function validateTicket(ticket) {
  if (!Array.isArray(ticket)) {
    return false;
  }

  if (ticket.length !== 3) {
    return false;
  }

  let totalNumbers = 0;

  for (let row = 0; row < 3; row++) {
    if (!Array.isArray(ticket[row])) {
      return false;
    }

    if (ticket[row].length !== 9) {
      return false;
    }

    let rowNumbers = 0;

    for (let col = 0; col < 9; col++) {
      const value = ticket[row][col];

      if (value !== null) {
        if (
          typeof value !== "number" ||
          value < 1 ||
          value > 90
        ) {
          return false;
        }

        rowNumbers++;
        totalNumbers++;
      }
    }

    if (rowNumbers !== 5) {
      return false;
    }
  }

  if (totalNumbers !== 15) {
    return false;
  }

  // Every column must contain at least one number.
  for (let col = 0; col < 9; col++) {
    let count = 0;

    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) {
        count++;
      }
    }

    if (count === 0) {
      return false;
    }
  }

  return true;
}

// =====================================================
// PUBLIC GAME DATA
// =====================================================

function publicGame(game) {
  return {
    id: game.id,
    roomCode: game.roomCode,
    host: game.host,
    maxPlayers: game.maxPlayers,
    status: game.status,

    players: game.players.length,

    playerList: game.players.map(
      (player) => ({
        socketId: player.socketId,
        name: player.name,
        ready: player.ready
      })
    ),

    calledNumbers: [
      ...game.calledNumbers
    ],

    currentNumber:
      game.currentNumber,

    winners: {
      ...game.winners
    }
  };
}

// =====================================================
// BROADCAST GAME TO ROOM
// =====================================================

function broadcastRoom(game) {
  if (!game) {
    return;
  }

  io.to(String(game.roomCode)).emit(
    "gameUpdated",
    publicGame(game)
  );
}

// =====================================================
// BROADCAST LOBBY
// =====================================================

function broadcastGames() {
  const list = [];

  for (const game of games.values()) {
    if (game.status === "Waiting") {
      list.push(publicGame(game));
    }
  }

  io.emit("gamesUpdated", list);
}

// =====================================================
// FIND GAME
// =====================================================

function findGame(gameId) {
  return games.get(String(gameId));
}

// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {
  console.log(
    "Player connected:",
    socket.id
  );

  // ---------------------------------------------------
  // CREATE GAME
  // ---------------------------------------------------

  socket.on(
    "createGame",
    ({ playerName, maxPlayers }) => {
      const name =
        cleanPlayerName(playerName);

      if (!name) {
        socket.emit("gameError", {
          message:
            "Please enter your name."
        });

        return;
      }

      const allowedPlayerCounts = [
        2,
        5,
        10,
        15,
        20
      ];

      let maximum =
        Number(maxPlayers);

      if (
        !allowedPlayerCounts.includes(
          maximum
        )
      ) {
        maximum = 5;
      }

      const roomCode =
        generateRoomCode();

      const gameId =
        generateGameId();

      const player = {
        socketId: socket.id,
        name,
        ready: true
      };

      const game = {
        id: gameId,
        roomCode,

        host: socket.id,

        maxPlayers: maximum,

        status: "Waiting",

        players: [player],

        calledNumbers: [],

        currentNumber: null,

        winners: {
          "Early Five": null,
          "Top Line": null,
          "Middle Line": null,
          "Bottom Line": null,
          "Full House": null
        }
      };

      games.set(
        gameId,
        game
      );

      playerProfiles.set(
        socket.id,
        {
          gameId,
          name
        }
      );

      const ticket =
        generateTicket();

      playerTickets.set(
        socket.id,
        ticket
      );

      socket.join(
        String(roomCode)
      );

      socket.emit(
        "gameCreated",
        publicGame(game)
      );

      socket.emit(
        "ticketAssigned",
        ticket
      );

      broadcastRoom(game);

      broadcastGames();

      console.log(
        `Game created: ${roomCode}`
      );
    }
  );

  // ---------------------------------------------------
  // JOIN GAME
  // ---------------------------------------------------

  socket.on(
    "joinGame",
    ({ roomCode, playerName }) => {
      const name =
        cleanPlayerName(playerName);

      const code =
        String(roomCode || "").trim();

      if (!name) {
        socket.emit("joinError", {
          message:
            "Please enter your name."
        });

        return;
      }

      if (!/^\d{4}$/.test(code)) {
        socket.emit("joinError", {
          message:
            "Room code must be 4 digits."
        });

        return;
      }

      let game = null;

      for (const candidate of games.values()) {
        if (
          String(candidate.roomCode) ===
          code
        ) {
          game = candidate;
          break;
        }
      }

      if (!game) {
        socket.emit("joinError", {
          message:
            "Game not found."
        });

        return;
      }

      if (game.status !== "Waiting") {
        socket.emit("joinError", {
          message:
            "This game has already started."
        });

        return;
      }

      if (
        game.players.length >=
        game.maxPlayers
      ) {
        socket.emit("joinError", {
          message:
            "This room is full."
        });

        return;
      }

      const duplicateName =
        game.players.some(
          (player) =>
            player.name.toLowerCase() ===
            name.toLowerCase()
        );

      if (duplicateName) {
        socket.emit("joinError", {
          message:
            "That name is already being used in this room."
        });

        return;
      }

      const player = {
        socketId: socket.id,
        name,
        ready: false
      };

      game.players.push(player);

      playerProfiles.set(
        socket.id,
        {
          gameId: game.id,
          name
        }
      );

      const ticket =
        generateTicket();

      playerTickets.set(
        socket.id,
        ticket
      );

      socket.join(
        String(game.roomCode)
      );

      socket.emit(
        "ticketAssigned",
        ticket
      );

      // Send complete synchronized state
      broadcastRoom(game);

      broadcastGames();

      console.log(
        `${name} joined room ${game.roomCode}`
      );
    }
  );

  // ---------------------------------------------------
  // TOGGLE READY
  // ---------------------------------------------------

  socket.on(
    "toggleReady",
    (gameId) => {
      const game =
        findGame(gameId);

      if (!game) {
        socket.emit("gameError", {
          message:
            "Game not found."
        });

        return;
      }

      if (game.status !== "Waiting") {
        socket.emit("gameError", {
          message:
            "The game has already started."
        });

        return;
      }

      const player =
        game.players.find(
          (p) =>
            p.socketId === socket.id
        );

      if (!player) {
        socket.emit("gameError", {
          message:
            "You are not in this game."
        });

        return;
      }

      // Host is always ready
      if (
        socket.id === game.host
      ) {
        player.ready = true;
      } else {
        player.ready =
          !player.ready;
      }

      broadcastRoom(game);

      broadcastGames();
    }
  );

  // ---------------------------------------------------
  // START GAME
  // ---------------------------------------------------

  socket.on(
    "startGame",
    (gameId) => {
      const game =
        findGame(gameId);

      if (!game) {
        socket.emit("gameError", {
          message:
            "Game not found."
        });

        return;
      }

      if (
        socket.id !== game.host
      ) {
        socket.emit("gameError", {
          message:
            "Only the host can start the game."
        });

        return;
      }

      if (game.status !== "Waiting") {
        socket.emit("gameError", {
          message:
            "The game has already started."
        });

        return;
      }

      const allReady =
        game.players.length > 0 &&
        game.players.every(
          (player) =>
            player.ready === true
        );

      if (!allReady) {
        socket.emit("gameError", {
          message:
            "Everyone must be ready before starting."
        });

        return;
      }

      game.status = "Playing";

      broadcastRoom(game);

      broadcastGames();

      io.to(
        String(game.roomCode)
      ).emit(
        "gameStarted",
        publicGame(game)
      );

      console.log(
        `Game started: ${game.roomCode}`
      );
    }
  );

  // ---------------------------------------------------
  // CALL NUMBER
  // ---------------------------------------------------

  socket.on(
    "callNumber",
    (gameId) => {
      const game =
        findGame(gameId);

      if (!game) {
        socket.emit("gameError", {
          message:
            "Game not found."
        });

        return;
      }

      if (
        socket.id !== game.host
      ) {
        socket.emit("gameError", {
          message:
            "Only the host can call numbers."
        });

        return;
      }

      if (game.status !== "Playing") {
        socket.emit("gameError", {
          message:
            "The game is not currently playing."
        });

        return;
      }

      if (
        game.calledNumbers.length >= 90
      ) {
        socket.emit("gameError", {
          message:
            "All 90 numbers have been called."
        });

        return;
      }

      // ------------------------------------------------
      // Find unique number
      // ------------------------------------------------

      let number;

      do {
        number =
          Math.floor(
            Math.random() * 90
          ) + 1;
      } while (
        game.calledNumbers.includes(
          number
        )
      );

      game.calledNumbers.push(
        number
      );

      game.currentNumber =
        number;

      // Send number to everybody
      io.to(
        String(game.roomCode)
      ).emit(
        "numberCalled",
        {
          number,
          calledNumbers:
            game.calledNumbers
        }
      );

      // Send complete state
      broadcastRoom(game);

      console.log(
        `Room ${game.roomCode}: Number ${number}`
      );
    }
  );

  // ---------------------------------------------------
  // CLAIM WIN
  // ---------------------------------------------------

  socket.on(
    "claimWin",
    ({
      gameId,
      pattern,
      markedNumbers
    }) => {
      const game =
        findGame(gameId);

      if (!game) {
        socket.emit("claimResult", {
          success: false,
          message:
            "Game not found."
        });

        return;
      }

      if (game.status !== "Playing") {
        socket.emit("claimResult", {
          success: false,
          message:
            "The game is not active."
        });

        return;
      }

      const player =
        game.players.find(
          (p) =>
            p.socketId === socket.id
        );

      if (!player) {
        socket.emit("claimResult", {
          success: false,
          message:
            "You are not in this game."
        });

        return;
      }

      const allowedPatterns = [
        "Early Five",
        "Top Line",
        "Middle Line",
        "Bottom Line",
        "Full House"
      ];

      if (
        !allowedPatterns.includes(
          pattern
        )
      ) {
        socket.emit("claimResult", {
          success: false,
          message:
            "Invalid winning pattern."
        });

        return;
      }

      if (game.winners[pattern]) {
        socket.emit("claimResult", {
          success: false,
          message:
            `${pattern} has already been won.`
        });

        return;
      }

      // ------------------------------------------------
      // Get player's ticket
      // ------------------------------------------------

      const ticket =
        playerTickets.get(
          socket.id
        );

      if (!ticket) {
        socket.emit("claimResult", {
          success: false,
          message:
            "Ticket not found."
        });

        return;
      }

      const marked =
        Array.isArray(markedNumbers)
          ? markedNumbers
          : [];

      const calledSet =
        new Set(
          game.calledNumbers
        );

      const markedSet =
        new Set(marked);

      // ------------------------------------------------
      // Only called numbers can be marked
      // ------------------------------------------------

      const invalidMarked =
        marked.some(
          (number) =>
            !calledSet.has(number)
        );

      if (invalidMarked) {
        socket.emit("claimResult", {
          success: false,
          message:
            "You cannot mark a number that has not been called."
        });

        return;
      }

      // ------------------------------------------------
      // Get ticket numbers
      // ------------------------------------------------

      const ticketNumbers = [];

      for (const row of ticket) {
        for (const number of row) {
          if (number !== null) {
            ticketNumbers.push(number);
          }
        }
      }

      // ------------------------------------------------
      // EARLY FIVE
      // ------------------------------------------------

      if (pattern === "Early Five") {
        let count = 0;

        for (const number of ticketNumbers) {
          if (markedSet.has(number)) {
            count++;
          }
        }

        if (count < 5) {
          socket.emit("claimResult", {
            success: false,
            message:
              "You need at least 5 marked numbers for Early Five."
          });

          return;
        }
      }

      // ------------------------------------------------
      // LINE CHECK
      // ------------------------------------------------

      if (
        pattern === "Top Line" ||
        pattern === "Middle Line" ||
        pattern === "Bottom Line"
      ) {
        let rowIndex = 0;

        if (pattern === "Middle Line") {
          rowIndex = 1;
        }

        if (pattern === "Bottom Line") {
          rowIndex = 2;
        }

        const row =
          ticket[rowIndex];

        const rowNumbers =
          row.filter(
            (number) =>
              number !== null
          );

        const complete =
          rowNumbers.every(
            (number) =>
              markedSet.has(number)
          );

        if (!complete) {
          socket.emit("claimResult", {
            success: false,
            message:
              "You have not completed this line."
          });

          return;
        }
      }

      // ------------------------------------------------
      // FULL HOUSE
      // ------------------------------------------------

      if (pattern === "Full House") {
        const complete =
          ticketNumbers.every(
            (number) =>
              markedSet.has(number)
          );

        if (!complete) {
          socket.emit("claimResult", {
            success: false,
            message:
              "You need to mark all 15 numbers for Full House."
          });

          return;
        }
      }

      // ------------------------------------------------
      // WINNER
      // ------------------------------------------------

      game.winners[pattern] = {
        socketId: socket.id,
        playerName: player.name
      };

      const winnerData = {
        pattern,
        playerName: player.name,
        socketId: socket.id,
        game: publicGame(game)
      };

      io.to(
        String(game.roomCode)
      ).emit(
        "winnerAnnounced",
        winnerData
      );

      // Full House ends game
      if (pattern === "Full House") {
        game.status = "Game Over";
      }

      broadcastRoom(game);

      broadcastGames();

      socket.emit(
        "claimResult",
        {
          success: true,
          ...winnerData
        }
      );

      console.log(
        `${player.name} won ${pattern} in ${game.roomCode}`
      );
    }
  );

  // ---------------------------------------------------
  // DISCONNECT
  // ---------------------------------------------------

  socket.on(
    "disconnect",
    () => {
      console.log(
        "Player disconnected:",
        socket.id
      );

      const profile =
        playerProfiles.get(
          socket.id
        );

      if (!profile) {
        return;
      }

      const game =
        games.get(
          profile.gameId
        );

      if (game) {
        game.players =
          game.players.filter(
            (player) =>
              player.socketId !==
              socket.id
          );

        // ------------------------------------------------
        // If host leaves, transfer host
        // ------------------------------------------------

        if (
          game.host === socket.id &&
          game.players.length > 0
        ) {
          const newHost =
            game.players[0];

          game.host =
            newHost.socketId;

          newHost.ready = true;
        }

        // ------------------------------------------------
        // Delete empty game
        // ------------------------------------------------

        if (
          game.players.length === 0
        ) {
          games.delete(
            game.id
          );
        } else {
          broadcastRoom(game);
        }

        broadcastGames();
      }

      playerTickets.delete(
        socket.id
      );

      playerProfiles.delete(
        socket.id
      );
    }
  );
});

// =====================================================
// SERVE REACT FRONTEND
// =====================================================

const frontendPath =
  path.join(
    __dirname,
    "..",
    "dist"
  );

app.use(
  express.static(frontendPath)
);

// React fallback
app.get(
  "*",
  (req, res) => {
    res.sendFile(
      path.join(
        frontendPath,
        "index.html"
      )
    );
  }
);

// =====================================================
// START SERVER
// =====================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Houseie server running on port ${PORT}`
    );
  }
);