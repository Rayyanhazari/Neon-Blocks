(() => {
  "use strict";
  const SIZE = 10;
  const COLORS = [
    { main: "#39d8ff", light: "#a5f5ff", glow: "#39d8ff55" },
    { main: "#9a79ff", light: "#d1c2ff", glow: "#9a79ff55" },
    { main: "#ff58ba", light: "#ffb2df", glow: "#ff58ba55" },
    { main: "#45f0a5", light: "#a7ffd6", glow: "#45f0a555" },
    { main: "#ffb84e", light: "#ffe0a6", glow: "#ffb84e55" },
    { main: "#4d85ff", light: "#a9c4ff", glow: "#4d85ff55" }
  ];
  const SHAPES = [
    [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]], [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
    [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[0,2],[1,0]], [[0,0],[1,0],[1,1],[1,2]],
    [[0,0],[1,0],[2,0],[2,1]], [[0,2],[1,0],[1,1],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]], [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[2,0],[1,1]], [[0,1],[1,0],[1,1],[1,2],[2,1]],
    [[0,0],[0,1],[0,2],[1,1],[2,1]], [[0,0],[1,0],[1,1],[2,1]],
    [[0,1],[1,0],[1,1],[2,0]], [[0,0],[1,0],[2,0],[2,1],[2,2]],
    [[0,0],[0,1],[0,2],[1,2],[2,2]], [[0,0],[1,0],[2,0],[0,1],[0,2]]
  ];
  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const streakEl = document.getElementById("streak");
  const statusEl = document.getElementById("statusText");
  const toastEl = document.getElementById("toast");
  const gameOverModal = document.getElementById("gameOverModal");
  const howModal = document.getElementById("howModal");
  const soundBtn = document.getElementById("soundBtn");
  const soundIcon = document.getElementById("soundIcon");

  let grid, pieces, score = 0, best = 0, streak = 0, selected = -1, gameOver = false;
  let soundOn = false, audioCtx = null, toastTimer = null, pointerDrag = null, clearing = false;
  const cells = [];

  try { best = Number(localStorage.getItem("neonBlocksBest") || 0); } catch (_) {}
  bestEl.textContent = best.toLocaleString();

  function rand(n) { return Math.floor(Math.random() * n); }
  function pickShape() {
    const shape = SHAPES[rand(SHAPES.length)];
    const color = COLORS[rand(COLORS.length)];
    return { cells: shape.map(([r,c]) => [r,c]), color, used: false, id: Math.random().toString(36).slice(2) };
  }
  function shapeDims(shape) {
    return { rows: Math.max(...shape.map(p=>p[0])) + 1, cols: Math.max(...shape.map(p=>p[1])) + 1 };
  }
  function setBlockStyle(el, color) {
    el.style.setProperty("--block", color.main);
    el.style.setProperty("--block-light", color.light);
    el.style.setProperty("--glow", color.glow);
  }
  function buildBoard() {
    boardEl.innerHTML = "";
    cells.length = 0;
    for (let r=0; r<SIZE; r++) for (let c=0; c<SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.row = r; cell.dataset.col = c;
      cell.addEventListener("pointerenter", () => {});
      cell.addEventListener("click", () => {
        if (selected >= 0 && !gameOver) tryPlace(selected, r, c);
      });
      boardEl.appendChild(cell); cells.push(cell);
    }
    boardEl.addEventListener("pointermove", onBoardPointerMove);
    boardEl.addEventListener("pointerleave", clearPreview);
    boardEl.addEventListener("pointerup", onBoardPointerUp);
  }
  function renderBoard() {
    for (let i=0; i<cells.length; i++) {
      const el = cells[i], r = Math.floor(i/SIZE), c = i%SIZE, value = grid[r][c];
      el.className = "cell";
      el.style.removeProperty("--block"); el.style.removeProperty("--block-light"); el.style.removeProperty("--glow");
      if (value) { el.classList.add("filled"); setBlockStyle(el, value); }
    }
  }
  function renderTray() {
    trayEl.innerHTML = "";
    pieces.forEach((piece, index) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "piece-slot" + (piece.used ? " used" : "") + (selected === index ? " selected" : "");
      slot.setAttribute("aria-label", piece.used ? "Used block" : `Select block ${index+1}`);
      slot.dataset.index = index;
      const dims = shapeDims(piece.cells);
      const shapeEl = document.createElement("div");
      shapeEl.className = "piece";
      shapeEl.style.gridTemplateColumns = `repeat(${dims.cols}, auto)`;
      shapeEl.style.gridTemplateRows = `repeat(${dims.rows}, auto)`;
      const positions = new Set(piece.cells.map(([r,c]) => `${r},${c}`));
      for (let r=0;r<dims.rows;r++) for (let c=0;c<dims.cols;c++) {
        const block = document.createElement("span");
        block.className = "piece-block" + (positions.has(`${r},${c}`) ? "" : " empty");
        if (positions.has(`${r},${c}`)) setBlockStyle(block, piece.color);
        shapeEl.appendChild(block);
      }
      slot.appendChild(shapeEl);
      slot.addEventListener("pointerdown", e => startDrag(e, index, slot));
      trayEl.appendChild(slot);
    });
  }
  function canPlace(shape, row, col) {
    return shape.cells.every(([dr,dc]) => {
      const r=row+dr,c=col+dc;
      return r>=0 && r<SIZE && c>=0 && c<SIZE && !grid[r][c];
    });
  }
  function clearPreview() {
    cells.forEach(cell => cell.classList.remove("preview-valid","preview-invalid"));
  }
  function previewAt(row, col, index) {
    clearPreview();
    const piece = pieces[index];
    if (!piece || piece.used) return false;
    const valid = canPlace(piece,row,col);
    piece.cells.forEach(([dr,dc]) => {
      const r=row+dr,c=col+dc;
      if (r>=0 && r<SIZE && c>=0 && c<SIZE) {
        const cell = cells[r*SIZE+c];
        cell.classList.add(valid ? "preview-valid" : "preview-invalid");
      }
    });
    return valid;
  }
  function pointerCell(e) {
    const rect = boardEl.getBoundingClientRect();
    const styles = getComputedStyle(boardEl);
    const gap = parseFloat(styles.gap) || 0;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const stepX = (rect.width + gap) / SIZE, stepY = (rect.height + gap) / SIZE;
    return { row: Math.floor(y/stepY), col: Math.floor(x/stepX) };
  }
  function onBoardPointerMove(e) {
    if (!pointerDrag) return;
    const p = pointerCell(e);
    previewAt(p.row,p.col,pointerDrag.index);
  }
  function onBoardPointerUp(e) {
    if (!pointerDrag) return;
    const drag = pointerDrag;
    pointerDrag = null;
    const p = pointerCell(e);
    clearPreview();
    if (p.row>=0 && p.row<SIZE && p.col>=0 && p.col<SIZE) tryPlace(drag.index,p.row,p.col);
    document.body.classList.remove("dragging");
  }
  function startDrag(e, index, slot) {
    if (gameOver || pieces[index].used) return;
    e.preventDefault();
    selected = index;
    pointerDrag = { index };
    renderTray();
    document.body.classList.add("dragging");
    try { slot.setPointerCapture(e.pointerId); } catch (_) {}
    // A short drag on the tray simply selects; dropping on the grid places it.
    const onMove = ev => {
      if (!pointerDrag) return;
      const rect = boardEl.getBoundingClientRect();
      if (ev.clientX >= rect.left-4 && ev.clientX <= rect.right+4 && ev.clientY >= rect.top-4 && ev.clientY <= rect.bottom+4) {
        const p = pointerCell(ev); previewAt(p.row,p.col,index);
      } else clearPreview();
    };
    const onUp = ev => {
      if (!pointerDrag) return;
      const rect = boardEl.getBoundingClientRect();
      if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        const p = pointerCell(ev); pointerDrag = null; clearPreview(); tryPlace(index,p.row,p.col);
      } else {
        pointerDrag = null; clearPreview(); selected = index; renderTray(); statusEl.textContent = "Tap a spot on the grid";
      }
      document.body.classList.remove("dragging");
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("pointerup",onUp);
    };
    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",onUp);
  }
  function tryPlace(index,row,col) {
    if (gameOver || clearing || index < 0 || !pieces[index] || pieces[index].used) return;
    const piece = pieces[index];
    if (!canPlace(piece,row,col)) { toast("That block doesn't fit there"); tone(150,0.04); return; }
    piece.cells.forEach(([dr,dc]) => { grid[row+dr][col+dc] = piece.color; });
    piece.used = true; selected = -1;
    score += piece.cells.length;
    tone(460,0.045);
    const fullRows = [], fullCols = [];
    for (let r=0;r<SIZE;r++) if (grid[r].every(Boolean)) fullRows.push(r);
    for (let c=0;c<SIZE;c++) if (grid.every(row=>row[c])) fullCols.push(c);
    const lines = fullRows.length + fullCols.length;
    if (lines) {
      streak++;
      score += lines * 10 + Math.max(0, lines-1) * 5 + (streak > 1 ? (streak-1)*5 : 0);
      statusEl.textContent = lines > 1 ? `${lines} lines cleared!` : "Line cleared!";
      animateClear(fullRows,fullCols, () => {
        fullRows.forEach(r => { for (let c=0;c<SIZE;c++) grid[r][c] = null; });
        fullCols.forEach(c => { for (let r=0;r<SIZE;r++) grid[r][c] = null; });
        renderBoard(); finishMove();
      });
    } else {
      streak = 0;
      renderBoard(); finishMove();
    }
    updateScore();
    renderTray();
  }
  function animateClear(rows,cols,done) {
    clearing = true;
    const toClear = new Set();
    rows.forEach(r=>{for(let c=0;c<SIZE;c++)toClear.add(r*SIZE+c)});
    cols.forEach(c=>{for(let r=0;r<SIZE;r++)toClear.add(r*SIZE+c)});
    toClear.forEach(i=>cells[i].classList.add("clearing"));
    tone(700,0.07);
    setTimeout(()=>{ clearing=false; done(); },260);
  }
  function finishMove() {
    updateScore(); renderTray();
    if (pieces.every(p=>p.used)) {
      pieces = [pickShape(),pickShape(),pickShape()];
      renderTray();
    }
    updateStreak();
    if (!anyMovePossible()) endGame();
    else if (streak > 1) toast(`Combo streak ×${streak}!`);
    else statusEl.textContent = "Nice move — keep going";
  }
  function anyMovePossible() {
    return pieces.some(piece => !piece.used && piece.cells.some(([dr,dc]) => {
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(canPlace(piece,r,c)) return true;
      return false;
    }));
  }
  function updateScore() {
    scoreEl.textContent = score.toLocaleString();
    if (score > best) {
      best = score; bestEl.textContent = best.toLocaleString();
      try { localStorage.setItem("neonBlocksBest", String(best)); } catch (_) {}
    }
  }
  function updateStreak() { streakEl.textContent = `×${Math.max(1,streak)}`; }
  function toast(message) {
    toastEl.textContent = message; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>toastEl.classList.remove("show"),1500);
  }
  function tone(freq,duration) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
      osc.type="sine"; osc.frequency.value=freq; gain.gain.setValueAtTime(.055,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
      osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);
    } catch (_) {}
  }
  function newGame() {
    grid = Array.from({length:SIZE},()=>Array(SIZE).fill(null));
    score=0; streak=0; selected=-1; gameOver=false; clearing=false; pointerDrag=null;
    pieces=[pickShape(),pickShape(),pickShape()];
    gameOverModal.classList.add("hidden"); howModal.classList.add("hidden");
    statusEl.textContent="Place your blocks";
    renderBoard(); renderTray(); updateScore(); updateStreak(); clearPreview();
  }
  function endGame() {
    gameOver=true; selected=-1;
    document.getElementById("finalScore").textContent=score.toLocaleString();
    gameOverModal.classList.remove("hidden");
    tone(180,.18);
  }

  document.getElementById("newGameBtn").addEventListener("click",()=> {
    if (score > 0 && !gameOver && !confirm("Start a new game? Your current score will be lost.")) return;
    newGame();
  });
  document.getElementById("playAgainBtn").addEventListener("click",newGame);
  document.getElementById("howBtn").addEventListener("click",()=>howModal.classList.remove("hidden"));
  document.getElementById("closeHowBtn").addEventListener("click",()=>howModal.classList.add("hidden"));
  document.getElementById("gotItBtn").addEventListener("click",()=>howModal.classList.add("hidden"));
  soundBtn.addEventListener("click",()=>{
    soundOn=!soundOn;
    soundBtn.classList.toggle("muted",!soundOn);
    soundIcon.innerHTML=soundOn
      ? '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8.5 8.5 0 0 1 0 11"/>'
      : '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m17 9 5 6m0-6-5 6"/>';
    if(soundOn) tone(520,.05);
  });
  buildBoard();
  newGame();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
  }
})();