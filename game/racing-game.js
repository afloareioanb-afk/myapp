class RacingGame {
    constructor() {
        this.selectedPlayer = null;
        this.currentLane = 1; // 0 = left, 1 = center, 2 = right
        this.score = 0;
        this.gameRunning = false;
        this.gameSpeed = 2000; // milliseconds between obstacles
        this.obstacleSpeed = 3; // seconds for obstacle to cross screen
        this.speedMultiplier = 1.0; // Current speed multiplier
        this.obstacles = [];
        this.gameLoop = null;
        this.speedIncreaseInterval = null;
        this.mathQuestionInterval = null;
        this.mathTimerInterval = null;
        this.mathCountdownInterval = null;
        this.gameStartTime = 0;
        this.isMathQuestionActive = false;
        this.nextMathQuestionTime = 0;
        this.gameDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.gameTimerInterval = null;
        this.obstaclePattern = [];
        this.currentObstacleIndex = 0;
        this.lastObstacleTime = 0;
        this.obstacleCooldown = 1000; // Minimum time between obstacles
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.playerSelection = document.getElementById('player-selection');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over');
        this.playerCards = document.querySelectorAll('.player-card');
        this.playerCar = document.getElementById('player-car');
        this.obstaclesContainer = document.querySelector('.obstacles-container');
        this.scoreElement = document.getElementById('score');
        this.speedElement = document.getElementById('speed');
        this.gameTimerElement = document.getElementById('game-timer');
        this.mathTimerDisplayElement = document.getElementById('math-timer-display');
        this.finalScoreElement = document.getElementById('final-score');
        this.selectedPlayerName = document.getElementById('selected-player-name');
        this.finalPlayerElement = document.getElementById('final-player');
        
        // Math question elements
        this.mathModal = document.getElementById('math-question-modal');
        this.mathQuestion = document.getElementById('math-question');
        this.mathAnswer = document.getElementById('math-answer');
        this.mathTimer = document.getElementById('math-timer');
        this.submitAnswerBtn = document.getElementById('submit-answer');
        
        this.playAgainBtn = document.getElementById('play-again');
        this.changePlayerBtn = document.getElementById('change-player');
        this.pauseBtn = document.getElementById('pause-btn');
    }

    bindEvents() {
        // Player selection
        this.playerCards.forEach(card => {
            card.addEventListener('click', (e) => this.selectPlayer(e));
        });

        // Game controls
        this.playAgainBtn.addEventListener('click', () => this.startGame());
        this.changePlayerBtn.addEventListener('click', () => this.showPlayerSelection());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Math question controls
        this.submitAnswerBtn.addEventListener('click', () => this.submitMathAnswer());
        this.mathAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitMathAnswer();
            }
        });
        
        // Handle numpad input and restrict to numbers only
        this.mathAnswer.addEventListener('keydown', (e) => {
            // Allow numpad keys (0-9), backspace, delete, arrow keys, tab
            const allowedKeys = [
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 
                'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
                'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'
            ];
            
            if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    selectPlayer(event) {
        const playerCard = event.currentTarget;
        const playerName = playerCard.dataset.player;
        
        // Remove previous selection
        this.playerCards.forEach(card => card.classList.remove('selected'));
        
        // Select new player
        playerCard.classList.add('selected');
        this.selectedPlayer = playerName;
        
        // Update player info
        const playerNameElement = playerCard.querySelector('h3').textContent;
        this.selectedPlayerName.textContent = playerNameElement;
        this.finalPlayerElement.textContent = playerNameElement;
        
        // Start game after a short delay
        setTimeout(() => {
            this.startGame();
        }, 500);
    }

    startGame() {
        this.hideAllScreens();
        this.gameScreen.classList.add('active');
        
        this.score = 0;
        this.currentLane = 1;
        this.gameRunning = true;
        this.speedMultiplier = 1.0;
        this.obstacles = [];
        this.obstaclesContainer.innerHTML = '';
        this.gameStartTime = Date.now();
        this.currentObstacleIndex = 0;
        this.lastObstacleTime = 0;
        
        // Generate obstacle pattern
        this.generateObstaclePattern();
        
        this.updateScore();
        this.updateSpeed();
        this.updateCarPosition();
        this.startGameTimer();
        this.startMathCountdown();
        this.startGameLoop();
        this.startSpeedIncrease();
        this.startMathQuestions();
    }

    showPlayerSelection() {
        this.hideAllScreens();
        this.playerSelection.classList.add('active');
        this.gameRunning = false;
        this.hideMathModal();
        this.clearAllIntervals();
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    startGameLoop() {
        this.gameLoop = setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                this.createObstacle();
                this.updateScore();
            }
        }, this.gameSpeed / this.speedMultiplier);
    }

    startSpeedIncrease() {
        this.speedIncreaseInterval = setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                this.speedMultiplier += 0.05; // Reduced from 0.1 to 0.05
                this.updateSpeed();
                this.updateGameSpeed();
            }
        }, 2000); // Increased from 1 second to 2 seconds
    }

    startMathQuestions() {
        // Math questions have their own independent timer, not affected by speed
        this.mathQuestionInterval = setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                this.showMathQuestion();
            }
        }, 30000); // Show math question every 30 seconds (independent of speed)
    }

    clearAllIntervals() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        if (this.speedIncreaseInterval) clearInterval(this.speedIncreaseInterval);
        if (this.mathQuestionInterval) clearInterval(this.mathQuestionInterval);
        if (this.mathTimerInterval) clearInterval(this.mathTimerInterval);
        if (this.mathCountdownInterval) clearInterval(this.mathCountdownInterval);
        if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    }

    updateGameSpeed() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.startGameLoop();
        }
    }

    updateSpeed() {
        this.speedElement.textContent = `Speed: ${this.speedMultiplier.toFixed(1)}x`;
    }

    startMathCountdown() {
        this.nextMathQuestionTime = 30000; // 30 seconds
        this.updateMathTimerDisplay();
        
        this.mathCountdownInterval = setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                this.nextMathQuestionTime -= 1000;
                this.updateMathTimerDisplay();
                
                if (this.nextMathQuestionTime <= 0) {
                    this.nextMathQuestionTime = 30000; // Reset for next question
                }
            }
        }, 1000);
    }

    updateMathTimerDisplay() {
        const seconds = Math.ceil(this.nextMathQuestionTime / 1000);
        this.mathTimerDisplayElement.textContent = `Next Math: ${seconds}s`;
    }

    startGameTimer() {
        this.gameTimerInterval = setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                const elapsed = Date.now() - this.gameStartTime;
                const remaining = Math.max(0, this.gameDuration - elapsed);
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                
                this.gameTimerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (remaining <= 0) {
                    this.gameWin();
                }
            }
        }, 100);
    }

    gameWin() {
        this.gameRunning = false;
        this.clearAllIntervals();
        this.hideMathModal();
        
        // Show win screen
        this.finalScoreElement.textContent = this.score;
        this.hideAllScreens();
        this.gameOverScreen.classList.add('active');
        
        // Update game over message
        const gameOverTitle = document.querySelector('#game-over h2');
        gameOverTitle.textContent = '🎉 You Win! 🎉';
    }

    createObstacle() {
        const currentTime = Date.now() - this.gameStartTime;
        
        // Check if it's time to create obstacles from pattern
        if (this.currentObstacleIndex < this.obstaclePattern.length) {
            const patternEntry = this.obstaclePattern[this.currentObstacleIndex];
            
            if (currentTime >= patternEntry.time) {
                // Create obstacles for this time slot with proper spacing
                patternEntry.obstacles.forEach((obstacleData, index) => {
                    setTimeout(() => {
                        this.createObstacleAtLane(obstacleData.lane, obstacleData.spacing);
                    }, index * 500); // Increased to 500ms delay between obstacles
                });
                this.currentObstacleIndex++;
            }
        }
    }

    createObstacleAtLane(lane, spacing = 0) {
        // Check if there's already an obstacle in this lane that might overlap
        const existingObstacle = this.obstacles.find(obs => obs.lane === lane);
        if (existingObstacle) {
            // Skip creating this obstacle to prevent overlap
            console.log(`Skipping obstacle in lane ${lane} to prevent overlap`);
            return;
        }

        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        
        const lanePositions = [16.66, 50, 83.33]; // Left, center, right positions (within track area)
        obstacle.style.left = lanePositions[lane] + '%';
        obstacle.style.animationDuration = (this.obstacleSpeed / this.speedMultiplier) + 's';
        
        // Add vertical spacing offset
        if (spacing > 0) {
            obstacle.style.top = `-${50 + spacing}px`;
        }
        
        // Add collision box
        const collisionBox = document.createElement('div');
        collisionBox.className = 'obstacle-collision-box';
        obstacle.appendChild(collisionBox);
        
        this.obstaclesContainer.appendChild(obstacle);
        this.obstacles.push({
            element: obstacle,
            lane: lane,
            top: -50 - spacing,
            createdTime: Date.now()
        });

        // Remove obstacle after animation
        setTimeout(() => {
            if (obstacle.parentNode) {
                obstacle.parentNode.removeChild(obstacle);
            }
            this.obstacles = this.obstacles.filter(obs => obs.element !== obstacle);
        }, (this.obstacleSpeed / this.speedMultiplier) * 1000);
    }

    handleKeyPress(event) {
        if (!this.gameRunning || this.isMathQuestionActive) return;

        switch(event.code) {
            case 'ArrowLeft':
                event.preventDefault();
                this.moveLeft();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveRight();
                break;
            case 'Space':
                event.preventDefault();
                this.togglePause();
                break;
        }
    }

    moveLeft() {
        // Can move left from any lane except leftmost (lane 0)
        if (this.currentLane > 0) {
            this.currentLane--;
            this.updateCarPosition();
        }
    }

    moveRight() {
        // Can move right from any lane except rightmost (lane 2)
        if (this.currentLane < 2) {
            this.currentLane++;
            this.updateCarPosition();
        }
    }

    updateCarPosition() {
        this.playerCar.className = 'car';
        const laneClasses = ['left', 'center', 'right'];
        this.playerCar.classList.add(laneClasses[this.currentLane]);
    }

    updateScore() {
        this.score += 10;
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    togglePause() {
        this.gameRunning = !this.gameRunning;
        this.pauseBtn.textContent = this.gameRunning ? '⏸️ Pause' : '▶️ Resume';
        
        if (this.gameRunning) {
            this.startGameLoop();
            this.startSpeedIncrease();
            this.startMathQuestions();
        } else {
            this.clearAllIntervals();
        }
    }

    showMathQuestion() {
        if (this.mathModal.classList.contains('active') || this.isMathQuestionActive) {
            console.log('Math question already active, skipping...');
            return; // Don't show if already active
        }
        
        console.log('Showing math question...');
        this.isMathQuestionActive = true;
        this.pauseGameForMath();
        
        // Reset math countdown for next question
        this.nextMathQuestionTime = 30000;
        this.updateMathTimerDisplay();
        
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const operation = Math.random() > 0.5 ? '+' : '-';
        
        let question, answer;
        if (operation === '+') {
            question = `${num1} + ${num2} = ?`;
            answer = num1 + num2;
        } else {
            // Ensure positive result for subtraction
            const larger = Math.max(num1, num2);
            const smaller = Math.min(num1, num2);
            question = `${larger} - ${smaller} = ?`;
            answer = larger - smaller;
        }
        
        this.currentMathAnswer = answer;
        this.mathQuestion.textContent = question;
        this.mathAnswer.value = '';
        this.mathModal.classList.add('active');
        this.mathAnswer.focus();
        
        // Start 10-second timer
        this.startMathTimer();
    }

    pauseGameForMath() {
        // Pause all game intervals except timer
        if (this.gameLoop) clearInterval(this.gameLoop);
        if (this.speedIncreaseInterval) clearInterval(this.speedIncreaseInterval);
        if (this.mathQuestionInterval) clearInterval(this.mathQuestionInterval);
        // Keep game timer running but paused
    }

    resumeGameAfterMath() {
        // Resume game intervals
        this.startGameLoop();
        this.startSpeedIncrease();
        this.startMathQuestions();
        // Game timer continues from where it left off
    }

    startMathTimer() {
        let timeLeft = 10;
        this.mathTimer.textContent = timeLeft;
        
        this.mathTimerInterval = setInterval(() => {
            timeLeft--;
            this.mathTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    timeUp() {
        this.hideMathModal();
        this.mathQuestion.textContent = `⏰ Time's up! Answer was ${this.currentMathAnswer}`;
        setTimeout(() => {
            this.hideMathModal();
        }, 2000);
    }

    hideMathModal() {
        this.mathModal.classList.remove('active');
        this.isMathQuestionActive = false;
        if (this.mathTimerInterval) {
            clearInterval(this.mathTimerInterval);
        }
        
        // Add a small delay before resuming to prevent immediate next question
        setTimeout(() => {
            this.resumeGameAfterMath();
        }, 1000); // 1 second delay
    }

    submitMathAnswer() {
        if (this.mathTimerInterval) {
            clearInterval(this.mathTimerInterval);
        }
        
        const userAnswer = parseInt(this.mathAnswer.value);
        
        if (userAnswer === this.currentMathAnswer) {
            // Correct answer - decrease speed by 10%
            this.speedMultiplier = Math.max(0.5, this.speedMultiplier * 0.9);
            this.updateSpeed();
            this.updateGameSpeed();
            this.score += 50; // Bonus points for correct answer
            this.updateScore();
            
            // Show success feedback
            this.mathQuestion.textContent = '✅ Correct! Speed decreased!';
            setTimeout(() => {
                this.hideMathModal();
            }, 1500);
        } else {
            // Wrong answer - show correct answer
            this.mathQuestion.textContent = `❌ Wrong! Answer was ${this.currentMathAnswer}`;
            setTimeout(() => {
                this.hideMathModal();
            }, 2000);
        }
    }


    checkCollisions() {
        const carRect = this.playerCar.getBoundingClientRect();
        
        this.obstacles.forEach(obstacle => {
            const obstacleRect = obstacle.element.getBoundingClientRect();
            
            // More precise collision detection using bounding boxes
            const collision = !(carRect.right < obstacleRect.left || 
                              carRect.left > obstacleRect.right || 
                              carRect.bottom < obstacleRect.top || 
                              carRect.top > obstacleRect.bottom);
            
            if (collision) {
                this.gameOver();
            }
        });
    }

    gameOver() {
        this.gameRunning = false;
        this.clearAllIntervals();
        this.hideMathModal();
        
        this.finalScoreElement.textContent = this.score;
        this.hideAllScreens();
        this.gameOverScreen.classList.add('active');
    }

    // Generate predefined obstacle pattern for 5-minute game
    generateObstaclePattern() {
        this.obstaclePattern = [];
        const totalTime = this.gameDuration;
        const baseInterval = 4000; // Increased to 4 seconds between obstacle sets
        
        for (let time = 0; time < totalTime; time += baseInterval) {
            const obstacles = this.generateObstacleSet();
            this.obstaclePattern.push({
                time: time,
                obstacles: obstacles
            });
        }
        
        // Validate pattern to ensure no 3 obstacles on same line
        this.validateObstaclePattern();
    }

    validateObstaclePattern() {
        // Check each time slot to ensure no more than 2 obstacles per line
        this.obstaclePattern.forEach((entry, index) => {
            const laneCount = { 0: 0, 1: 0, 2: 0 };
            
            entry.obstacles.forEach(obstacle => {
                laneCount[obstacle.lane]++;
            });
            
            // If any lane has more than 2 obstacles, fix it
            Object.keys(laneCount).forEach(lane => {
                if (laneCount[lane] > 2) {
                    console.warn(`Fixed lane ${lane} with ${laneCount[lane]} obstacles at time ${entry.time}`);
                    // Remove excess obstacles from this lane
                    const obstaclesToKeep = entry.obstacles.filter(obs => obs.lane != lane).slice(0, 2);
                    entry.obstacles = obstaclesToKeep;
                }
            });
        });
    }

    generateObstacleSet() {
        const obstacles = [];
        const numObstacles = Math.floor(Math.random() * 2) + 1; // 1 or 2 obstacles per set
        
        // Ensure no more than 2 obstacles on same line
        const usedLanes = new Set();
        
        for (let i = 0; i < numObstacles; i++) {
            let lane;
            let attempts = 0;
            do {
                lane = Math.floor(Math.random() * 3); // 0, 1, or 2
                attempts++;
                // Prevent infinite loop
                if (attempts > 10) break;
            } while (usedLanes.has(lane));
            
            usedLanes.add(lane);
            obstacles.push({
                lane: lane,
                type: 'obstacle',
                spacing: this.calculateObstacleSpacing(obstacles.length)
            });
        }
        
        return obstacles;
    }

    calculateObstacleSpacing(obstacleIndex) {
        // Add vertical spacing between obstacles
        const baseSpacing = 150; // Increased base spacing in pixels
        const randomOffset = Math.random() * 100; // Increased random offset for natural look
        return baseSpacing + (obstacleIndex * 50) + randomOffset; // Increased per-obstacle spacing
    }

    // Check collisions continuously
    startCollisionDetection() {
        setInterval(() => {
            if (this.gameRunning && !this.isMathQuestionActive) {
                this.checkCollisions();
            }
        }, 50); // Check every 50ms
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new RacingGame();
    game.startCollisionDetection();
});

// Add some visual feedback for controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        document.body.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #764ba2 100%)';
        setTimeout(() => {
            document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 100);
    }
});
