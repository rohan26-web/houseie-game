import { io } from "socket.io-client";

const socket = io(
  import.meta.env.DEV
    ? "http://localhost:5000"
    : undefined,
  {
    transports: ["websocket", "polling"],
  }
);

export default socket;
