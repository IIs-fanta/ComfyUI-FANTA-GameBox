import { app } from "/scripts/app.js";

app.registerExtension({
    name: "Comfy.SnakeGameWidget",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SnakeGameNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                console.log("SnakeGameNode created in UI. Adding widget.");

                const gameContainer = document.createElement("div");
                gameContainer.id = `snake-game-container-${this.id}`;
                gameContainer.style.width = "100%";
                gameContainer.style.border = "1px solid #555";
                gameContainer.style.display = "flex";
                gameContainer.style.flexDirection = "column";
                gameContainer.style.alignItems = "center";
                gameContainer.innerHTML = `
                    <div style="width: 100%; max-width: 420px;">
                        <canvas id="snakeCanvas-${this.id}" style="width: 100%; aspect-ratio: 14/9; background-color: #222; display: block; margin: 5px auto; max-width: 420px;"></canvas>
                    </div>
                    <div id="score-${this.id}" style="color: white; text-align: center; font-size: 12px;">Score: 0</div>
                    <div style="text-align: center; margin-top: 10px;">
                        <button id="up-${this.id}" style="width: 40px; height: 40px; margin: 2px;">↑</button><br>
                        <button id="left-${this.id}" style="width: 40px; height: 40px; margin: 2px;">←</button>
                        <button id="down-${this.id}" style="width: 40px; height: 40px; margin: 2px;">↓</button>
                        <button id="right-${this.id}" style="width: 40px; height: 40px; margin: 2px;">→</button>
                    </div>`;

                const self = this;

                const gameWidget = this.addDOMWidget("snake_game_area", "CANVAS_SLOT", gameContainer, {
                    getValue: () => {},
                    setValue: (v) => {},
                });
                gameWidget.serialize = false;

                const canvas = gameContainer.querySelector(`#snakeCanvas-${this.id}`);
                const scoreDisplay = gameContainer.querySelector(`#score-${this.id}`);
                const ctx = canvas.getContext("2d");

                const upBtn = gameContainer.querySelector(`#up-${this.id}`);
                const downBtn = gameContainer.querySelector(`#down-${this.id}`);
                const leftBtn = gameContainer.querySelector(`#left-${this.id}`);
                const rightBtn = gameContainer.querySelector(`#right-${this.id}`);

                upBtn.onclick = () => { if (velocity.y === 0) velocity = { x: 0, y: -1 }; };
                downBtn.onclick = () => { if (velocity.y === 0) velocity = { x: 0, y: 1 }; };
                leftBtn.onclick = () => { if (velocity.x === 0) velocity = { x: -1, y: 0 }; };
                rightBtn.onclick = () => { if (velocity.x === 0) velocity = { x: 1, y: 0 }; };

                const gridSize = 10;
                const tileCountX = canvas.width / gridSize;
                const tileCountY = canvas.height / gridSize;

                let snake = [{ x: 10, y: 10 }];
                let food = { x: 15, y: 15 };
                let velocity = { x: 0, y: 0 };
                let score = 0;
                let gameInterval = null;
                let gameSpeed = 150;

                function resetGame() {
                    snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
                    placeFood();
                    velocity = { x: 0, y: 0 };
                    score = 0;
                    updateScoreDisplay();
                    if (gameInterval) clearInterval(gameInterval);
                    gameInterval = setInterval(gameLoop, gameSpeed);
                    console.log("Snake game reset and started for node " + self.id);
                }

                function placeFood() {
                    food.x = Math.floor(Math.random() * tileCountX);
                    food.y = Math.floor(Math.random() * tileCountY);
                    for (let part of snake) {
                        if (part.x === food.x && part.y === food.y) {
                            placeFood();
                            break;
                        }
                    }
                }

                function updateScoreDisplay() {
                    scoreDisplay.textContent = "Score: " + score;
                }

                function gameLoop() {
                    if (velocity.x === 0 && velocity.y === 0 && snake.length === 1) {
                        drawGame();
                        return;
                    }

                    let headX = snake[0].x + velocity.x;
                    let headY = snake[0].y + velocity.y;

                    if (headX < 0 || headX >= tileCountX || headY < 0 || headY >= tileCountY) {
                        console.log("Wall collision - Game Over for node " + self.id);
                        resetGame();
                        return;
                    }

                    for (let i = 1; i < snake.length; i++) {
                        if (headX === snake[i].x && headY === snake[i].y) {
                            console.log("Self collision - Game Over for node " + self.id);
                            resetGame();
                            return;
                        }
                    }

                    const newHead = { x: headX, y: headY };
                    snake.unshift(newHead);

                    if (headX === food.x && headY === food.y) {
                        score++;
                        updateScoreDisplay();
                        placeFood();
                        if (score % 5 === 0 && gameSpeed > 50) {
                            gameSpeed -= 10;
                            clearInterval(gameInterval);
                            gameInterval = setInterval(gameLoop, gameSpeed);
                        }
                    } else {
                        snake.pop();
                    }
                    drawGame();
                }

                function drawGame() {
                    ctx.fillStyle = "#222";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.fillStyle = "red";
                    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1);

                    ctx.fillStyle = "lime";
                    snake.forEach(part => {
                        ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 1, gridSize - 1);
                    });
                }

                const handleKeyDown = (e) => {
                    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    switch (e.key) {
                        case "ArrowUp":
                            if (velocity.y === 0) { velocity = { x: 0, y: -1 }; }
                            break;
                        case "ArrowDown":
                            if (velocity.y === 0) { velocity = { x: 0, y: 1 }; }
                            break;
                        case "ArrowLeft":
                            if (velocity.x === 0) { velocity = { x: -1, y: 0 }; }
                            break;
                        case "ArrowRight":
                            if (velocity.x === 0) { velocity = { x: 1, y: 0 }; }
                            break;
                        case " ":
                            console.log("Space pressed, resetting game for node " + self.id);
                            resetGame();
                            break;
                    }
                };

                document.addEventListener("keydown", handleKeyDown);

                const onRemoved = this.onRemoved;
                this.onRemoved = () => {
                    console.log("SnakeGameNode removed, cleaning up for node " + self.id);
                    clearInterval(gameInterval);
                    document.removeEventListener("keydown", handleKeyDown);
                    if (gameContainer && gameContainer.parentElement) {
                        gameContainer.parentElement.removeChild(gameContainer);
                    }
                    return onRemoved?.apply(this, arguments);
                };

                placeFood();
                drawGame();

                const restartButton = document.createElement("button");
                restartButton.textContent = "Start/Restart Game";
                restartButton.style.display = "block";
                restartButton.style.margin = "5px auto";
                restartButton.onclick = () => {
                    console.log("Restart button clicked for node " + self.id);
                    resetGame();
                    canvas.focus();
                };
                gameContainer.appendChild(restartButton);

                console.log("Snake game initialized for node " + self.id);
            };
        }
    },
});

console.log("🐍 Snake Game Widget JS loaded"); 