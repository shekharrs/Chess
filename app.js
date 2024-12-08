const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
  console.log("connected");

  // Assign players
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w"); // emit correct event
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b"); // emit correct event
  } else {
    uniquesocket.emit("spectatorRole");
  }

  // Listen for moves from the player
  uniquesocket.on("move", (move) => {
    try {
      // Check if the player is making a valid move for their color
      if (
        (chess.turn() === "w" && uniquesocket.id !== players.white) ||
        (chess.turn() === "b" && uniquesocket.id !== players.black)
      ) {
        return; // Prevent invalid moves
      }

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move); // Broadcast the move to both players
        io.emit("boardState", chess.fen()); // Update the board state
      } else {
        console.log("Invalid move : ", move);
        uniquesocket.emit("invalidMove", move); // Inform the player of the invalid move
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("invalidMove", move); // Handle error and notify the player
    }
  });

  // Handle disconnection
  uniquesocket.on("disconnect", function () {
    if (uniquesocket.id === players.white) {
      delete players.white;
    } else if (uniquesocket.id === players.black) {
      delete players.black;
    }
  });
});

server.listen(3000, function () {
  console.log("Listening on port 3000...");
});
