function generatePuzzle(diff) {
  const grid = Array(81).fill("");
  let clues = diff === "easy" ? 40 : diff === "medium" ? 30 : 25;
  while (clues--) {
    let pos = Math.floor(Math.random() * 81);
    grid[pos] = Math.floor(Math.random() * 9) + 1;
  }
  return grid;
}

function renderBoard(grid) {
  const board = document.getElementById("board");
  board.innerHTML = "";
  grid.forEach((v, i) => {
    const input = document.createElement("input");
    input.maxLength = 1;
    input.classList.add("cell");
    input.value = v || "";
    if (v) input.disabled = true;
    board.appendChild(input);
  });
}

function getUserGrid() {
  return [...document.querySelectorAll(".cell")].map(c => c.value);
}

// Very light validation (not a perfect solver)
function isValidSudoku(grid) {
  return grid.every(v => v >= 1 && v <= 9);
}

window.Sudoku = { generatePuzzle, renderBoard, isValidSudoku, getUserGrid };
