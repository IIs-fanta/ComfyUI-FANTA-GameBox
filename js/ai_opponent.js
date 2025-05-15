class AIPlayer {
    constructor(gameWidget) {
        this.gameWidget = gameWidget;
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.thinkTime = 1000; // 思考时间（毫秒）
        this.lastShot = null;
    }

    // 设置AI难度
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch(difficulty) {
            case 'easy':
                this.thinkTime = 500;
                break;
            case 'medium':
                this.thinkTime = 1000;
                break;
            case 'hard':
                this.thinkTime = 1500;
                break;
        }
    }

    // 计算两点之间的距离
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // 计算击球角度
    calculateAngle(cueBall, targetBall) {
        return Math.atan2(targetBall.pos.y - cueBall.pos.y, targetBall.pos.x - cueBall.pos.x);
    }

    // 评估击球机会
    evaluateShot(cueBall, targetBall, pockets) {
        let bestPocket = null;
        let bestScore = -Infinity;

        for (const pocket of pockets) {
            // 计算目标球到袋口的距离
            const targetToPocket = this.distance(
                targetBall.pos.x, targetBall.pos.y,
                pocket.x, pocket.y
            );

            // 计算母球到目标球的距离
            const cueToTarget = this.distance(
                cueBall.pos.x, cueBall.pos.y,
                targetBall.pos.x, targetBall.pos.y
            );

            // 计算目标球到袋口的角度
            const targetToPocketAngle = Math.atan2(
                pocket.y - targetBall.pos.y,
                pocket.x - targetBall.pos.x
            );

            // 计算母球到目标球的角度
            const cueToTargetAngle = Math.atan2(
                targetBall.pos.y - cueBall.pos.y,
                targetBall.pos.x - cueBall.pos.x
            );

            // 计算角度差异
            const angleDiff = Math.abs(targetToPocketAngle - cueToTargetAngle);

            // 评分系统
            let score = 0;
            
            // 距离评分
            score += (1 / targetToPocket) * 100; // 目标球到袋口越近越好
            score += (1 / cueToTarget) * 50; // 母球到目标球越近越好

            // 角度评分
            score += (1 / angleDiff) * 150; // 角度越直越好

            // 难度调整
            switch(this.difficulty) {
                case 'easy':
                    score *= 0.7; // 降低评分，使AI更容易选择简单球
                    break;
                case 'hard':
                    score *= 1.3; // 提高评分，使AI更倾向于选择难度球
                    break;
            }

            if (score > bestScore) {
                bestScore = score;
                bestPocket = pocket;
            }
        }

        return {
            pocket: bestPocket,
            score: bestScore
        };
    }

    // 决定击球
    decideShot(cueBall, balls, pockets) {
        // 过滤出活跃的目标球
        const targetBalls = balls.filter(ball => 
            ball.active && 
            ball.id !== 'cue' && 
            ball.type !== this.gameWidget.playerBallType
        );

        if (targetBalls.length === 0) {
            console.log("AI: No valid target balls found");
            return null;
        }

        // 评估每个可能的击球
        let bestShot = null;
        let bestScore = -Infinity;

        for (const targetBall of targetBalls) {
            const shotEvaluation = this.evaluateShot(cueBall, targetBall, pockets);
            
            if (shotEvaluation.score > bestScore) {
                bestScore = shotEvaluation.score;
                bestShot = {
                    targetBall,
                    pocket: shotEvaluation.pocket,
                    score: shotEvaluation.score
                };
            }
        }

        if (!bestShot) {
            console.log("AI: Could not find a good shot");
            return null;
        }

        // 计算击球力度和方向
        const angle = this.calculateAngle(cueBall, bestShot.targetBall);
        let power = 5; // 基础力度

        // 根据难度调整力度
        switch(this.difficulty) {
            case 'easy':
                power *= 0.8;
                break;
            case 'hard':
                power *= 1.2;
                break;
        }

        // 添加一些随机性
        const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 到 1.1 之间的随机数
        power *= randomFactor;

        // 计算最终速度向量
        const vx = Math.cos(angle) * power;
        const vy = Math.sin(angle) * power;

        this.lastShot = {
            targetBall: bestShot.targetBall,
            pocket: bestShot.pocket,
            power,
            angle
        };

        return { vx, vy };
    }

    // 获取AI的思考状态
    getThinkingStatus() {
        return {
            difficulty: this.difficulty,
            lastShot: this.lastShot,
            thinkTime: this.thinkTime
        };
    }
}

export { AIPlayer }; 