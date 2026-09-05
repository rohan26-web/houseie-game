import { useEffect, useState } from "react";
import socket from "./socket";
import "./index.css";

function App() {
  const [frame, setFrame] = useState("home");

  const [playerName, setPlayerName] =
    useState("");

  const [roomCode, setRoomCode] =
    useState("");

  const [maxPlayers, setMaxPlayers] =
    useState(5);

  const [currentGameId, setCurrentGameId] =
    useState(null);

  const [currentGame, setCurrentGame] =
    useState(null);

  const [isHost, setIsHost] =
    useState(false);

  const [isReady, setIsReady] =
    useState(false);

  const [games, setGames] =
    useState([]);

  const [myTicket, setMyTicket] =
    useState(null);

  const [markedNumbers, setMarkedNumbers] =
    useState([]);

  const [calledNumbers, setCalledNumbers] =
    useState([]);

  const [currentNumber, setCurrentNumber] =
    useState(null);

  const [winnerMessage, setWinnerMessage] =
    useState(null);

  const [readyLoading, setReadyLoading] =
    useState(false);

  const [isCalling, setIsCalling] =
    useState(false);

  const [showNumberAnimation, setShowNumberAnimation] =
    useState(false);

  const [displayNumber, setDisplayNumber] =
    useState(null);

  const [announcement, setAnnouncement] =
    useState("");

  // ===================================================
  // SOCKET EVENTS
  // ===================================================

  useEffect(() => {
    function handleGamesUpdated(
      updatedGames
    ) {
      setGames(
        updatedGames || []
      );
    }

    function handleGameCreated(
      game
    ) {
      if (!game) return;

      setCurrentGame(game);

      setCurrentGameId(
        game.id
      );

      setRoomCode(
        game.roomCode
      );

      setIsHost(true);

      setIsReady(true);

      setFrame("waiting");
    }

    function handleTicketAssigned(
      ticket
    ) {
      setMyTicket(ticket);
    }

    function handleGameUpdated(
      game
    ) {
      if (!game) return;

      setCurrentGame(game);

      setCurrentGameId(
        game.id
      );

      setRoomCode(
        game.roomCode
      );

      setCalledNumbers(
        game.calledNumbers || []
      );

      setCurrentNumber(
        game.currentNumber || null
      );

      const me =
        game.playerList?.find(
          (player) =>
            player.socketId ===
            socket.id
        );

      if (me) {
        setIsReady(
          me.ready === true
        );

        setIsHost(
          me.socketId ===
          game.host
        );
      }

      if (
        game.status ===
        "Waiting"
      ) {
        setFrame("waiting");
      }

      if (
        game.status ===
        "Playing"
      ) {
        setFrame("game");
      }

      if (
        game.status ===
        "Game Over"
      ) {
        setFrame("result");
      }

      setReadyLoading(false);
    }

    function handleGameStarted(
      game
    ) {
      if (!game) return;

      setCurrentGame(game);

      setCurrentGameId(
        game.id
      );

      setCalledNumbers(
        game.calledNumbers || []
      );

      setCurrentNumber(
        game.currentNumber || null
      );

      setFrame("game");

      setReadyLoading(false);
    }

    function handleNumberCalled(
      data
    ) {
      if (!data) return;

      const number =
        typeof data ===
        "number"
          ? data
          : data.number;

      if (!number) return;

      setIsCalling(false);

      setCurrentNumber(
        number
      );

      if (
        Array.isArray(
          data.calledNumbers
        )
      ) {
        setCalledNumbers(
          data.calledNumbers
        );
      } else {
        setCalledNumbers(
          (previous) => {
            if (
              previous.includes(
                number
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              number
            ];
          }
        );
      }

      setDisplayNumber(
        number
      );

      setShowNumberAnimation(
        true
      );

      announceNumber(
        number
      );

      setTimeout(() => {
        setShowNumberAnimation(
          false
        );
      }, 2500);
    }

    function handleWinnerAnnounced(
      data
    ) {
      if (!data) return;

      setWinnerMessage(
        data
      );

      if (data.game) {
        setCurrentGame(
          data.game
        );

        if (
          data.game.status ===
          "Game Over"
        ) {
          setFrame("result");
        }
      }
    }

    function handleClaimResult(
      data
    ) {
      if (!data) return;

      if (!data.success) {
        alert(
          data.message ||
          "Claim failed."
        );

        return;
      }

      setWinnerMessage(
        data
      );

      if (
        data.game?.status ===
        "Game Over"
      ) {
        setFrame("result");
      }
    }

    function handleGameError(
      data
    ) {
      setReadyLoading(false);
      setIsCalling(false);

      alert(
        data?.message ||
        "Something went wrong."
      );
    }

    function handleJoinError(
      data
    ) {
      alert(
        data?.message ||
        "Unable to join game."
      );
    }

    socket.on(
      "gamesUpdated",
      handleGamesUpdated
    );

    socket.on(
      "gameCreated",
      handleGameCreated
    );

    socket.on(
      "ticketAssigned",
      handleTicketAssigned
    );

    socket.on(
      "gameUpdated",
      handleGameUpdated
    );

    socket.on(
      "gameStarted",
      handleGameStarted
    );

    socket.on(
      "numberCalled",
      handleNumberCalled
    );

    socket.on(
      "winnerAnnounced",
      handleWinnerAnnounced
    );

    socket.on(
      "claimResult",
      handleClaimResult
    );

    socket.on(
      "gameError",
      handleGameError
    );

    socket.on(
      "joinError",
      handleJoinError
    );

    return () => {
      socket.off(
        "gamesUpdated",
        handleGamesUpdated
      );

      socket.off(
        "gameCreated",
        handleGameCreated
      );

      socket.off(
        "ticketAssigned",
        handleTicketAssigned
      );

      socket.off(
        "gameUpdated",
        handleGameUpdated
      );

      socket.off(
        "gameStarted",
        handleGameStarted
      );

      socket.off(
        "numberCalled",
        handleNumberCalled
      );

      socket.off(
        "winnerAnnounced",
        handleWinnerAnnounced
      );

      socket.off(
        "claimResult",
        handleClaimResult
      );

      socket.off(
        "gameError",
        handleGameError
      );

      socket.off(
        "joinError",
        handleJoinError
      );
    };
  }, []);

  // ===================================================
  // NUMBER ANNOUNCEMENT
  // ===================================================

  function announceNumber(
    number
  ) {
    const text =
      `Number ${number}`;

    setAnnouncement(
      text
    );

    if (
      "speechSynthesis" in
      window
    ) {
      window.speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(
          `Number ${number}`
        );

      speech.rate = 0.9;
      speech.pitch = 1;

      window.speechSynthesis.speak(
        speech
      );
    }

    setTimeout(() => {
      setAnnouncement("");
    }, 3000);
  }

  // ===================================================
  // CREATE GAME
  // ===================================================

  function createGame() {
    const cleanName =
      playerName.trim();

    if (!cleanName) {
      alert(
        "Please enter your name."
      );

      return;
    }

    socket.emit(
      "createGame",
      {
        playerName:
          cleanName,

        maxPlayers
      }
    );
  }

  // ===================================================
  // JOIN GAME
  // ===================================================

  function joinGame() {
    const cleanName =
      playerName.trim();

    const cleanRoom =
      roomCode.trim();

    if (!cleanName) {
      alert(
        "Please enter your name."
      );

      return;
    }

    if (
      !/^\d{4}$/.test(
        cleanRoom
      )
    ) {
      alert(
        "Room code must be 4 digits."
      );

      return;
    }

    socket.emit(
      "joinGame",
      {
        roomCode:
          cleanRoom,

        playerName:
          cleanName
      }
    );
  }

  // ===================================================
  // READY
  // ===================================================

  function toggleReady() {
    if (!currentGameId) {
      return;
    }

    if (isHost) {
      return;
    }

    if (readyLoading) {
      return;
    }

    setReadyLoading(
      true
    );

    socket.emit(
      "toggleReady",
      currentGameId
    );
  }

  // ===================================================
  // START GAME
  // ===================================================

  function startGame() {
    if (!currentGameId) {
      return;
    }

    if (!isHost) {
      return;
    }

    socket.emit(
      "startGame",
      currentGameId
    );
  }

  // ===================================================
  // CALL NUMBER
  // ===================================================

  function callNumber() {
    if (!currentGameId) {
      return;
    }

    if (!isHost) {
      return;
    }

    if (isCalling) {
      return;
    }

    if (
      calledNumbers.length >=
      90
    ) {
      alert(
        "All numbers have been called."
      );

      return;
    }

    setIsCalling(
      true
    );

    socket.emit(
      "callNumber",
      currentGameId
    );
  }

  // ===================================================
  // MARK TICKET NUMBER
  // ===================================================

  function toggleNumber(
    number
  ) {
    if (
      !calledNumbers.includes(
        number
      )
    ) {
      return;
    }

    setMarkedNumbers(
      (previous) => {
        if (
          previous.includes(
            number
          )
        ) {
          return previous.filter(
            (n) =>
              n !== number
          );
        }

        return [
          ...previous,
          number
        ];
      }
    );
  }

  // ===================================================
  // CLAIM WIN
  // ===================================================

  function claimWin(
    pattern
  ) {
    if (!currentGameId) {
      return;
    }

    socket.emit(
      "claimWin",
      {
        gameId:
          currentGameId,

        pattern,

        markedNumbers
      }
    );
  }

  // ===================================================
  // HOME
  // ===================================================

  function HomeFrame() {
    return (
      <div className="screen">

        <div className="home-card">

          <div className="logo">
            🎱
          </div>

          <h1>
            HOUSEIE
          </h1>

          <p className="subtitle">
            The Ultimate Online
            Tambola Game
          </p>

          <button
            className="primary-button"
            onClick={() =>
              setFrame("create")
            }
          >
            CREATE GAME
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              setFrame("join")
            }
          >
            JOIN GAME
          </button>

        </div>

      </div>
    );
  }

  // ===================================================
  // CREATE
  // ===================================================

  function CreateFrame() {
    return (
      <div className="screen">

        <div className="form-card">

          <button
            className="back-button"
            onClick={() =>
              setFrame("home")
            }
          >
            ← Back
          </button>

          <h2>
            Create Game
          </h2>

          <label>
            Your Name
          </label>

          <input
            id="create-name"
            className="text-input name-input"
            type="text"
            value={playerName}
            onChange={(e) =>
              setPlayerName(
                e.target.value
              )
            }
            placeholder="Enter your name"
            maxLength={20}
            autoComplete="name"
          />

          <div className="character-count">
            {playerName.length}/20
          </div>

          <label>
            Maximum Players
          </label>

          <select
            className="text-input"
            value={maxPlayers}
            onChange={(e) =>
              setMaxPlayers(
                Number(
                  e.target.value
                )
              )
            }
          >
            <option value={2}>
              2 Players
            </option>

            <option value={5}>
              5 Players
            </option>

            <option value={10}>
              10 Players
            </option>

            <option value={15}>
              15 Players
            </option>

            <option value={20}>
              20 Players
            </option>
          </select>

          <button
            className="primary-button"
            onClick={createGame}
          >
            CREATE ROOM
          </button>

        </div>

      </div>
    );
  }

  // ===================================================
  // JOIN
  // ===================================================

  function JoinFrame() {
    return (
      <div className="screen">

        <div className="form-card">

          <button
            className="back-button"
            onClick={() =>
              setFrame("home")
            }
          >
            ← Back
          </button>

          <h2>
            Join Game
          </h2>

          <label>
            Your Name
          </label>

          <input
            className="text-input name-input"
            type="text"
            value={playerName}
            onChange={(e) =>
              setPlayerName(
                e.target.value
              )
            }
            placeholder="Enter your name"
            maxLength={20}
            autoComplete="name"
          />

          <div className="character-count">
            {playerName.length}/20
          </div>

          <label>
            Room Code
          </label>

          <input
            className="text-input room-input"
            type="text"
            inputMode="numeric"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(
                e.target.value
                  .replace(
                    /\D/g,
                    ""
                  )
                  .slice(
                    0,
                    4
                  )
              )
            }
            placeholder="0000"
            maxLength={4}
          />

          <button
            className="primary-button"
            onClick={joinGame}
          >
            JOIN ROOM
          </button>

        </div>

      </div>
    );
  }

  // ===================================================
  // WAITING ROOM
  // ===================================================

  function WaitingFrame() {
    const playerList =
      currentGame?.playerList ||
      [];

    const players =
      playerList.length;

    const max =
      currentGame?.maxPlayers ||
      maxPlayers;

    const allPlayersReady =
      playerList.length > 0 &&
      playerList.every(
        (player) =>
          player.ready === true
      );

    return (
      <div className="screen">

        <div className="waiting-card">

          <div className="room-code-box">

            <span>
              ROOM CODE
            </span>

            <strong>
              {currentGame?.roomCode}
            </strong>

          </div>

          <h2>
            Waiting Room
          </h2>

          <p>
            Share the room code
            with your friends.
          </p>

          <div className="player-count">
            {players} / {max} Players
          </div>

          <div className="waiting-player-list">

            {playerList.map(
              (player) => (
                <div
                  className="waiting-player"
                  key={
                    player.socketId
                  }
                >

                  <div className="player-avatar">
                    {player.name
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>

                  <div className="player-info">

                    <strong>

                      {player.name}

                      {player.socketId ===
                        currentGame.host && (
                        <span className="host-tag">
                          HOST
                        </span>
                      )}

                    </strong>

                  </div>

                  <div
                    className={
                      player.ready
                        ? "ready-badge"
                        : "not-ready-badge"
                    }
                  >
                    {player.ready
                      ? "✓ READY"
                      : "NOT READY"}
                  </div>

                </div>
              )
            )}

          </div>

          {/* PLAYER READY */}

          {!isHost && (
            <div className="ready-panel">

              <button
                className={
                  isReady
                    ? "ready-large ready-active"
                    : "ready-large"
                }
                onClick={
                  toggleReady
                }
                disabled={
                  readyLoading
                }
              >

                {readyLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    UPDATING...
                  </>
                ) : isReady ? (
                  "✓ READY"
                ) : (
                  "🎮 I'M READY"
                )}

              </button>

              <div className="ready-status-message">

                {isReady
                  ? "You are ready! Waiting for the host..."
                  : "Press the button when you are ready."}

              </div>

            </div>
          )}

          {/* HOST */}

          {isHost && (
            <div className="host-ready-status">

              {allPlayersReady ? (
                <>
                  <div className="host-ready-icon">
                    ✓
                  </div>

                  <strong>
                    Everyone is ready!
                  </strong>

                  <p>
                    You can start the game.
                  </p>

                  <button
                    className="start-large start-enabled"
                    onClick={
                      startGame
                    }
                  >
                    ▶ START GAME
                  </button>
                </>
              ) : (
                <>
                  <div className="host-ready-icon">
                    ⏳
                  </div>

                  <strong>
                    Waiting for players
                  </strong>

                  <p>
                    Everyone must be ready before the game can start.
                  </p>

                  <button
                    className="start-large"
                    disabled
                  >
                    🔒 WAITING FOR PLAYERS
                  </button>
                </>
              )}

            </div>
          )}

        </div>

      </div>
    );
  }

  // ===================================================
  // GAME
  // ===================================================

  function GameFrame() {
    const playerList =
      currentGame?.playerList ||
      [];

    return (
      <div className="game-screen">

        {/* TOP BAR */}

        <div className="game-topbar">

          <div>
            <strong>
              ROOM{" "}
              {currentGame?.roomCode}
            </strong>
          </div>

          <div>
            Players:{" "}
            {playerList.length}
          </div>

        </div>

        {/* MAIN GAME */}

        <div className="live-layout">

          {/* LEFT SIDEBAR */}

          <div className="game-sidebar">

            <div className="side-card">

              <h3>
                PLAYERS
              </h3>

              {playerList.map(
                (player) => (
                  <div
                    className="live-player"
                    key={
                      player.socketId
                    }
                  >

                    <span>
                      {player.name}
                    </span>

                    {player.socketId ===
                      currentGame.host && (
                      <span>
                        👑
                      </span>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

          {/* CENTER */}

          <div className="game-center">

            {/* NUMBER */}

            <div className="number-display-card">

              <div className="number-label">

                {isCalling
                  ? "CALLING..."
                  : currentNumber
                    ? "CURRENT NUMBER"
                    : "READY TO PLAY"}

              </div>

              <div
                className={
                  showNumberAnimation
                    ? "number-ball number-ball-pop"
                    : "number-ball"
                }
              >

                {showNumberAnimation
                  ? displayNumber
                  : currentNumber ||
                    "—"}

              </div>

              {announcement && (
                <div className="number-announcement">
                  🔊 {announcement}
                </div>
              )}

              {isHost ? (
                <button
                  className="call-number-button"
                  onClick={
                    callNumber
                  }
                  disabled={
                    isCalling
                  }
                >

                  {isCalling ? (
                    <>
                      <span className="button-spinner"></span>
                      CALLING...
                    </>
                  ) : (
                    "🎱 CALL NUMBER"
                  )}

                </button>
              ) : (
                <div className="waiting-for-host">
                  Waiting for host to call the next number...
                </div>
              )}

            </div>

            {/* CALLED NUMBERS */}

            <div className="called-board">

              <h3>
                CALLED NUMBERS
              </h3>

              <div className="called-grid">

                {Array.from(
                  {
                    length: 90
                  },
                  (_, index) =>
                    index + 1
                ).map(
                  (number) => {

                    const called =
                      calledNumbers.includes(
                        number
                      );

                    return (
                      <div
                        key={number}
                        className={
                          called
                            ? "called-number called"
                            : "called-number"
                        }
                      >
                        {number}
                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="ticket-section">

            <div className="ticket-card">

              <h2>
                Your Ticket
              </h2>

              {myTicket ? (
                <div className="ticket-grid">

                  {myTicket.map(
                    (
                      row,
                      rowIndex
                    ) =>
                      row.map(
                        (
                          number,
                          colIndex
                        ) => {

                          if (
                            number ===
                            null
                          ) {
                            return (
                              <div
                                key={`${rowIndex}-${colIndex}`}
                                className="ticket-cell empty"
                              />
                            );
                          }

                          const called =
                            calledNumbers.includes(
                              number
                            );

                          const marked =
                            markedNumbers.includes(
                              number
                            );

                          let className =
                            "ticket-cell";

                          if (
                            called
                          ) {
                            className +=
                              " called-cell";
                          }

                          if (
                            marked
                          ) {
                            className +=
                              " marked-cell";
                          }

                          return (
                            <button
                              key={`${rowIndex}-${colIndex}`}
                              className={
                                className
                              }
                              onClick={() =>
                                toggleNumber(
                                  number
                                )
                              }
                              disabled={
                                !called
                              }
                            >
                              {number}
                            </button>
                          );
                        }
                      )
                  )}

                </div>
              ) : (
                <div>
                  Loading ticket...
                </div>
              )}

            </div>

            {/* CLAIM */}

            <div className="claim-panel">

              <h3>
                CLAIM
              </h3>

              <button
                onClick={() =>
                  claimWin(
                    "Early Five"
                  )
                }
              >
                🖐 EARLY FIVE
              </button>

              <button
                onClick={() =>
                  claimWin(
                    "Top Line"
                  )
                }
              >
                ━ TOP LINE
              </button>

              <button
                onClick={() =>
                  claimWin(
                    "Middle Line"
                  )
                }
              >
                ━ MIDDLE LINE
              </button>

              <button
                onClick={() =>
                  claimWin(
                    "Bottom Line"
                  )
                }
              >
                ━ BOTTOM LINE
              </button>

              <button
                onClick={() =>
                  claimWin(
                    "Full House"
                  )
                }
              >
                🏆 FULL HOUSE
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ===================================================
  // RESULT
  // ===================================================

  function ResultFrame() {
    return (
      <div className="screen">

        <div className="result-card">

          <div className="result-trophy">
            🏆
          </div>

          <h1>
            GAME OVER
          </h1>

          {winnerMessage ? (
            <>
              <h2>
                {winnerMessage.pattern}
              </h2>

              <p>
                Winner:{" "}
                <strong>
                  {
                    winnerMessage.playerName
                  }
                </strong>
              </p>
            </>
          ) : (
            <p>
              The game has ended.
            </p>
          )}

          <button
            className="primary-button"
            onClick={() => {

              setFrame(
                "home"
              );

              setCurrentGame(
                null
              );

              setCurrentGameId(
                null
              );

              setMyTicket(
                null
              );

              setMarkedNumbers(
                []
              );

              setCalledNumbers(
                []
              );

              setCurrentNumber(
                null
              );

              setWinnerMessage(
                null
              );

              setRoomCode(
                ""
              );

              setPlayerName(
                ""
              );

            }}
          >
            BACK TO HOME
          </button>

        </div>

      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      {frame === "home" &&
        HomeFrame()}

      {frame === "create" &&
        CreateFrame()}

      {frame === "join" &&
        JoinFrame()}

      {frame === "waiting" &&
        WaitingFrame()}

      {frame === "game" &&
        GameFrame()}

      {frame === "result" &&
        ResultFrame()}
    </>
  );
}

export default App;