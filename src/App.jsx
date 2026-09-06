import { useEffect, useState } from "react";
import socket from "./socket";
import "./index.css";

function App() {
  const [frame, setFrame] = useState("home");

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(5);

  const [currentGameId, setCurrentGameId] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);

  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [games, setGames] = useState([]);

  const [myTicket, setMyTicket] = useState(null);
  const [markedNumbers, setMarkedNumbers] = useState([]);

  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);

  const [winnerMessage, setWinnerMessage] = useState(null);

  const [readyLoading, setReadyLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const [showNumberAnimation, setShowNumberAnimation] =
    useState(false);

  const [displayNumber, setDisplayNumber] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  // =====================================================
  // SOCKET EVENTS
  // =====================================================

  useEffect(() => {
    function handleGamesUpdated(updatedGames) {
      setGames(updatedGames || []);
    }

    function handleGameCreated(game) {
      if (!game) return;

      setCurrentGame(game);
      setCurrentGameId(game.id);
      setRoomCode(game.roomCode);
      setIsHost(true);
      setIsReady(true);

      setFrame("waiting");
    }

    function handleTicketAssigned(ticket) {
      setMyTicket(ticket);
    }

    function handleGameUpdated(game) {
      if (!game) return;

      setCurrentGame(game);
      setCurrentGameId(game.id);
      setRoomCode(game.roomCode);

      setCalledNumbers(game.calledNumbers || []);
      setCurrentNumber(game.currentNumber || null);

      const me = game.playerList?.find(
        (player) => player.socketId === socket.id
      );

      if (me) {
        setIsReady(me.ready === true);
        setIsHost(me.socketId === game.host);
      }

      if (game.status === "Waiting") {
        setFrame("waiting");
      }

      if (game.status === "Playing") {
        setFrame("game");
      }

      if (game.status === "Game Over") {
        setFrame("result");
      }

      setReadyLoading(false);
    }

    function handleGameStarted(game) {
      if (!game) return;

      setCurrentGame(game);
      setCurrentGameId(game.id);

      setCalledNumbers(game.calledNumbers || []);
      setCurrentNumber(game.currentNumber || null);

      setFrame("game");
      setReadyLoading(false);
    }

    function handleNumberCalled(data) {
      if (!data) return;

      const number =
        typeof data === "number"
          ? data
          : data.number;

      if (!number) return;

      setIsCalling(false);
      setCurrentNumber(number);

      if (Array.isArray(data.calledNumbers)) {
        setCalledNumbers(data.calledNumbers);
      } else {
        setCalledNumbers((previous) => {
          if (previous.includes(number)) {
            return previous;
          }

          return [...previous, number];
        });
      }

      setDisplayNumber(number);
      setShowNumberAnimation(true);

      announceNumber(number);

      setTimeout(() => {
        setShowNumberAnimation(false);
      }, 2500);
    }

    function handleWinnerAnnounced(data) {
      if (!data) return;

      setWinnerMessage(data);

      if (data.game) {
        setCurrentGame(data.game);

        if (data.game.status === "Game Over") {
          setFrame("result");
        }
      }
    }

    function handleClaimResult(data) {
      if (!data) return;

      if (!data.success) {
        alert(data.message || "Claim failed.");
        return;
      }

      setWinnerMessage(data);

      if (data.game?.status === "Game Over") {
        setFrame("result");
      }
    }

    function handleGameError(data) {
      setReadyLoading(false);
      setIsCalling(false);

      alert(
        data?.message ||
          "Something went wrong."
      );
    }

    function handleJoinError(data) {
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

  // =====================================================
  // NUMBER ANNOUNCEMENT
  // =====================================================

  function announceNumber(number) {
    const text = `Number ${number}`;

    setAnnouncement(text);

    if ("speechSynthesis" in window) {
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

  // =====================================================
  // CREATE GAME
  // =====================================================

  function createGame() {
    const cleanName =
      playerName.trim();

    if (!cleanName) {
      alert("Please enter your name.");
      return;
    }

    if (!socket.connected) {
      alert(
        "Server is not connected. Please refresh the page."
      );
      return;
    }

    socket.emit(
      "createGame",
      {
        playerName: cleanName,
        maxPlayers,
      }
    );
  }

  // =====================================================
  // JOIN GAME
  // =====================================================

  function joinGame() {
    const cleanName =
      playerName.trim();

    const cleanRoom =
      roomCode.trim();

    if (!cleanName) {
      alert("Please enter your name.");
      return;
    }

    if (!/^\d{4}$/.test(cleanRoom)) {
      alert(
        "Room code must be 4 digits."
      );
      return;
    }

    if (!socket.connected) {
      alert(
        "Server is not connected. Please refresh the page."
      );
      return;
    }

    socket.emit(
      "joinGame",
      {
        roomCode: cleanRoom,
        playerName: cleanName,
      }
    );
  }

  // =====================================================
  // READY
  // =====================================================

  function toggleReady() {
    if (!currentGameId) return;
    if (isHost) return;
    if (readyLoading) return;

    setReadyLoading(true);

    socket.emit(
      "toggleReady",
      currentGameId
    );
  }

  // =====================================================
  // START GAME
  // =====================================================

  function startGame() {
    if (!currentGameId) return;
    if (!isHost) return;

    socket.emit(
      "startGame",
      currentGameId
    );
  }

  // =====================================================
  // CALL NUMBER
  // =====================================================

  function callNumber() {
    if (!currentGameId) return;
    if (!isHost) return;
    if (isCalling) return;

    if (calledNumbers.length >= 90) {
      alert(
        "All numbers have been called."
      );
      return;
    }

    setIsCalling(true);

    socket.emit(
      "callNumber",
      currentGameId
    );
  }

  // =====================================================
  // MARK TICKET
  // =====================================================

  function toggleNumber(number) {
    if (
      !calledNumbers.includes(number)
    ) {
      return;
    }

    setMarkedNumbers((previous) => {
      if (previous.includes(number)) {
        return previous.filter(
          (n) => n !== number
        );
      }

      return [
        ...previous,
        number,
      ];
    });
  }

  // =====================================================
  // CLAIM WIN
  // =====================================================

  function claimWin(pattern) {
    if (!currentGameId) return;

    socket.emit(
      "claimWin",
      {
        gameId: currentGameId,
        pattern,
        markedNumbers,
      }
    );
  }

  // =====================================================
  // HOME FRAME
  // =====================================================

  function HomeFrame() {
    return (
      <div className="home-screen">

        {/* Background Glows */}

        <div className="home-bg-glow glow-left"></div>

        <div className="home-bg-glow glow-right"></div>


        {/* =================================================
            NAVIGATION
            ================================================= */}

        <header className="home-nav">

          <div className="brand">

            <div className="brand-mark">
              <span>8</span>
            </div>

            <span className="brand-name">
              HOUSEIE
            </span>

          </div>


          <nav className="nav-links">

            <button
              className="nav-link active"
              onClick={() =>
                setFrame("home")
              }
            >
              Home
            </button>


            <button
              className="nav-link"
              onClick={() =>
                alert(
                  "How to Play:\n\n1. Create or join a room.\n2. Get your Tambola ticket.\n3. The host calls numbers.\n4. Mark the numbers on your ticket.\n5. Claim Early Five, Lines or Full House."
                )
              }
            >
              How to Play
            </button>


            <button
              className="nav-link"
              onClick={() =>
                alert(
                  "HOUSEIE is an online multiplayer Tambola game where you can create a private room and play with your friends."
                )
              }
            >
              About
            </button>

          </nav>


          <div className="nav-tagline">
            Play
            <span>•</span>
            Connect
            <span>•</span>
            Win
          </div>

        </header>


        {/* =================================================
            FLOATING NUMBER BALLS
            ================================================= */}

        <div className="floating-ball ball-12">
          <span>12</span>
        </div>


        <div className="floating-ball ball-78 red">
          <span>78</span>
        </div>


        <div className="floating-ball ball-45 gold">
          <span>45</span>
        </div>


        <div className="floating-ball ball-33 blue">
          <span>33</span>
        </div>


        {/* =================================================
            CENTER HOUSE ICON
            ================================================= */}

        <div className="hero-ball house-hero-ball">

          <span className="house-icon">
            🏠
          </span>

          <div className="crown">
            ♛
          </div>

        </div>


        {/* =================================================
            DECORATIVE CONFETTI
            ================================================= */}

        <div className="confetti confetti-a">
          ◆
        </div>

        <div className="confetti confetti-b">
          ◆
        </div>

        <div className="confetti confetti-c">
          ◆
        </div>

        <div className="confetti confetti-d">
          ◆
        </div>


        {/* =================================================
            HERO CONTENT
            ================================================= */}

        <main className="hero-content">

          <h1>
            HOUSEIE
          </h1>


          <p>
            The Ultimate Online Tambola Game
          </p>


          {/* Kept for functionality,
              hidden by CSS */}

          <div className="server-status">

            <span className="status-dot"></span>

            Server Connected

          </div>


          {/* =================================================
              CREATE / JOIN
              ================================================= */}

          <div className="home-action-panel">

            <button
              className="home-action primary-action"
              onClick={() =>
                setFrame("create")
              }
            >

              <span className="action-icon">
                🎮
              </span>

              <span>
                CREATE GAME
              </span>

              <span className="action-arrow">
                →
              </span>

            </button>


            <button
              className="home-action secondary-action"
              onClick={() =>
                setFrame("join")
              }
            >

              <span className="action-icon">
                👥
              </span>

              <span>
                JOIN GAME
              </span>

              <span className="action-arrow">
                →
              </span>

            </button>

          </div>


          {/* Kept for functionality,
              hidden by CSS */}

          <div className="home-tagline">
            Create a room. Invite your friends.
            Call the numbers. Win the game.
          </div>

        </main>


        {/* =================================================
            LEFT TAMBOLA TICKET
            ================================================= */}

        <div className="decor-ticket ticket-left">

          <div className="ticket-title">
            TAMBOLA
          </div>


          <div className="mini-ticket-grid">

            {[
              4,
              17,
              36,
              52,
              68,
              8,
              22,
              45,
              60,
              72,
              3,
              29,
              37,
              59,
              70,
            ].map(
              (
                number,
                index
              ) => (
                <span
                  key={index}
                  className={
                    number === 45
                      ? "ticket-hot"
                      : ""
                  }
                >
                  {number}
                </span>
              )
            )}

          </div>

        </div>


        {/* =================================================
            RIGHT TAMBOLA TICKET
            ================================================= */}

        <div className="decor-ticket ticket-right">

          <div className="ticket-title">
            TAMBOLA
          </div>


          <div className="mini-ticket-grid">

            {[
              9,
              16,
              33,
              48,
              61,
              5,
              21,
              44,
              57,
              76,
              12,
              28,
              42,
              58,
              73,
            ].map(
              (
                number,
                index
              ) => (
                <span
                  key={index}
                  className={
                    number === 33 ||
                    number === 44 ||
                    number === 58
                      ? "ticket-hot"
                      : ""
                  }
                >
                  {number}
                </span>
              )
            )}

          </div>

        </div>


        {/* =================================================
            BOTTOM WAVES
            ================================================= */}

        <div className="bottom-wave wave-one"></div>

        <div className="bottom-wave wave-two"></div>

      </div>
    );
  }


  // =====================================================
  // CREATE GAME FRAME
  // =====================================================

  function CreateFrame() {
    return (
      <div className="inner-screen purple-soft-screen">

        <div className="form-card redesigned-form-card">

          <button
            className="back-button"
            onClick={() =>
              setFrame("home")
            }
          >
            ← Back
          </button>


          <div className="form-icon">
            🎮
          </div>


          <h2>
            Create Game
          </h2>


          <p className="form-subtitle">
            Create a private room and invite
            your friends.
          </p>


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
            className="primary-button large-form-button"
            onClick={createGame}
          >
            CREATE ROOM

            <span>
              →
            </span>

          </button>


          <div className="form-info">
            🔒 Your room is private.
            Share the 4-digit room code
            with your players.
          </div>

        </div>

      </div>
    );
  }


  // =====================================================
  // JOIN GAME FRAME
  // =====================================================

  function JoinFrame() {
    return (
      <div className="inner-screen purple-soft-screen">

        <div className="form-card redesigned-form-card join-form-card">

          <button
            className="back-button"
            onClick={() =>
              setFrame("home")
            }
          >
            ← Back
          </button>


          <div className="form-icon people-icon">
            👥
          </div>


          <h2>
            Join Game
          </h2>


          <p className="form-subtitle">
            Enter your details and join
            a friend's room.
          </p>


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
                  .replace(/\D/g, "")
                  .slice(0, 4)
              )
            }
            placeholder="0000"
            maxLength={4}
          />


          <button
            className="primary-button large-form-button"
            onClick={joinGame}
          >
            JOIN ROOM

            <span>
              →
            </span>

          </button>


          <div className="join-divider">
            <span>
              OR
            </span>
          </div>


          <div className="available-games">

            <div className="available-heading">
              AVAILABLE GAMES
            </div>


            {games.length === 0 ? (
              <div className="no-games">
                No public games available
                right now.
              </div>
            ) : (
              games.map(
                (game) => (
                  <button
                    key={game.id}
                    className="game-option"
                    onClick={() =>
                      setRoomCode(
                        game.roomCode
                      )
                    }
                  >

                    <span>

                      <strong>
                        Room {game.roomCode}
                      </strong>

                      <small>
                        {game.players?.length ||
                          game.playerList?.length ||
                          0}{" "}
                        /{" "}
                        {game.maxPlayers}{" "}
                        players
                      </small>

                    </span>


                    <span>
                      →
                    </span>

                  </button>
                )
              )
            )}

          </div>

        </div>

      </div>
    );
  }


  // =====================================================
  // WAITING ROOM
  // =====================================================

  function WaitingFrame() {
    const playerList =
      currentGame?.playerList || [];

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
      <div className="inner-screen purple-soft-screen">

        <div className="waiting-card redesigned-waiting-card">

          <div className="waiting-header">

            <div>

              <div className="eyebrow">
                GAME LOBBY
              </div>

              <h2>
                Waiting Room
              </h2>

              <p>
                Share the room code with
                your friends and get ready.
              </p>

            </div>


            <div className="room-code-box">

              <span>
                ROOM CODE
              </span>

              <strong>
                {currentGame?.roomCode}
              </strong>

              <button
                onClick={() =>
                  navigator.clipboard?.writeText(
                    currentGame?.roomCode || ""
                  )
                }
              >
                COPY
              </button>

            </div>

          </div>


          <div className="waiting-stats">

            <span>
              👥 {players} / {max} Players
            </span>

            <span>
              🎱 Tambola Room
            </span>

          </div>


          <div className="waiting-player-list">

            {playerList.map(
              (player) => (
                <div
                  className="waiting-player"
                  key={player.socketId}
                >

                  <div className="player-avatar">
                    {player.name
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>


                  <div className="player-info">

                    <strong>
                      {player.name}
                    </strong>


                    {player.socketId ===
                      currentGame.host && (
                      <span className="host-tag">
                        HOST
                      </span>
                    )}

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


          {!isHost && (
            <div className="ready-panel">

              <button
                className={
                  isReady
                    ? "ready-large ready-active"
                    : "ready-large"
                }
                onClick={toggleReady}
                disabled={readyLoading}
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
                    onClick={startGame}
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
                    Everyone must be ready
                    before the game can start.
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


  // =====================================================
  // GAME FRAME
  // =====================================================

  function GameFrame() {
    const playerList =
      currentGame?.playerList || [];

    return (
      <div className="game-screen redesigned-game-screen">

        <div className="game-topbar redesigned-game-topbar">

          <div className="brand">

            <div className="brand-mark small-mark">
              <span>8</span>
            </div>

            <strong>
              HOUSEIE
            </strong>

          </div>


          <div className="game-room-pill">
            ROOM {currentGame?.roomCode}
          </div>


          <div className="game-player-pill">
            👥 {playerList.length} PLAYERS
          </div>

        </div>


        <div className="live-layout redesigned-live-layout">

          {/* PLAYERS */}

          <aside className="game-sidebar">

            <div className="side-card player-side-card">

              <div className="section-heading">

                <span>
                  PLAYERS
                </span>

                <small>
                  {playerList.length}
                </small>

              </div>


              {playerList.map(
                (player) => (
                  <div
                    className="live-player"
                    key={player.socketId}
                  >

                    <span className="live-avatar">
                      {player.name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>


                    <span className="live-player-name">
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

          </aside>


          {/* CENTER */}

          <main className="game-center">

            <div className="number-display-card main-number-card">

              <div className="number-label">

                {isCalling
                  ? "CALLING NEXT NUMBER"
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

                <span>
                  {showNumberAnimation
                    ? displayNumber
                    : currentNumber ||
                      "—"}
                </span>

              </div>


              {announcement && (
                <div className="number-announcement">
                  🔊 {announcement}
                </div>
              )}


              {isHost ? (
                <button
                  className="call-number-button"
                  onClick={callNumber}
                  disabled={isCalling}
                >

                  {isCalling ? (
                    <>
                      <span className="button-spinner"></span>
                      CALLING...
                    </>
                  ) : (
                    "🎱 CALL NEXT NUMBER"
                  )}

                </button>
              ) : (
                <div className="waiting-for-host">
                  Waiting for the host to call
                  the next number...
                </div>
              )}

            </div>


            {/* CALLED NUMBERS */}

            <div className="called-board redesigned-called-board">

              <div className="section-heading">

                <span>
                  CALLED NUMBERS
                </span>

                <small>
                  {calledNumbers.length} / 90
                </small>

              </div>


              <div className="called-grid">

                {Array.from(
                  { length: 90 },
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

          </main>


          {/* TICKET */}

          <aside className="ticket-section">

            <div className="ticket-card redesigned-ticket-card">

              <div className="ticket-heading">

                <div>

                  <div className="eyebrow">
                    YOUR
                  </div>

                  <h2>
                    Tambola Ticket
                  </h2>

                </div>


                <span>
                  15 NUMBERS
                </span>

              </div>


              {myTicket ? (
                <div className="ticket-grid">

                  {myTicket.map(
                    (row, rowIndex) =>
                      row.map(
                        (
                          number,
                          colIndex
                        ) => {

                          if (
                            number === null
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


                          if (called) {
                            className +=
                              " called-cell";
                          }


                          if (marked) {
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
                <div className="ticket-loading">
                  Loading ticket...
                </div>
              )}


              <div className="ticket-hint">
                Yellow = called
                &nbsp; • &nbsp;
                Purple = marked
              </div>

            </div>


            {/* CLAIM PANEL */}

            <div className="claim-panel redesigned-claim-panel">

              <div className="section-heading">

                <span>
                  CLAIM A WIN
                </span>

                <small>
                  VALIDATED
                </small>

              </div>


              <button
                onClick={() =>
                  claimWin("Early Five")
                }
              >
                🖐 EARLY FIVE
                <span>→</span>
              </button>


              <button
                onClick={() =>
                  claimWin("Top Line")
                }
              >
                ━ TOP LINE
                <span>→</span>
              </button>


              <button
                onClick={() =>
                  claimWin("Middle Line")
                }
              >
                ━ MIDDLE LINE
                <span>→</span>
              </button>


              <button
                onClick={() =>
                  claimWin("Bottom Line")
                }
              >
                ━ BOTTOM LINE
                <span>→</span>
              </button>


              <button
                onClick={() =>
                  claimWin("Full House")
                }
              >
                🏆 FULL HOUSE
                <span>→</span>
              </button>

            </div>

          </aside>

        </div>

      </div>
    );
  }


  // =====================================================
  // RESULT FRAME
  // =====================================================

  function ResultFrame() {
    return (
      <div className="result-screen">

        <div className="result-glow"></div>


        <div className="result-card redesigned-result-card">

          <div className="result-trophy">
            🏆
          </div>


          <div className="eyebrow">
            GAME COMPLETE
          </div>


          <h1>
            We Have a Winner!
          </h1>


          {winnerMessage ? (
            <>
              <div className="winner-pattern">
                {winnerMessage.pattern}
              </div>

              <p>
                Congratulations to{" "}
                <strong>
                  {winnerMessage.playerName}
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

              setFrame("home");

              setCurrentGame(null);
              setCurrentGameId(null);

              setMyTicket(null);
              setMarkedNumbers([]);

              setCalledNumbers([]);
              setCurrentNumber(null);

              setWinnerMessage(null);

              setRoomCode("");
              setPlayerName("");

            }}
          >
            BACK TO HOME
          </button>

        </div>

      </div>
    );
  }


  // =====================================================
  // RENDER
  // =====================================================

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