import { app } from "/scripts/app.js";

app.registerExtension({
    name: "Comfy.BrickBreakerWidget",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "BrickBreakerNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                console.log("BrickBreakerNode created in UI. Adding widget.");

                const gameContainer = document.createElement("div");
                gameContainer.id = `brick-game-container-${this.id}`;
                gameContainer.style.width = "100%";
                gameContainer.style.border = "1px solid #555";
                gameContainer.style.display = "flex";
                gameContainer.style.flexDirection = "column";
                gameContainer.style.alignItems = "center";
                gameContainer.innerHTML = `
                    <div style="width: 100%; max-width: 600px;">
                        <canvas id="brickCanvas-${this.id}" style="width: 100%; aspect-ratio: 16/9; background-color: #222; display: block; margin: 5px auto; max-width: 600px;"></canvas>
                    </div>
                    <div id="score-${this.id}" style="color: white; text-align: center; font-size: 14px;">Score: 0</div>
                    <div id="lives-${this.id}" style="color: white; text-align: center; font-size: 14px;">Lives: 3</div>`;

                const self = this;

                const gameWidget = this.addDOMWidget("brick_game_area", "CANVAS_SLOT", gameContainer, {
                    getValue: () => {},
                    setValue: (v) => {},
                });
                gameWidget.serialize = false;

                const canvas = gameContainer.querySelector(`#brickCanvas-${this.id}`);
                const scoreDisplay = gameContainer.querySelector(`#score-${this.id}`);
                const livesDisplay = gameContainer.querySelector(`#lives-${this.id}`);
                const ctx = canvas.getContext("2d");
                
                // 设置画布实际尺寸
                canvas.width = 480;
                canvas.height = 270;

                // 再次调整游戏参数
                const brickRowCount = 7;  // 增加行数
                const brickColumnCount = 12; // 增加列数
                const brickWidth = 20;  // 减小砖块宽度
                const brickHeight = 8; // 减小砖块高度
                const brickPadding = 3; // 减小砖块间距
                const brickOffsetTop = 20;
                const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding) - brickPadding)) / 2; // 居中砖块
                const paddleHeight = 6;
                const paddleWidth = 50; // 保持挡板宽度
                const ballRadius = 4;   // 保持球半径

                // 调整后的初始球速
                let balls = [{ x: canvas.width/2, y: canvas.height-30, dx: 2.5, dy: -2.5, baseSpeed: 2.5 }]; // 提高初始速度
                let paddle = { x: (canvas.width-paddleWidth)/2 };
                let bricks = [];
                let score = 0;
                let lives = 3;
                let gameStarted = false;
                let gameRunning = false;
                let animationFrameId = null;
                let gamePaused = false;
                let lastTime = 0;
                const FPS = 60;
                const frameTime = 1000 / FPS;

                function initBricks() {
                    bricks = [];
                    for(let c=0; c<brickColumnCount; c++) {
                        bricks[c] = [];
                        for(let r=0; r<brickRowCount; r++) {
                            // 根据行数决定砖块类型
                            let brickType = 1; // 默认类型
                            let brickColor = "#0095DD"; // 默认颜色
                            
                            if(r < 1) { // 第一行
                                brickType = 3; // 需要击中3次
                                brickColor = "#FF5733"; // 红色
                            } else if(r < 2) { // 第二行
                                brickType = 2; // 需要击中2次
                                brickColor = "#FFC300"; // 黄色
                            }
                            
                            // 随机生成特殊砖块
                            const rand = Math.random();
                            if(rand < 0.05) {
                                brickType = -1; // 特殊砖块，给予额外分数
                                brickColor = "#33FF57"; // 绿色
                            } else if(rand < 0.08) {
                                brickType = -2; // 双球砖块
                                brickColor = "#9933FF"; // 紫色
                            }
                            
                            bricks[c][r] = { 
                                x: c*(brickWidth+brickPadding)+brickOffsetLeft, 
                                y: r*(brickHeight+brickPadding)+brickOffsetTop, 
                                status: brickType, // 使用类型作为状态
                                color: brickColor
                            };
                        }
                    }
                }

                function drawBall() {
                    for(let i = 0; i < balls.length; i++) {
                        ctx.beginPath();
                        ctx.arc(balls[i].x, balls[i].y, ballRadius, 0, Math.PI*2);
                        ctx.fillStyle = "#0095DD";
                        ctx.fill();
                        ctx.closePath();
                    }
                }

                function drawPaddle() {
                    ctx.beginPath();
                    ctx.rect(paddle.x, canvas.height-paddleHeight, paddleWidth, paddleHeight);
                    ctx.fillStyle = "#0095DD";
                    ctx.fill();
                    ctx.closePath();
                }

                function drawBricks() {
                    for(let c=0; c<brickColumnCount; c++) {
                        for(let r=0; r<brickRowCount; r++) {
                            if(bricks[c][r].status !== 0) {
                                let brickX = bricks[c][r].x;
                                let brickY = bricks[c][r].y;
                                ctx.beginPath();
                                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                                ctx.fillStyle = bricks[c][r].color;
                                ctx.fill();
                                ctx.closePath();
                                
                                // 如果是多次击中的砖块，显示剩余次数
                                if(bricks[c][r].status > 1) {
                                    ctx.font = "10px Arial";
                                    ctx.fillStyle = "#FFF";
                                    ctx.textAlign = "center";
                                    ctx.fillText(bricks[c][r].status, brickX + brickWidth/2, brickY + brickHeight/2 + 3);
                                }
                                
                                // 如果是特殊砖块，显示"+"符号
                                if(bricks[c][r].status === -1) {
                                    ctx.font = "12px Arial";
                                    ctx.fillStyle = "#FFF";
                                    ctx.textAlign = "center";
                                    ctx.fillText("+", brickX + brickWidth/2, brickY + brickHeight/2 + 4);
                                }
                                
                                // 如果是双球砖块，显示"×2"符号
                                if(bricks[c][r].status === -2) {
                                    ctx.font = "9px Arial";
                                    ctx.fillStyle = "#FFF";
                                    ctx.textAlign = "center";
                                    ctx.fillText("×2", brickX + brickWidth/2, brickY + brickHeight/2 + 3);
                                }
                            }
                        }
                    }
                }

                function drawScore() {
                    ctx.font = "16px Arial";
                    ctx.fillStyle = "#0095DD";
                    ctx.textAlign = "left";
                    ctx.fillText("分数: " + score, 8, 20);
                }

                function drawLives() {
                    ctx.font = "16px Arial";
                    ctx.fillStyle = "#0095DD";
                    ctx.textAlign = "right";
                    ctx.fillText("生命: " + lives, canvas.width - 8, 20);
                }

                function collisionDetection() {
                    for(let i = 0; i < balls.length; i++) {
                        for(let c=0; c<brickColumnCount; c++) {
                            for(let r=0; r<brickRowCount; r++) {
                                let b = bricks[c][r];
                                if(b.status !== 0) {
                                    if(balls[i].x > b.x && balls[i].x < b.x+brickWidth && 
                                       balls[i].y > b.y && balls[i].y < b.y+brickHeight) {
                                        balls[i].dy = -balls[i].dy;
                                        
                                        if(b.status === -1) {
                                            // 特殊砖块，给予额外分数
                                            score += 5;
                                            b.status = 0;
                                        } else if(b.status === -2) {
                                            // 双球砖块，增加一个球
                                            b.status = 0;
                                            // 创建一个新球，方向与当前球相反
                                            const newBall = {
                                                x: balls[i].x,
                                                y: balls[i].y,
                                                dx: -balls[i].dx,
                                                dy: balls[i].dy,
                                                baseSpeed: balls[i].baseSpeed
                                            };
                                            balls.push(newBall);
                                            score += 2;
                                        } else {
                                            // 普通砖块，减少状态值
                                            b.status -= 1;
                                            if(b.status === 0) {
                                                score++;
                                            }
                                        }
                                        
                                        scoreDisplay.textContent = "Score: " + score;
                                        
                                        // 检查是否所有砖块都被击中
                                        let allBricksDestroyed = true;
                                        for(let c=0; c<brickColumnCount; c++) {
                                            for(let r=0; r<brickRowCount; r++) {
                                                if(bricks[c][r].status > 0) {
                                                    allBricksDestroyed = false;
                                                    break;
                                                }
                                            }
                                            if(!allBricksDestroyed) break;
                                        }
                                        
                                        if(allBricksDestroyed) {
                                            alert("恭喜，你赢了！");
                                            resetGame();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                function draw() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawBricks();
                    drawBall();
                    drawPaddle();
                    drawScore();
                    drawLives();
                    collisionDetection();
                    
                    // 处理每个球的移动和碰撞
                    let ballsToRemove = [];
                    
                    for(let i = 0; i < balls.length; i++) {
                        let ball = balls[i];
                        
                        // 墙壁碰撞检测
                        if(ball.x + ball.dx > canvas.width-ballRadius || ball.x + ball.dx < ballRadius) {
                            ball.dx = -ball.dx;
                        }
                        if(ball.y + ball.dy < ballRadius) {
                            ball.dy = -ball.dy;
                        } else if(ball.y + ball.dy > canvas.height-ballRadius) {
                            // 检测是否击中挡板
                            if(ball.x > paddle.x && ball.x < paddle.x + paddleWidth) {
                                // 根据击中挡板的位置改变反弹角度
                                let hitPoint = (ball.x - (paddle.x + paddleWidth/2)) / (paddleWidth/2);
                                // hitPoint 的范围是 -1 到 1，中心点是0
                                ball.dx = hitPoint * ball.baseSpeed * 1.5; // 根据击中位置调整水平速度
                                ball.dy = -Math.abs(ball.dy); // 确保球向上弹
                                
                                // 每次击中挡板后，根据得分略微增加球的速度
                                if (score > 0 && score % 5 === 0) {
                                    let speedIncrease = Math.min(0.2, 0.05 * Math.floor(score / 5)); // 限制最大增加值
                                    ball.baseSpeed += speedIncrease;
                                    // 保持方向不变，只增加速度大小
                                    let magnitude = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                                    let normalizedDx = ball.dx / magnitude;
                                    let normalizedDy = ball.dy / magnitude;
                                    ball.dx = normalizedDx * ball.baseSpeed;
                                    ball.dy = normalizedDy * ball.baseSpeed;
                                }
                            } else {
                                // 球掉落，标记为移除
                                ballsToRemove.push(i);
                            }
                        }
                        
                        // 更新球的位置
                        ball.x += ball.dx;
                        ball.y += ball.dy;
                    }
                    
                    // 从后向前移除掉落的球，以避免索引问题
                    for(let i = ballsToRemove.length - 1; i >= 0; i--) {
                        balls.splice(ballsToRemove[i], 1);
                    }
                    
                    // 如果所有球都掉落了
                    if(balls.length === 0) {
                        lives--;
                        livesDisplay.textContent = "Lives: " + lives;
                        if(lives === 0) {
                            gameRunning = false;
                            showFinalScore();
                        } else {
                            // 重置球
                            balls = [{ 
                                x: canvas.width/2, 
                                y: canvas.height-30, 
                                dx: 2.5 * (Math.random() > 0.5 ? 1 : -1), 
                                dy: -2.5, 
                                baseSpeed: 2.5 
                            }];
                            paddle.x = (canvas.width-paddleWidth)/2;
                        }
                    }
                    
                    // 更新挡板位置
                    if(rightPressed && paddle.x < canvas.width-paddleWidth) {
                        paddle.x += 7;
                    }
                    else if(leftPressed && paddle.x > 0) {
                        paddle.x -= 7;
                    }
                }

                let rightPressed = false;
                let leftPressed = false;

                function keyDownHandler(e) {
                    if(e.key === "Right" || e.key === "ArrowRight") {
                        rightPressed = true;
                    } else if(e.key === "Left" || e.key === "ArrowLeft") {
                        leftPressed = true;
                    } else if(e.key === "Enter" && !gameStarted) {
                        // 回车键开始游戏
                        startGame();
                        gameStarted = true;
                    }
                }

                function keyUpHandler(e) {
                    if(e.key === "Right" || e.key === "ArrowRight") {
                        rightPressed = false;
                    } else if(e.key === "Left" || e.key === "ArrowLeft") {
                        leftPressed = false;
                    }
                }

                function mouseMoveHandler(e) {
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const relativeX = (e.clientX - rect.left) * scaleX;
                    
                    if(relativeX > 0 && relativeX < canvas.width) {
                        paddle.x = relativeX - paddleWidth/2;
                    }
                }

                function showFinalScore() {
                    const finalScoreDiv = document.createElement("div");
                    finalScoreDiv.style.position = "absolute";
                    finalScoreDiv.style.top = "50%";
                    finalScoreDiv.style.left = "50%";
                    finalScoreDiv.style.transform = "translate(-50%, -50%)";
                    finalScoreDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
                    finalScoreDiv.style.padding = "20px";
                    finalScoreDiv.style.borderRadius = "10px";
                    finalScoreDiv.style.color = "white";
                    finalScoreDiv.style.textAlign = "center";
                    finalScoreDiv.style.zIndex = "100";
                    finalScoreDiv.innerHTML = `
                        <h3 style="margin-top:0">游戏结束</h3>
                        <p>最终得分: ${score}</p>
                        <button id="restart-btn" style="padding:5px 10px;margin-top:10px;">再玩一次</button>
                    `;
                    gameContainer.appendChild(finalScoreDiv);
                    
                    document.getElementById("restart-btn").onclick = function() {
                        gameContainer.removeChild(finalScoreDiv);
                        resetGame();
                        startGame();
                    };
                }

                function resetGame() {
                    score = 0;
                    lives = 3;
                    gameStarted = false;
                    gameRunning = false;
                    scoreDisplay.textContent = "分数: " + score;
                    livesDisplay.textContent = "生命: " + lives;
                    initBricks();
                    balls = [{ x: canvas.width/2, y: canvas.height-30, dx: 2.5, dy: -2.5, baseSpeed: 2.5 }]; // 提高重置时的速度
                    paddle = { x: (canvas.width-paddleWidth)/2 };
                    if(animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                    // 清除所有事件监听器
                    document.removeEventListener("keydown", keyDownHandler);
                    document.removeEventListener("keyup", keyUpHandler);
                    document.removeEventListener("mousemove", mouseMoveHandler);
                    // 重绘初始状态
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawBricks();
                    drawBall();
                    drawPaddle();
                    drawScore();
                    drawLives();
                }

                function gameLoop(timestamp) {
                    if(!timestamp) timestamp = 0;
                    const deltaTime = timestamp - lastTime;
                    
                    if(gameRunning && !gamePaused) {
                        if(deltaTime >= frameTime) {
                            lastTime = timestamp - (deltaTime % frameTime);
                            draw();
                        }
                        animationFrameId = requestAnimationFrame(gameLoop);
                    }
                }

                function startGame() {
                    if(!gameRunning) {
                        // 确保先重置游戏状态
                        resetGame();
                        gameRunning = true;
                        gameStarted = true;
                        initBricks();
                        document.addEventListener("keydown", keyDownHandler, false);
                        document.addEventListener("keyup", keyUpHandler, false);
                        document.addEventListener("mousemove", mouseMoveHandler, false);
                        
                        // 添加倒计时
                        let countdown = 3;
                        const countdownInterval = setInterval(() => {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            drawBricks();
                            drawPaddle();
                            drawScore();
                            drawLives();
                            
                            // 绘制倒计时
                            ctx.font = "36px Arial";
                            ctx.fillStyle = "#FF5733";
                            ctx.textAlign = "center";
                            ctx.fillText(countdown, canvas.width/2, canvas.height/2);
                            
                            countdown--;
                            
                            if(countdown < 0) {
                                clearInterval(countdownInterval);
                                // 开始游戏循环
                                balls[0].x = canvas.width/2;
                                balls[0].y = canvas.height-30;
                                gameLoop();
                            }
                        }, 1000);
                    }
                }

                // 创建控制容器
                const controlsContainer = document.createElement("div");
                controlsContainer.style.display = "flex";
                controlsContainer.style.justifyContent = "center";
                controlsContainer.style.margin = "5px 0";
                gameContainer.appendChild(controlsContainer);

                const restartButton = document.createElement("button");
                restartButton.textContent = "开始/重新开始";
                restartButton.style.display = "block";
                restartButton.style.margin = "5px";
                restartButton.onclick = () => {
                    console.log("Restart button clicked for node " + self.id);
                    startGame();
                    canvas.focus();
                };
                controlsContainer.appendChild(restartButton);

                // 添加暂停按钮
                const pauseButton = document.createElement("button");
                pauseButton.textContent = "暂停";
                pauseButton.style.margin = "5px";
                controlsContainer.appendChild(pauseButton);

                pauseButton.addEventListener("click", function() {
                    if(gameRunning) {
                        if(gamePaused) {
                            // 恢复游戏
                            gamePaused = false;
                            pauseButton.textContent = "暂停";
                            gameLoop();
                        } else {
                            // 暂停游戏
                            gamePaused = true;
                            pauseButton.textContent = "继续";
                            if(animationFrameId) {
                                cancelAnimationFrame(animationFrameId);
                                animationFrameId = null;
                            }
                        }
                    }
                });

                const onRemoved = this.onRemoved;
                this.onRemoved = () => {
                    console.log("BrickBreakerNode removed, cleaning up for node " + self.id);
                    if(animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    document.removeEventListener("keydown", keyDownHandler);
                    document.removeEventListener("keyup", keyUpHandler);
                    document.removeEventListener("mousemove", mouseMoveHandler);
                    if (gameContainer && gameContainer.parentElement) {
                        gameContainer.parentElement.removeChild(gameContainer);
                    }
                    return onRemoved?.apply(this, arguments);
                };

                console.log("Brick breaker game initialized for node " + self.id);
            };
        }
    }
});


