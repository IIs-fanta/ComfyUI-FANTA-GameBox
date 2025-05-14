import { app } from "../../../scripts/app.js";

console.log("FlappyBird_widget.js loading...");

app.registerExtension({
    name: "Comfy.FlappyBirdWidget",
    async beforeRegisterNodeDef(nodeType, nodeData, appInstance) {
        if (nodeData.name === "FlappyBirdNode") {
            console.log("FlappyBirdNode definition found by JS:", nodeData.name);

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                console.log("FlappyBirdNode instance created in UI (node ID: " + this.id + "). Adding game widget.");
                const self = this;

                const gameContainer = document.createElement("div");
                gameContainer.id = `flappy-bird-container-${this.id}`;
                gameContainer.style.width = "100%";
                gameContainer.style.border = "1px solid #444";
                gameContainer.style.display = "flex";
                gameContainer.style.flexDirection = "column";
                gameContainer.style.alignItems = "center";
                gameContainer.innerHTML = `
                    <div style="width: 100%; max-width: 420px;">
                        <canvas id="flappyCanvas-${this.id}" style="width: 100%; aspect-ratio: 15/11; background-color: #70c5ce; display: block; margin: 5px auto; max-width: 420px;"></canvas>
                    </div>
                    <div id="flappy-score-${this.id}" style="color: white; text-align: center; font-size: 14px; font-weight: bold; -webkit-text-stroke: 1px black; text-stroke: 1px black;">分数: 0</div>
                    <button id="restart-${this.id}" style="display: block; margin: 5px auto; padding: 5px 10px;">开始游戏</button>`;

                try {
                    const domWidget = this.addDOMWidget("flappy_bird_game_area", "FLAPPY_DOM", gameContainer, {});
                    domWidget.serialize = false;
                    console.log("Flappy Bird DOM widget added to node " + this.id);
                } catch (e) {
                    console.error("Error adding Flappy Bird DOM widget to node " + this.id + ":", e);
                    return;
                }
                this.setSize(this.computeSize());

                // --- Flappy Bird Game Logic ---
                const canvas = gameContainer.querySelector(`#flappyCanvas-${this.id}`);
                const scoreDisplay = gameContainer.querySelector(`#flappy-score-${this.id}`);
                const restartButton = gameContainer.querySelector(`#restart-${this.id}`);
                const ctx = canvas.getContext("2d");

                // 设置画布的实际尺寸
                function resizeCanvas() {
                    const containerWidth = canvas.parentElement.clientWidth;
                    canvas.width = containerWidth;
                    canvas.height = containerWidth * (11/15);
                }

                // 初始调整大小
                resizeCanvas();

                // 监听窗口大小变化
                const resizeObserver = new ResizeObserver(() => {
                    resizeCanvas();
                    draw(); // 重绘画布
                });
                resizeObserver.observe(canvas.parentElement);

                let bird, pipes, score, gameState, animationFrameId;
                const birdProps = {
                    x: 50,
                    y: canvas.height / 2,
                    width: 20,
                    height: 20,
                    gravity: 0.08,
                    lift: -2,
                    velocityY: 0
                };

                const pipeProps = {
                    width: 40,
                    gap: 100,
                    speed: 1,
                    interval: 150
                };
                let frames = 0;

                function initGameObjects() {
                    bird = { ...birdProps, y: canvas.height / 2, velocityY: 0 };
                    pipes = [];
                    score = 0;
                    frames = 0;
                    gameState = "start";
                    updateScoreDisplay();
                }
                
                function updateScoreDisplay() {
                    scoreDisplay.textContent = "分数: " + score;
                }

                function gameLoop() {
                    if (gameState === "over" && animationFrameId) {
                        drawGameOver();
                    }
                    if (gameState !== "playing" && gameState !== "over") {
                         drawStartScreen();
                         animationFrameId = requestAnimationFrame(gameLoop);
                         return;
                    }

                    if (gameState === "playing") {
                        bird.velocityY += bird.gravity;
                        bird.y += bird.velocityY;

                        frames++;
                        if (frames % pipeProps.interval === 0) {
                            const topPipeHeight = Math.random() * (canvas.height - pipeProps.gap - 60) + 30;
                            pipes.push({
                                x: canvas.width,
                                y: 0,
                                width: pipeProps.width,
                                height: topPipeHeight,
                                type: "top"
                            });
                            pipes.push({
                                x: canvas.width,
                                y: topPipeHeight + pipeProps.gap,
                                width: pipeProps.width,
                                height: canvas.height - topPipeHeight - pipeProps.gap,
                                type: "bottom",
                                scored: false
                            });
                        }

                        pipes.forEach(pipe => pipe.x -= pipeProps.speed);
                        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

                        if (bird.y + bird.height > canvas.height || bird.y < 0) {
                            setGameOver();
                        }
                        pipes.forEach(pipe => {
                            if (bird.x < pipe.x + pipe.width &&
                                bird.x + bird.width > pipe.x &&
                                bird.y < pipe.y + pipe.height &&
                                bird.y + bird.height > pipe.y) {
                                setGameOver();
                            }
                            if (pipe.type === "bottom" && !pipe.scored && pipe.x + pipe.width < bird.x) {
                                pipe.scored = true;
                                score++;
                                updateScoreDisplay();
                            }
                        });
                    }

                    draw();
                    
                    if (gameState !== "over" || (gameState === "over" && !animationFrameId)) {
                        animationFrameId = requestAnimationFrame(gameLoop);
                    }
                }

                function draw() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    ctx.fillStyle = "yellow";
                    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
                    ctx.strokeStyle = "black";
                    ctx.strokeRect(bird.x, bird.y, bird.width, bird.height);

                    ctx.fillStyle = "green";
                    ctx.strokeStyle = "darkgreen";
                    pipes.forEach(pipe => {
                        ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
                        ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
                    });
                    
                    if (gameState === "over") {
                        drawGameOver();
                    }
                }

                function drawStartScreen() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = "white";
                    ctx.font = "18px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("点击按钮或按回车键开始", canvas.width / 2, canvas.height / 2 - 20);
                    ctx.fillText("按空格键飞行！", canvas.width / 2, canvas.height / 2 + 10);
                }
                
                function drawGameOver() {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = "white";
                    ctx.font = "24px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("游戏结束！", canvas.width / 2, canvas.height / 2 - 20);
                    ctx.font = "16px Arial";
                    ctx.fillText("最终分数: " + score, canvas.width / 2, canvas.height / 2 + 10);
                    ctx.fillText("点击重新开始或按回车键", canvas.width / 2, canvas.height / 2 + 40);
                }

                function flap() {
                    if (gameState === "playing") {
                        bird.velocityY = birdProps.lift;
                    }
                }
                
                function setGameOver() {
                    if (gameState !== "over") {
                        console.log("Flappy Bird Game Over on node " + self.id + ". Score: " + score);
                        gameState = "over";
                        restartButton.textContent = "重新开始";
                    }
                }

                function startGame() {
                    console.log("Starting Flappy Bird game on node " + self.id);
                    initGameObjects();
                    gameState = "playing";
                    restartButton.textContent = "游戏中...";
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    gameLoop();
                }
                
                const handleInput = () => {
                    if(document.activeElement !== document.body && document.activeElement !== canvas && document.activeElement !== gameContainer && !gameContainer.contains(document.activeElement)) {
                        return;
                    }
                    if (gameState === "playing") {
                        flap();
                    }
                };

                const handleKeyDown = (e) => {
                    if (e.key === " " || e.code === "Space") {
                        if (!self.is_selected && !self.graph.list_of_graphcanvas.some(c => c.selected_nodes[self.id])) {
                            return;
                        }
                        e.preventDefault();
                        handleInput();
                    } else if (e.key === "Enter" || e.code === "Enter") {
                        if (!self.is_selected && !self.graph.list_of_graphcanvas.some(c => c.selected_nodes[self.id])) {
                            return;
                        }
                        e.preventDefault();
                        startGame();
                    }
                };
                
                canvas.addEventListener("pointerdown", handleInput);
                document.addEventListener("keydown", handleKeyDown);
                restartButton.addEventListener("click", startGame);

                const onRemovedOriginal = this.onRemoved;
                this.onRemoved = () => {
                    console.log("FlappyBirdNode removed (node ID: " + self.id + "), cleaning up game.");
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    document.removeEventListener("keydown", handleKeyDown);
                    canvas.removeEventListener("pointerdown", handleInput);
                    if (onRemovedOriginal) {
                        onRemovedOriginal.apply(this, arguments);
                    }
                };
                
                initGameObjects();
                drawStartScreen();

                console.log("Flappy Bird game initialized for node " + self.id);
            };
        }
    },
    init() {
        console.log("Comfy.FlappyBirdWidget extension initialized.");
    }
});

console.log("FlappyBird_widget.js fully parsed."); 
console.log("FlappyBird_widget.js fully parsed."); 