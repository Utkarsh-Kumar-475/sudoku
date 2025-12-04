// sudoku.js
// Expose Sudoku namespace with generator, render, checker, getUserGrid, etc.

(function(global){
  // helpers
  const idx = (r,c)=> r*9 + c;
  const rc = i => [Math.floor(i/9), i%9];

  // deep copy
  function clone(grid){ return grid.slice(); }

  // check validity for placing value at r,c
  function canPlace(grid, r, c, v) {
    for(let i=0;i<9;i++){
      if(grid[idx(r,i)]===v) return false;
      if(grid[idx(i,c)]===v) return false;
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
      if(grid[idx(br+dr, bc+dc)]===v) return false;
    }
    return true;
  }

  // backtracking solver — counts solutions up to limit (stopEarly)
  function countSolutions(grid, stopEarly=2){
    const g = clone(grid);
    function findEmpty(){
      for(let i=0;i<81;i++) if(!g[i]) return i;
      return -1;
    }
    let counter = 0;
    function dfs(){
      if(counter>=stopEarly) return;
      const pos = findEmpty();
      if(pos===-1){ counter++; return; }
      const [r,c] = rc(pos);
      for(let v=1;v<=9;v++){
        if(canPlace(g,r,c,v)){
          g[pos]=v;
          dfs();
          g[pos]=0;
          if(counter>=stopEarly) return;
        }
      }
    }
    dfs();
    return counter;
  }

  // full board generator (randomized backtracking)
  function generateFullBoard(){
    const g = Array(81).fill(0);
    // random order helper
    function shuffled(arr){ return arr.sort(()=>Math.random()-0.5); }
    function fillPos(pos=0){
      if(pos>=81) return true;
      const r = Math.floor(pos/9), c = pos%9;
      const nums = shuffled([1,2,3,4,5,6,7,8,9].slice());
      for(const n of nums){
        if(canPlace(g,r,c,n)){
          g[pos]=n;
          if(fillPos(pos+1)) return true;
          g[pos]=0;
        }
      }
      return false;
    }
    fillPos(0);
    return g;
  }

  // remove cells to create puzzle with unique solution (attempt-based)
  function makePuzzle(fullBoard, cluesTarget){
    const puzzle = fullBoard.slice();
    const positions = Array.from({length:81}, (_,i)=>i).sort(()=>Math.random()-0.5);
    for(const pos of positions){
      if(puzzle.filter(x=>x!==0).length <= cluesTarget) break;
      const saved = puzzle[pos];
      puzzle[pos]=0;
      const sols = countSolutions(puzzle,2);
      if(sols !== 1){
        // can't remove, restore
        puzzle[pos]=saved;
      }
    }
    return puzzle;
  }

  // public generatePuzzle(diff)
  function generatePuzzle(diff){
    const clues = diff === "easy" ? 36 : diff === "medium" ? 30 : 24;
    const full = generateFullBoard();
    const puzzle = makePuzzle(full, clues);
    return { puzzle, solution: full };
  }

  // basic validation for user grid — returns {complete:bool, conflicts:Set(index)}
  function validateUserGrid(userGrid){
    // userGrid as numbers or "", convert to ints (0 if empty)
    const g = userGrid.map(v => {
      const n = Number(v);
      return Number.isInteger(n) && n>=1 && n<=9 ? n : 0;
    });
    const conflicts = new Set();
    for(let i=0;i<81;i++){
      if(!g[i]) continue;
      const [r,c] = rc(i);
      // check row
      for(let j=0;j<9;j++){
        if(j===c) continue;
        if(g[idx(r,j)]===g[i]) { conflicts.add(i); conflicts.add(idx(r,j)); }
      }
      // check col
      for(let j=0;j<9;j++){
        if(j===r) continue;
        if(g[idx(j,c)]===g[i]) { conflicts.add(i); conflicts.add(idx(j,c)); }
      }
      // box
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
        const p = idx(br+dr, bc+dc);
        if(p===i) continue;
        if(g[p]===g[i]) { conflicts.add(i); conflicts.add(p); }
      }
    }
    const complete = g.every(v=>v>=1 && v<=9) && conflicts.size===0;
    return { complete, conflicts };
  }

  // UI rendering + event wiring
  function renderBoard(fullObj){
    // fullObj: {puzzle, solution}
    const puzzle = fullObj.puzzle;
    const board = document.getElementById("board");
    board.innerHTML = "";
    for(let i=0;i<81;i++){
      const cell = document.createElement("div");
      cell.className = "cell";
      const [r,c] = rc(i);

      // thicker edges for 3x3 boxes
      if(r%3===0) cell.dataset.boxEdgeTop = "true";
      if(c%3===0) cell.dataset.boxEdgeLeft = "true";
      if(c%3===2) cell.dataset.boxEdgeRight = "true";
      if(r%3===2) cell.dataset.boxEdgeBottom = "true";

      if(puzzle[i]){
        cell.textContent = puzzle[i];
        cell.classList.add("fixed");
        cell.dataset.fixed = "1";
      } else {
        // editable input inside cell to improve keyboard behavior
        const input = document.createElement("input");
        input.setAttribute("inputmode","numeric");
        input.setAttribute("maxlength","1");
        input.dataset.idx = i;
        input.className = "cell-input";
        input.value = "";
        cell.appendChild(input);
      }
      cell.dataset.index = i;
      board.appendChild(cell);
    }

    // attach events
    board.querySelectorAll(".cell input").forEach(inp=>{
      inp.addEventListener("input", onInput);
      inp.addEventListener("focus", onFocus);
      inp.addEventListener("keydown", onKeyDown);
    });
    board.addEventListener("click", (e)=>{
      if(e.target.classList.contains("cell")) {
        const input = e.target.querySelector("input");
        if(input){ input.focus(); input.select(); }
      }
    });

    // helper closures for events
    function getUserGridValues(){
      const cells = [];
      for(let i=0;i<81;i++){
        const el = board.querySelector(`.cell[data-index="${i}"]`);
        if(el.dataset.fixed) cells.push(String(el.textContent).trim());
        else {
          const v = el.querySelector("input").value.trim();
          cells.push(v);
        }
      }
      return cells;
    }

    function applyHighlights(focusIndex){
      // remove all highlight classes
      board.querySelectorAll(".cell").forEach(c=>{
        c.classList.remove("highlight","match");
      });
      if(focusIndex==null) return;
      const [fr,fc] = rc(Number(focusIndex));
      const userVals = getUserGridValues();
      const val = userVals[focusIndex] || null;

      board.querySelectorAll(".cell").forEach((c)=>{
        const idxC = Number(c.dataset.index);
        const [r,cx] = rc(idxC);
        if(r===fr || cx===fc) c.classList.add("highlight"); // row/col highlight
        if(val && (userVals[idxC]===val || (c.dataset.fixed && c.textContent===val))) c.classList.add("match"); // matching digits
      });
    }

    function onFocus(e){
      const index = e.target.dataset.idx;
      applyHighlights(index);
    }

    function onKeyDown(e){
      // allow arrow navigation
      const key = e.key;
      const pos = Number(e.target.dataset.idx);
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(key)){
        e.preventDefault();
        let [r,c] = rc(pos);
        if(key==="ArrowUp") r = (r+8)%9;
        if(key==="ArrowDown") r = (r+1)%9;
        if(key==="ArrowLeft") c = (c+8)%9;
        if(key==="ArrowRight") c = (c+1)%9;
        const next = document.querySelector(`input[data-idx="${idx(r,c)}"]`);
        if(next) { next.focus(); next.select(); }
      }
      if(key==="Backspace" || key==="Delete"){
        e.target.value = "";
        e.preventDefault();
        e.target.dispatchEvent(new Event('input'));
      }
    }

    function onInput(e){
      const raw = e.target.value.replace(/[^1-9]/g,"").slice(0,1);
      e.target.value = raw;
      // immediate validation & mark wrong cells
      const userGrid = getUserGridValues();
      const {conflicts} = validateUserGrid(userGrid.map(v=> v==="" ? "" : v));
      // clear wrong classes
      board.querySelectorAll(".cell").forEach(c=> c.classList.remove("wrong"));
      conflicts.forEach(pos => {
        const el = board.querySelector(`.cell[data-index="${pos}"]`);
        if(el) el.classList.add("wrong");
      });

      // also highlight row/col & matches for focused
      applyHighlights(e.target.dataset.idx);
    }

    // expose helper for external access
    return {
      getUserGrid: () => getUserGridValues(),
      validateUserGrid: () => validateUserGrid(getUserGridValues().map(v=> v===""? "" : v)),
    };
  }

  // small util to translate coordinates to index (exposed)
  window.Sudoku = {
    generatePuzzle,
    renderBoard,
    validateUserGrid,
    // helper to format received puzzle into numbers
    formatGrid: (g) => g.map(v=> v? Number(v): 0)
  };

})(window);
