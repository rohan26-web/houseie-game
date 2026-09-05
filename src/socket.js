import { io } from "socket.io-client";

// Automatically connects to the same server that serves the website.
// Local:
// http://localhost:5000
//
// Online:
// https://your-houseie-game.onrender.com

const socket = io();

export default socket;