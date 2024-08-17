const canvas = document.getElementById('owelaBoard');
const ctx = canvas.getContext('2d');
const simplifiedBoard = [
  [2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2],
];
const board = simplifiedBoard.map((row) =>
  row.map((seedCount) => ({
    count: seedCount,
    status: 'neutral',
  }))
);
const cellSize = 80;
const initialDelayTimeMs = 500;
let delayTimeMs = initialDelayTimeMs;
let currentPlayer = 1; // Player 1 starts
let awaitingPlayerInput = true; // Initially, waiting for player 1's move
let seedsInHand = 0; // to keep track of how many seeds are currently being sown

canvas.addEventListener('click', handleCanvasClick);

// Reduce the delay time when the skip button is clicked
document
  .getElementById('skipButton')
  .addEventListener('click', function () {
    console.log("Skip button clicked. Let's speed things up!");
    delayTimeMs = 50; // Set to a lower number for fast-forward effect
  });

/**
 * Detects a player's click on the canvas and triggers appropriate actions.
 */
function handleCanvasClick(event) {
  if (!awaitingPlayerInput) return;
  let x = event.clientX - canvas.getBoundingClientRect().left;
  let y = event.clientY - canvas.getBoundingClientRect().top;
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);
  if (isPitPlayable(row, col)) {
    awaitingPlayerInput = false;
    playTurn(row, col);
  }
}

/**
 * Checks if the clicked pit can be played by the current player.
 */
function isPitPlayable(row, col) {
  return (
    ((currentPlayer === 1 && row <= 1) ||
      (currentPlayer === 2 && row >= 2)) &&
    board[row][col].count >= 1
  );
}

async function playTurn(startRow, startCol) {
  console.log(
    `Player ${currentPlayer} started sowing from (${startRow}, ${startCol}).`
  );

  markForTaking(startRow, startCol);
  await delay(delayTimeMs);

  takeSeeds(startRow, startCol);
  await delay(delayTimeMs);

  let [row, col] = [startRow, startCol];

  while (seedsInHand > 0) {
    [row, col] = determineNextCell(row, col);

    markForPlacing(row, col);
    await delay(delayTimeMs);

    placeSeed(row, col);
    await delay(delayTimeMs);
  }

  if (shouldCapture(row, col, currentPlayer)) {
    markForCapture(row, col);
    await delay(delayTimeMs);

    captureSeeds(row, col);
    await delay(delayTimeMs);
  }

  if (checkForWin()) return;

  if (board[row][col].count > 1) {
    playTurn(row, col);
  } else {
    delayTimeMs = initialDelayTimeMs; // Reset the delay time for the next turn
    switchPlayer();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * check if a player's front row is empty.
 */
function checkForWin() {
  const playerFrontRow = currentPlayer === 1 ? 1 : 2;
  const opponentFrontRow = currentPlayer === 1 ? 2 : 1;
  const opponentNumber = currentPlayer === 1 ? 2 : 1;

  const isPlayerFrontRowEmpty = board[playerFrontRow].every(
    (pit) => pit.count === 0
  );
  const isOpponentFrontRowEmpty = board[opponentFrontRow].every(
    (pit) => pit.count === 0
  );

  if (isPlayerFrontRowEmpty) {
    displayWinner(opponentNumber); // The opponent is the winner
    return true;
  }

  if (isOpponentFrontRowEmpty) {
    displayWinner(currentPlayer); // The current player is the winner
    return true;
  }

  return false;
}

function displayWinner(winningPlayer) {
  console.log(`Player ${winningPlayer} wins!`);
  drawBoard();
  ctx.font = '30px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Player ${winningPlayer} wins!`,
    canvas.width / 2,
    canvas.height * 0.8
  );
  awaitingPlayerInput = false; // Stops the game

  // Remove the event listener to pause the game.
  canvas.removeEventListener('click', handleCanvasClick);
}

/**
 * Switches to the other player.
 */
function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  awaitingPlayerInput = true;
  console.log(`Player ${currentPlayer} to move next.`);
  drawBoard();
}
function markForPlacing(row, col) {
  board[row][col].status = 'placing';
  drawBoard();
}
function placeSeed(row, col) {
  board[row][col].status = 'neutral';
  board[row][col].count++;
  seedsInHand--;
  drawBoard();

  let soundNumber = Math.ceil(Math.random() * 3); // This will give 1, 2, or 3
  let sound = document.getElementById(
    'placingSeedSound0' + soundNumber
  );
  sound.currentTime = 0; // Reset the sound
  sound.play();
}
function markForTaking(row, col) {
  board[row][col].status = 'taking';
  drawBoard();
}
function takeSeeds(row, col) {
  seedsInHand += board[row][col].count;
  board[row][col].count = 0;
  board[row][col].status = 'neutral';
  drawBoard();

  if (seedsInHand === 1) {
    let sound = document.getElementById('takingSeedSound');
    sound.currentTime = 0; // Reset the sound
    sound.play();
  } else if (seedsInHand > 1) {
    let sound = document.getElementById('takingSeedsSound');
    sound.currentTime = 0; // Reset the sound
    sound.play();
  }
}
function shouldCapture(row, col, player) {
  return (
    seedsInHand === 0 &&
    isInInnerRow(row, player) &&
    board[row][col].count >= 2 && // The last seed must be placed in an occupied pit
    board[adjacentRow(row)][col].count > 0
  );
}
function markForCapture(row, col) {
  markForTaking(row, col);
  markForTaking(adjacentRow(row), col);
  drawBoard();
}
function captureSeeds(row, col) {
  seedsInHand += board[adjacentRow(row)][col].count;
  board[adjacentRow(row)][col].count = 0;
  board[adjacentRow(row)][col].status = 'neutral';
  drawBoard();

  let sound = document.getElementById('capturingSeedsSound');
  sound.currentTime = 0; // Reset the sound
  sound.play();
}

/**
 * Determines the next cell in the sowing direction.
 */
function determineNextCell(row, col) {
  if (currentPlayer === 1) {
    if (row === 0) {
      col === 7 ? (row = 1) : col++;
    } else {
      col === 0 ? (row = 0) : col--;
    }
  } else {
    if (row === 3) {
      col === 0 ? (row = 2) : col--;
    } else {
      col === 7 ? (row = 3) : col++;
    }
  }
  return [row, col];
}

/**
 * Checks if the current row is the inner row for the current player.
 */
function isInInnerRow(row, player) {
  return (player === 1 && row === 1) || (player === 2 && row === 2);
}

/**
 * Returns the row directly opposite to the given row.
 */
function oppositeRow(row) {
  return row === 1 ? 3 : 0;
}

/**
 * For the middle rows, gets the adjacent row in the direction of the current player.
 */
function adjacentRow(row) {
  return row === 1 ? 2 : 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.strokeStyle = 'black';
      // Check status and change fill color accordingly
      if (board[j][i].status === 'placing') {
        ctx.fillStyle = 'green';
      } else if (board[j][i].status === 'taking') {
        ctx.fillStyle = 'red';
      } else if (awaitingPlayerInput && isPitPlayable(j, i)) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
      } else {
        ctx.fillStyle = 'white';
      }
      ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
      ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
      if (board[j][i].count > 0) {
        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          board[j][i].count,
          i * cellSize + cellSize / 2,
          j * cellSize + cellSize / 2
        );
      }
    }
  }
  // Display the current player's turn and seeds in hand:
  ctx.fillStyle = 'black';
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Player ${currentPlayer}'s turn`, 10, 330);
  ctx.fillText(`Seeds in hand: ${seedsInHand}`, 10, 360);
}

drawBoard();
