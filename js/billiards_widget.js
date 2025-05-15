import { app } from "/scripts/app.js";
import { AIPlayer } from "./ai_opponent.js";
import { SoundManager } from "./sound_effects.js";

app.registerExtension({
    name: "Comfy.BilliardsGameWidget",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "BilliardsGameNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                console.log("BilliardsGameNode created in UI. Adding widget.");

                const gameContainer = document.createElement("div");
                gameContainer.id = `billiards-game-container-${this.id}`;
                gameContainer.style.width = "100%";
                gameContainer.style.border = "1px solid #555";
                gameContainer.style.display = "flex";
                gameContainer.style.flexDirection = "column";
                gameContainer.style.alignItems = "center";
                gameContainer.innerHTML = `
                    <div style="width: 100%; max-width: 800px;">
                        <canvas id="billiardsCanvas-${this.id}" style="width: 100%; aspect-ratio: 2/1; background-color: #222; display: block; margin: 5px auto;"></canvas>
                    </div>
                    <div id="game-state-${this.id}" style="color: white; text-align: center; font-size: 12px; margin: 5px 0;">游戏状态: 准备中</div>
                    <div id="score-${this.id}" style="color: white; text-align: center; font-size: 12px; margin: 5px 0;">分数: 0</div>
                    <div id="shots-${this.id}" style="color: white; text-align: center; font-size: 12px; margin: 5px 0;">击球次数: 0</div>
                    <div id="game-over-${this.id}" style="display: none; color: white; text-align: center; font-size: 16px; margin: 10px 0; padding: 10px; background-color: rgba(0, 0, 0, 0.5); border-radius: 5px;">游戏结束</div>
                    <div style="text-align: center; margin-top: 10px;">
                        <button id="start-${this.id}" style="margin: 2px;">开始游戏</button>
                        <button id="reset-${this.id}" style="margin: 2px;">重置游戏</button>
                    </div>`;

                const self = this;

                const gameWidget = this.addDOMWidget("billiards_game_area", "CANVAS_SLOT", gameContainer, {
                    getValue: () => {},
                    setValue: (v) => {},
                });
                gameWidget.serialize = false;

                const canvas = gameContainer.querySelector(`#billiardsCanvas-${this.id}`);
                const gameStateDisplay = gameContainer.querySelector(`#game-state-${this.id}`);
                const scoreDisplay = gameContainer.querySelector(`#score-${this.id}`);
                const shotsDisplay = gameContainer.querySelector(`#shots-${this.id}`);
                const startButton = gameContainer.querySelector(`#start-${this.id}`);
                const resetButton = gameContainer.querySelector(`#reset-${this.id}`);
                const ctx = canvas.getContext("2d");

                // 设置画布大小
                canvas.width = 800;
                canvas.height = 400;

                // 游戏状态
                let gameState = {
                    isRunning: false,
                    score: 0,
                    shots: 0,
                    balls: [],
                    cueBall: null,
                    gameMode: 'eight_ball',
                    lastShotTime: 0,
                    lastHitBall: null,
                    hasShot: false
                };

                // 物理参数
                const FRICTION = 0.985;
                const BALL_RADIUS = 10;
                const TABLE_WIDTH = canvas.width;
                const TABLE_HEIGHT = canvas.height;
                const CUSHION = 20;
                const POCKET_RADIUS = BALL_RADIUS * 1.5;

                // 球袋位置
                const POCKETS = [
                    { x: 0, y: 0 },
                    { x: TABLE_WIDTH / 2, y: 0 },
                    { x: TABLE_WIDTH, y: 0 },
                    { x: 0, y: TABLE_HEIGHT },
                    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT },
                    { x: TABLE_WIDTH, y: TABLE_HEIGHT }
                ];

                // 鼠标操作相关
                let isAiming = false;
                let aimStart = null;
                let aimEnd = null;

                // AI相关
                function calculateAIShot() {
                    if (!gameState.isRunning || !gameState.isAITurn) return;

                    // 找到最容易击中的球
                    let bestBall = null;
                    let bestScore = -Infinity;
                    let bestPocket = null;

                    gameState.balls.forEach(ball => {
                        POCKETS.forEach(pocket => {
                            // 计算球到袋口的距离和角度
                            const dx = pocket.x - ball.x;
                            const dy = pocket.y - ball.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx);

                            // 计算母球到目标球的路径
                            const ballToCue = {
                                x: gameState.cueBall.x - ball.x,
                                y: gameState.cueBall.y - ball.y
                            };
                            const ballToCueAngle = Math.atan2(ballToCue.y, ballToCue.x);
                            const angleDiff = Math.abs(angle - ballToCueAngle);

                            // 评分系统
                            let score = 1000 / distance; // 距离越近分数越高
                            score *= (1 - angleDiff / Math.PI); // 角度越直分数越高

                            // 根据难度调整
                            if (gameState.difficulty === 'easy') {
                                score *= 0.7;
                            } else if (gameState.difficulty === 'hard') {
                                score *= 1.3;
                            }

                            if (score > bestScore) {
                                bestScore = score;
                                bestBall = ball;
                                bestPocket = pocket;
                            }
                        });
                    });

                    if (bestBall && bestPocket) {
                        // 计算击球角度和力度
                        const dx = bestBall.x - gameState.cueBall.x;
                        const dy = bestBall.y - gameState.cueBall.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);

                        // 根据难度调整力度
                        let power = Math.min(distance * 0.5, 15);
                        if (gameState.difficulty === 'easy') {
                            power *= 0.8;
                        } else if (gameState.difficulty === 'hard') {
                            power *= 1.2;
                        }

                        // 执行击球
                        gameState.cueBall.velocity.x = Math.cos(angle) * power;
                        gameState.cueBall.velocity.y = Math.sin(angle) * power;
                        gameState.lastShotTime = Date.now();
                        gameState.hasShot = true;  // 标记AI已经击球
                        console.log("AI shot with power:", power, "angle:", angle);
                    } else {
                        // 如果没有找到合适的球，随机击球
                        const angle = Math.random() * Math.PI * 2;
                        const power = 10 + Math.random() * 5;
                        gameState.cueBall.velocity.x = Math.cos(angle) * power;
                        gameState.cueBall.velocity.y = Math.sin(angle) * power;
                        gameState.lastShotTime = Date.now();
                        gameState.hasShot = true;  // 标记AI已经击球
                        console.log("AI random shot with power:", power, "angle:", angle);
                    }
                }

                // 检查进球
                function checkPocketCollision(ball) {
                    for (let pocket of POCKETS) {
                        const dx = pocket.x - ball.x;
                        const dy = pocket.y - ball.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < POCKET_RADIUS) {
                            return true;
                        }
                    }
                    return false;
                }

                // 初始化游戏
                function initGame() {
                    console.log("Initializing game...");
                    // 创建球
                    gameState.balls = [];
                    
                    // 创建母球（放在左侧1/4处）
                    gameState.cueBall = {
                        x: TABLE_WIDTH * 0.25,
                        y: TABLE_HEIGHT / 2,
                        radius: BALL_RADIUS,
                        color: 'white',
                        velocity: { x: 0, y: 0 }
                    };

                    // 创建其他球（三角形排列）
                    const colors = ['yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown', 'black'];
                    const startX = TABLE_WIDTH * 0.75;
                    const startY = TABLE_HEIGHT / 2;
                    const spacing = BALL_RADIUS * 2.2;

                    // 使用三角形排列
                    let ballIndex = 0;
                    for (let row = 0; row < 5; row++) {
                        for (let col = 0; col <= row; col++) {
                            if (ballIndex >= 15) break;
                            
                            const x = startX + (col - row/2) * spacing;
                            const y = startY - (row * spacing * 0.866);
                            
                            gameState.balls.push({
                                x: x,
                                y: y,
                                radius: BALL_RADIUS,
                                color: colors[ballIndex % colors.length],
                                velocity: { x: 0, y: 0 },
                                number: ballIndex + 1
                            });
                            ballIndex++;
                        }
                    }

                    gameState.isAITurn = false;
                    gameState.isRunning = false;
                    updateDisplay();
                    console.log("Game initialized with", gameState.balls.length, "balls");
                }

                // 检查犯规
                function checkFoul() {
                    // 只检查母球进袋
                    if (checkPocketCollision(gameState.cueBall)) {
                        return true;
                    }
                    return false;
                }

                // 处理犯规
                function handleFoul() {
                    // 重置母球位置到左侧1/4处
                    gameState.cueBall.x = TABLE_WIDTH * 0.25;
                    gameState.cueBall.y = TABLE_HEIGHT / 2;
                    gameState.cueBall.velocity = { x: 0, y: 0 };
                    updateDisplay();
                }

                // 更新显示
                function updateDisplay() {
                    let stateText = gameState.isRunning ? '游戏中' : '准备中';
                    gameStateDisplay.textContent = `游戏状态: ${stateText}`;
                    scoreDisplay.textContent = `分数: ${gameState.score}`;
                    shotsDisplay.textContent = `击球次数: ${gameState.shots}`;
                }

                // 绘制游戏
                function drawGame() {
                    // 清空画布
                    ctx.fillStyle = '#222';
                    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

                    // 绘制台球桌
                    ctx.fillStyle = '#0a5c0a';
                    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

                    // 绘制球袋
                    ctx.fillStyle = '#000';
                    POCKETS.forEach(pocket => {
                        ctx.beginPath();
                        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    // 绘制其他球
                    gameState.balls.forEach(ball => {
                        ctx.beginPath();
                        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                        ctx.fillStyle = ball.color;
                        ctx.fill();
                        ctx.stroke();
                        // 绘制球号
                        ctx.fillStyle = 'white';
                        ctx.font = '10px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(ball.number.toString(), ball.x, ball.y);
                    });

                    // 绘制母球
                    if (gameState.cueBall) {
                        ctx.beginPath();
                        ctx.arc(gameState.cueBall.x, gameState.cueBall.y, gameState.cueBall.radius, 0, Math.PI * 2);
                        ctx.fillStyle = gameState.cueBall.color;
                        ctx.fill();
                        ctx.stroke();
                    }

                    // 绘制瞄准线
                    if (isAiming && aimStart && aimEnd) {
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.lineWidth = 2;
                        ctx.moveTo(aimStart.x, aimStart.y);
                        ctx.lineTo(aimEnd.x, aimEnd.y);
                        ctx.stroke();

                        // 绘制力度指示器
                        const dx = aimEnd.x - aimStart.x;
                        const dy = aimEnd.y - aimStart.y;
                        const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, 20);
                        const powerPercentage = (power / 20) * 100;
                        
                        ctx.fillStyle = 'white';
                        ctx.font = '12px Arial';
                        ctx.fillText(`力度: ${Math.round(powerPercentage)}%`, aimEnd.x + 10, aimEnd.y + 10);
                    }
                }

                const gameOverDisplay = gameContainer.querySelector(`#game-over-${this.id}`);

                // 检查游戏是否结束
                function checkGameOver() {
                    if (gameState.balls.length === 0) {
                        gameState.isRunning = false;
                        gameOverDisplay.style.display = 'block';
                        gameOverDisplay.textContent = `游戏结束，您的击球次数为 ${gameState.shots} 次`;
                        return true;
                    }
                    return false;
                }

                // 更新物理状态
                function updatePhysics() {
                    if (!gameState.isRunning) return;

                    let allBallsMoving = false;

                    // 母球
                    moveBall(gameState.cueBall);
                    // 其他球
                    gameState.balls.forEach(moveBall);

                    // 检查所有球是否在移动
                    [gameState.cueBall, ...gameState.balls].forEach(ball => {
                        if (Math.abs(ball.velocity.x) > 0.05 || Math.abs(ball.velocity.y) > 0.05) {
                            allBallsMoving = true;
                        }
                    });

                    // 如果所有球都停止移动
                    if (!allBallsMoving && gameState.isRunning) {
                        const currentTime = Date.now();
                        // 确保距离上次击球至少1秒
                        if (currentTime - gameState.lastShotTime > 1000) {
                            // 检查是否犯规（母球进袋）
                            if (checkFoul()) {
                                handleFoul();
                            }
                            // 检查游戏是否结束
                            checkGameOver();
                            gameState.lastShotTime = currentTime;
                            gameState.lastHitBall = null;
                            gameState.hasShot = false;
                        }
                    }

                    // 简单边界反弹
                    [gameState.cueBall, ...gameState.balls].forEach(ball => {
                        if (ball.x - BALL_RADIUS < 0) {
                            ball.x = BALL_RADIUS;
                            ball.velocity.x *= -1;
                        }
                        if (ball.x + BALL_RADIUS > TABLE_WIDTH) {
                            ball.x = TABLE_WIDTH - BALL_RADIUS;
                            ball.velocity.x *= -1;
                        }
                        if (ball.y - BALL_RADIUS < 0) {
                            ball.y = BALL_RADIUS;
                            ball.velocity.y *= -1;
                        }
                        if (ball.y + BALL_RADIUS > TABLE_HEIGHT) {
                            ball.y = TABLE_HEIGHT - BALL_RADIUS;
                            ball.velocity.y *= -1;
                        }
                    });

                    // 球与球之间的碰撞
                    const allBalls = [gameState.cueBall, ...gameState.balls];
                    for (let i = 0; i < allBalls.length; i++) {
                        for (let j = i + 1; j < allBalls.length; j++) {
                            resolveBallCollision(allBalls[i], allBalls[j]);
                        }
                    }

                    // 检查进球
                    gameState.balls = gameState.balls.filter(ball => {
                        if (checkPocketCollision(ball)) {
                            gameState.score += 10;
                            return false;
                        }
                        return true;
                    });

                    // 检查母球是否进袋
                    if (checkPocketCollision(gameState.cueBall)) {
                        // 重置母球位置
                        gameState.cueBall.x = TABLE_WIDTH * 0.25;
                        gameState.cueBall.y = TABLE_HEIGHT / 2;
                        gameState.cueBall.velocity = { x: 0, y: 0 };
                    }
                }

                function moveBall(ball) {
                    ball.x += ball.velocity.x;
                    ball.y += ball.velocity.y;
                    ball.velocity.x *= FRICTION;
                    ball.velocity.y *= FRICTION;
                    // 速度很小时归零
                    if (Math.abs(ball.velocity.x) < 0.05) ball.velocity.x = 0;
                    if (Math.abs(ball.velocity.y) < 0.05) ball.velocity.y = 0;
                }

                function resolveBallCollision(ballA, ballB) {
                    const dx = ballB.x - ballA.x;
                    const dy = ballB.y - ballA.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < BALL_RADIUS * 2 && dist > 0) {
                        // 记录击中的球
                        if (ballA === gameState.cueBall) {
                            gameState.lastHitBall = ballB;
                        } else if (ballB === gameState.cueBall) {
                            gameState.lastHitBall = ballA;
                        }

                        // 计算碰撞角度
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // 旋转坐标系
                        const pos0 = { x: 0, y: 0 };
                        const pos1 = rotate(dx, dy, sin, cos, true);
                        const vel0 = rotate(ballA.velocity.x, ballA.velocity.y, sin, cos, true);
                        const vel1 = rotate(ballB.velocity.x, ballB.velocity.y, sin, cos, true);

                        // 交换x方向的速度
                        const temp = vel0.x;
                        vel0.x = vel1.x;
                        vel1.x = temp;

                        // 旋转回原来的坐标系
                        const finalVel0 = rotate(vel0.x, vel0.y, sin, cos, false);
                        const finalVel1 = rotate(vel1.x, vel1.y, sin, cos, false);

                        // 更新速度
                        ballA.velocity.x = finalVel0.x;
                        ballA.velocity.y = finalVel0.y;
                        ballB.velocity.x = finalVel1.x;
                        ballB.velocity.y = finalVel1.y;

                        // 防止球重叠
                        const overlap = BALL_RADIUS * 2 - dist;
                        const moveX = (overlap * cos) / 2;
                        const moveY = (overlap * sin) / 2;
                        ballA.x -= moveX;
                        ballA.y -= moveY;
                        ballB.x += moveX;
                        ballB.y += moveY;
                    }
                }

                function rotate(x, y, sin, cos, reverse) {
                    return {
                        x: (reverse) ? (x * cos + y * sin) : (x * cos - y * sin),
                        y: (reverse) ? (y * cos - x * sin) : (y * cos + x * sin)
                    };
                }

                // 游戏主循环
                function gameLoop() {
                    updatePhysics();
                    drawGame();
                    requestAnimationFrame(gameLoop);
                }

                // 获取鼠标在画布上的坐标
                function getMousePos(canvas, e) {
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    return {
                        x: (e.clientX - rect.left) * scaleX,
                        y: (e.clientY - rect.top) * scaleY
                    };
                }

                // 鼠标事件
                canvas.addEventListener('mousedown', (e) => {
                    if (!gameState.isRunning) {
                        console.log("Cannot aim: game not running");
                        return;
                    }

                    const mousePos = getMousePos(canvas, e);
                    console.log("Mouse down at:", mousePos);

                    // 正常击球逻辑
                    const dx = mousePos.x - gameState.cueBall.x;
                    const dy = mousePos.y - gameState.cueBall.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    console.log("Distance to cue ball:", distance);
                    
                    if (distance < BALL_RADIUS * 1.5) {
                        isAiming = true;
                        aimStart = { x: gameState.cueBall.x, y: gameState.cueBall.y };
                        aimEnd = mousePos;
                        console.log("Started aiming");
                    }
                });

                canvas.addEventListener('mousemove', (e) => {
                    if (!isAiming) return;
                    aimEnd = getMousePos(canvas, e);
                });

                canvas.addEventListener('mouseup', (e) => {
                    if (!isAiming) return;
                    console.log("Mouse up, attempting shot");
                    
                    const mousePos = getMousePos(canvas, e);
                    aimEnd = mousePos;
                    
                    // 计算击球方向和力度
                    const dx = aimStart.x - aimEnd.x;
                    const dy = aimStart.y - aimEnd.y;
                    const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, 20); // 力度上限
                    const angle = Math.atan2(dy, dx);
                    
                    console.log("Shot parameters:", {
                        power: power,
                        angle: angle,
                        dx: dx,
                        dy: dy
                    });

                    gameState.cueBall.velocity.x = Math.cos(angle) * power;
                    gameState.cueBall.velocity.y = Math.sin(angle) * power;
                    gameState.lastShotTime = Date.now();
                    gameState.hasShot = true;
                    gameState.shots++;
                    updateDisplay();
                    
                    isAiming = false;
                    aimStart = null;
                    aimEnd = null;
                    
                    console.log("Shot completed");
                });

                // 事件监听
                startButton.onclick = () => {
                    console.log("Start button clicked");
                    if (!gameState.isRunning) {
                        gameState.isRunning = true;
                        gameState.lastHitBall = null;
                        gameState.hasShot = false;
                        gameState.lastShotTime = Date.now();
                        gameState.shots = 0;
                        gameOverDisplay.style.display = 'none';
                        updateDisplay();
                        console.log("Game started");
                    }
                };

                resetButton.onclick = () => {
                    console.log("Reset button clicked");
                    gameState.isRunning = false;
                    gameState.score = 0;
                    gameState.shots = 0;
                    gameState.lastHitBall = null;
                    gameState.hasShot = false;
                    gameState.lastShotTime = 0;
                    gameOverDisplay.style.display = 'none';
                    initGame();
                    updateDisplay();
                    console.log("Game reset, ready to start");
                };

                // 初始化游戏
                initGame();
                gameLoop();

                // 清理函数
                const onRemoved = this.onRemoved;
                this.onRemoved = () => {
                    console.log("BilliardsGameNode removed, cleaning up for node " + self.id);
                    if (gameContainer && gameContainer.parentElement) {
                        gameContainer.parentElement.removeChild(gameContainer);
                    }
                    return onRemoved?.apply(this, arguments);
                };

                console.log("Billiards game initialized for node " + self.id);
            };
        }
    }
});

console.log("🎱 Billiards Game Widget JS (v16 - with AI and improved physics) loaded"); 