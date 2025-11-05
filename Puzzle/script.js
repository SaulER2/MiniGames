const input = document.getElementById('puzzleImage');
const preview = document.getElementById('preview');
const startButton = document.getElementById('startGameButton');
const resetButton = document.getElementById('resetGameButton');
const columns = document.getElementById('columns');
const rows = document.getElementById('rows');
const board = document.getElementById('puzzleContainer');
const wrapper = document.getElementById('puzzleWrapper');

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
    }, 200); // Delay to ensure styles are applied
}

// Reset the game
function resetGame() {
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
            alert("¡Felicidades! Has completado el puzzle.");
            wrapper.classList.remove('started');
        }, 400);
    }
}

// Event listeners
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
columns.addEventListener('change', () => { if (imageLoaded) createPieces(); });
rows.addEventListener('change', () => { if (imageLoaded) createPieces(); });