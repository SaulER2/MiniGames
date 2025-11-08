const input = document.getElementById('puzzleImage');
const preview = document.getElementById('preview');
const startButton = document.getElementById('startGameButton');
const resetButton = document.getElementById('resetGameButton');
const columns = document.getElementById('columns');
const rows = document.getElementById('rows');
const board = document.getElementById('puzzleContainer');
const wrapper = document.getElementById('puzzleWrapper');
const timer = document.getElementById('timer');

let pieces = [];
let img = new Image();
let imageLoaded = false;
let cols = parseInt(columns.value, 10) || 3;
let rowsCount = parseInt(rows.value, 10) || 3;

//Load and preview
function uploadImage() {
    const file = input.files && input.files[0];
    if (!file) {
        alert("Please, select an image file.");
        return;
    }

    // Read the image file
    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = 'block';

        img = new Image();
        img.onload = () => {
        imageLoaded = true;
            createPieces();
        };
        img.onerror = () => {
            alert("Error loading image to create pieces.");
            imageLoaded = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Create the puzzle pieces
function createPieces() {
    if (!imageLoaded) {
        return;
    }

    wrapper.innerHTML = ''; // Clear previous pieces
    pieces = [];

    // Calculate dimensions and create pieces
    cols = clamp(parseInt(columns.value, 10) || 3, 2, 10);
    rowsCount = clamp(parseInt(rows.value, 10) || 3, 2, 10);

    // Adjust the image to the container while maintaining aspect ratio
    const rect = wrapper.getBoundingClientRect();
    const maxW = rect.width || 640;
    const maxH = rect.height || 480;

    // Calculate scaled dimensions
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const drawW = Math.round(img.width * scale); 
    const drawH = Math.round(img.height * scale);

    // Container dimensions
    const containerW = Math.max(1, drawW);
    const containerH = Math.max(1, drawH);
    
    // Offsets to center the image
    const offsetX = 0;
    const offsetY = 0;

    // Piece dimensions
    const pieceW = Math.ceil(containerW / cols);
    const pieceH = Math.ceil(containerH / rowsCount);

    // Set wrapper size
    wrapper.style.width = containerW + 'px';
    wrapper.style.height = containerH + 'px';

    // Create pieces
    for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < cols; c++) {
            // Create canvas for each piece
            const canvas = document.createElement('canvas');
            canvas.width = pieceW; 
            canvas.height = pieceH; 
            const left = c * pieceW;
            const top = r * pieceH;
            canvas.style.left = left + 'px';
            canvas.style.top = top + 'px';
            
            // Draw the piece image
            const ctx = canvas.getContext('2d');

            // Calculate source position and size on the original image
            const scaleX = img.width / drawW;
            const scaleY = img.height / drawH;

            // Source coordinates on the original image
            let srcX = (left + -offsetX) * scaleX;
            let srcY = (top + -offsetY) * scaleY;
            let srcW = pieceW * scaleX;
            let srcH = pieceH * scaleY;

            // Adjust source dimensions if they exceed image boundaries
            if (srcX < 0) { srcW += srcX; srcX = 0; }
            if (srcY < 0) { srcH += srcY; srcY = 0; }
            if (srcX + srcW > img.width) srcW = img.width - srcX;
            if (srcY + srcH > img.height) srcH = img.height - srcY;

            // Draw the image piece onto the canvas
            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, pieceW, pieceH);

            // Add piece to wrapper
            wrapper.appendChild(canvas);

            // Store piece data
            pieces.push({
                el: canvas,
                origLeft: left,
                origTop: top,
                w: pieceW,
                h: pieceH,
                isPlaced: false
            });
        }   
    }
    initDragAndDrop(); // Initialize drag and drop functionality
}

// Start the game
function startGame() {
    if (!imageLoaded || pieces.length === 0) {
        alert("Please load an image and wait for it to be ready before starting.");
        return;
    }

    // Mark game as started
    wrapper.classList.add('started');

    // Scatter pieces randomly
    setTimeout(() => {
        const rect = board.getBoundingClientRect();
        const boardW = rect.width;
        const boardH = rect.height;
        const margin = Math.min(boardW, boardH) * 0.6;

        pieces.forEach(p => {
            // Calculate random position
            const randX = (Math.random() - 0.5) * (boardW + margin);
            const randY = (Math.random() - 0.5) * (boardH + margin);
            const centerLeft = (boardW - p.w) / 2;
            const centerTop = (boardH - p.h) / 2;
            const newLeft = Math.round(centerLeft + randX);
            const newTop = Math.round(centerTop + randY);

            // Apply new position
            p.el.style.left = newLeft + 'px';
            p.el.style.top = newTop + 'px';

            // Apply random rotation
            const rot = (Math.random() - 0.5) * 60;
            p.el.style.transform = `rotate(${rot}deg)`;

            p.isPlaced = false; // Mark as not placed
            p.el.style.pointerEvents = 'auto'; // Enable interaction
        });

        if (isChallenge && challengeDuration > 0) {
            startTimer(challengeDuration);
        }
        if (isNormal) {
            formatElapsed();
        }
    }, 200); // Delay to ensure styles are applied
}

// Reset the game
function resetGame() {
    stopAllTimers();
    if (!imageLoaded || pieces.length === 0) return;
    
    // Mark game as not started
    wrapper.classList.remove('started');

    // Reset pieces to original positions
    pieces.forEach(p => {
        p.el.style.left = p.origLeft + 'px';
        p.el.style.top = p.origTop + 'px';
        p.el.style.transform = 'rotate(0deg)';
        p.isPlaced = false;
    });
}
// Timer variables
let timerIntervalId = null;
let timerTimeoutId = null;
let timerEnd = 0;
let rem = 0;
let isChallenge = false;
let challengeDuration = 0;
const timeLimitId = 'timeLimit';

let elapsedIntervalId = null;
let elapsedStart = 0;
const elapsedDisplayId = 'elapsedTime';
let isNormal = false;

// Format ms to "MM:SS"
function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// Action to execute when the timer ends
function onTimerEnd() {
  // Stop any timers (for safety)
  stopTimer();

  // Mark game as ended / deactivate ongoing game
  wrapper.classList.remove('started');
  timer.style.display = 'none';

  // Disable pieces interaction
  pieces.forEach(p => {
    p.el.style.pointerEvents = 'none';
  });

  // Warn the user
  setTimeout(() => {
    alert('Time is up! Try again.');
  }, 50);
}

// Start a countdown timer for the specified duration in ms
function startTimer(durationMs) {
  // clear any existing timer
  stopTimer();

  if (!timer) return;

  // Create or update the time display element
  let el = document.getElementById(timeLimitId);
  if (!el) {
    timer.style.display = 'block';
    el = document.createElement('div');
    el.id = timeLimitId;
    timer.appendChild(el);
  }

  // configurar final y mostrar inmediatamente
  timerEnd = Date.now() + durationMs;
  el.textContent = `Tiempo: ${formatTime(durationMs)}`;

  // Update every 250ms for smoother display
  timerIntervalId = setInterval(() => {
    const rem = timerEnd - Date.now();
    if (rem <= 0) {
      el.textContent = `Time: 00:00`;
      // onTimerEnd will be executed from the timeout as well; here for safety
      // we don't call onTimerEnd() twice, we just let the timeout do it.
    } else {
      el.textContent = `Time: ${formatTime(rem)}`;
    }
  }, 250);

  // Final timeout that executes the action when finishing
  timerTimeoutId = setTimeout(() => {
    onTimerEnd();
  }, durationMs);
}

// Stop and clear any active timer and hide the UI
function stopTimer() {
  // Clear interval
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  // Clear timeout
  if (timerTimeoutId) {
    clearTimeout(timerTimeoutId);
    timerTimeoutId = null;
    wrapper.classList.remove('started');
  }
  // Reset end time
  timerEnd = 0;
    // Remove time display element
  const el = document.getElementById(timeLimitId);
  if (el && timer.contains(el)) {
    timer.style.display = 'none';
    timer.removeChild(el);
  }
}

// Format and show elapsed time in normal mode
function formatElapsed() {
    stopElapsedTimer();
    if (!timer) return;
    // Remove countdown if present
    const countDownEl = document.getElementById(timeLimitId);
    if (countDownEl && timer.contains(countDownEl)) timer.removeChild(countDownEl);
    // Create or update the elapsed time display element
    let el = document.getElementById(elapsedDisplayId);
    if (!el) {
        timer.style.display = 'block';
        el = document.createElement('div');
        el.id = elapsedDisplayId;
        timer.appendChild(el);
    }

    // Start tracking elapsed time
    elapsedStart = Date.now();
    el.textContent = `Time: 00:00`;

    // Update every 250ms
    elapsedIntervalId = setInterval(() => {
        const elapsed = Date.now() - elapsedStart;
        el.textContent = `Time: ${formatTime(elapsed)}`;
    },250);
}

// Stop and clear elapsed timer
function stopElapsedTimer() {
    // Clear start time
    elapsedStart = 0;
    if (elapsedIntervalId) {
        clearInterval(elapsedIntervalId);
        elapsedIntervalId = null;
    }
    // Remove elapsed time display element
    const el = document.getElementById(elapsedDisplayId);
    if (el && timer.contains(el)){
        timer.style.display = 'none';
        timer.removeChild(el)
    };
}

// Stop all timers
function stopAllTimers() {
    stopTimer();
    stopElapsedTimer();
}

// Challenge mode: set duration based on pieces and show message
function challengeTimer() {
    stopAllTimers();
    timer.style.display = 'block';
    // Determine challenge duration based on number of pieces
    if ((cols * rowsCount) <= 9) challengeDuration = 1 * 60 * 1000; // 1 min
    if (9 < (cols * rowsCount) && (cols * rowsCount) <= 25) challengeDuration = 3 * 60 * 1000; // 3 min
    if (25 < (cols * rowsCount) && (cols * rowsCount) <= 49) challengeDuration = 5 * 60 * 1000; // 5 min
    if (49 < (cols * rowsCount) && (cols * rowsCount) <= 81) challengeDuration = 10 * 60 * 1000; // 10 min
    if ((cols * rowsCount) > 81) challengeDuration = 15 * 60 * 1000; // 15 min

    // Set mode flags
    isChallenge = true;
    isNormal = false;

    // Create or update the time limit display element
    let el = document.getElementById(timeLimitId);
    if (!el) {
        el = document.createElement("div");
        el.id = timeLimitId;
        timer.appendChild(el);
    }
    el.textContent = `Challenge mode ready: ${formatTime(challengeDuration)} - Start the game to begin!`;   
}

// Update challenge duration based on current pieces
function updateChallengeDuration() {
    stopAllTimers();
    if ((cols * rowsCount) <= 9) challengeDuration = 1 * 60 * 1000;
    if (9 < (cols * rowsCount) && (cols * rowsCount) <= 25) challengeDuration = 3 * 60 * 1000;
    if (25 < (cols * rowsCount) && (cols * rowsCount) <= 49) challengeDuration = 5 * 60 * 1000;
    if (49 < (cols * rowsCount) && (cols * rowsCount) <= 81) challengeDuration = 10 * 60 * 1000;
    if ((cols * rowsCount) > 81) challengeDuration = 15 * 60 * 1000;

    // Update display if in challenge mode
    if (isChallenge) {
        let el = document.getElementById(timeLimitId);
        if (!el) {
            el = document.createElement("div");
            el.id = timeLimitId;
            timer.appendChild(el);
        }
        el.textContent = `Challenge mode ready: ${formatTime(challengeDuration)} - Start the game to begin!`;
    }
}

// Normal mode: stop any timers and show message
function normalTimer() {
    stopAllTimers();
    timer.style.display = 'block';
    isNormal = true;
    isChallenge = false;

    let el = document.getElementById(elapsedDisplayId);
    if (!el) {
        el = document.createElement("div");
        el.id = elapsedDisplayId;
        timer.appendChild(el);
    }
    el.textContent = `Normal mode ready - Start the game to begin!`;
}
// limit the value in a range
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }


// Initialize drag and drop
function initDragAndDrop() {
    let draggingPiece = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    const snapThreshold = 30;

    // Get the pointer position
    function getPointerPos(e) {
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches[0]) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        else {
            return { x: e.clientX, y: e.clientY };
        }
    }

    // Handle pointer down
    function onPointerDown(e) {
        // Check if game has started
        if(!wrapper.classList.contains('started')) return; // Prevent dragging if game not started
        if (e.type === 'mousedown' && e.button === 0) {
            e.preventDefault();

            // Identify the piece being dragged
            const el = e.currentTarget;
            const p = pieces.find(piece => piece.el === el);
            if (!p) return; // Piece not found
            // Initialize dragging state
            draggingPiece = p;
            el.classList.add('dragging');
            const pointerPos = getPointerPos(e);
            startPointerX = pointerPos.x;
            startPointerY = pointerPos.y;
            startLeft = parseInt(el.style.left, 10) || 0;
            startTop = parseInt(el.style.top, 10) || 0;
            // Attach event listeners for move and up
            document.addEventListener('mousemove', onPointerMove);
            document.addEventListener('mouseup', onPointerUp);
            document.addEventListener('touchmove', onPointerMove, { passive: false });
            document.addEventListener('touchend', onPointerUp);
            document.addEventListener('touchcancel', onPointerUp);
            document.querySelector("#puzzleWrapper").removeChild(el);
            document.querySelector("#puzzleWrapper").appendChild(el);
        }
    }

    // Manage pointer movement
    function onPointerMove(e) {
        if (!draggingPiece) return;
        e.preventDefault();
        const pointerPos = getPointerPos(e);
        // Calculate new position
        const deltaX = pointerPos.x - startPointerX;
        const deltaY = pointerPos.y - startPointerY;

        // Update piece position
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        draggingPiece.el.style.left = newLeft + 'px';
        draggingPiece.el.style.top = newTop + 'px';
        draggingPiece.el.style.transition = 'none';
    }

    // Manage pointer release
    function onPointerUp(e) {
        if (!draggingPiece) return;
        e.preventDefault();

        const el = draggingPiece.el;
        const currentLeft = parseInt(el.style.left, 10) || 0;
        const currentTop = parseInt(el.style.top, 10) || 0;

        // Check if piece is close enough to snap into place
        const distX = Math.abs(currentLeft - draggingPiece.origLeft);
        const distY = Math.abs(currentTop - draggingPiece.origTop);
        const dist = Math.hypot(distX, distY);

        // Snap into place if within threshold
        if (dist <= snapThreshold) {
            el.style.left = draggingPiece.origLeft + 'px';
            el.style.top = draggingPiece.origTop + 'px';
            el.style.transform = 'rotate(0deg)';
            draggingPiece.isPlaced = true;
        }
        // Restore z-index if placed
        if (draggingPiece.isPlaced) {
            el.style.zIndex = '1';
            el.style.pointerEvents = 'none'; // Disable further interaction
        }

        // Clean up
        el.classList.remove('dragging');
        el.style.zIndex = '';
        el.style.transition = '';

        // Remove event listeners
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        window.removeEventListener('touchcancel', onPointerUp);

        // Check for win condition
        checkWinCondition();

        // Reset dragging state
        draggingPiece = null;
    }

    // Attach event listeners to each piece
    pieces.forEach(p => {
        if (p.mousedownHandler) p.el.removeEventListener('mousedown', p.mousedownHandler);
        if (p.touchstartHandler) p.el.removeEventListener('touchstart', p.touchstartHandler);
        p.mousedownHandler = onPointerDown.bind(p.el);
        p.touchstartHandler = onPointerDown.bind(p.el);

        p.el.addEventListener('mousedown', p.mousedownHandler);
        p.el.addEventListener('touchstart', p.touchstartHandler, { passive: false });
    });
}

// Check for win condition
function checkWinCondition() {
    const allPlaced = pieces.every(piece => piece.isPlaced); /// Verify if all pieces are correctly placed
    // If all pieces are placed, show a congratulatory message
    if (allPlaced) {
        setTimeout(() => {
            if(isNormal) alert('Congratulation! You completed the puzzle in this time: '+ formatTime(Date.now() - elapsedStart) + '!');
            else if(isChallenge) alert('Congratulation! You completed the puzzle with the following time remaining: ' + formatTime(Math.max(0, timerEnd - Date.now())) + '!');
            else alert("Congratulation! You completed the puzzle" + /*(isNormal ? ("in this time: " + formatTime(Date.now() - elapsedStart)) : ("with the following time remaining: " + formatTime(Math.max(0, timerEnd - Date.now())))*/ "!");
            wrapper.classList.remove('started');
            stopAllTimers();
            isChallenge = false;
            isNormal = false;
        }, 400);
    }
}

// Event listeners
columns.addEventListener('change', () => { if (imageLoaded) createPieces(); updateChallengeDuration(); });
rows.addEventListener('change', () => { if (imageLoaded) createPieces(); updateChallengeDuration(); });