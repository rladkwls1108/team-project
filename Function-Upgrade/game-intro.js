// ==================== 게임 설정 ====================

const CONFIG = {
  canvas: { width: 800, height: 600 },
  player: {
    width: 40,
    height: 40,
    speed: 5,
    hp: 100,
    maxHp: 100,
    fireRate: 200,
    invincibleDuration: 2000
  },
  enemy: {
    spawnRate: 1500,
    types: [
      { name: 'type1', color: '#00FF88', hp: 10, speed: 2, score: 10 },
      { name: 'type2', color: '#FF00FF', hp: 20, speed: 1.5, score: 20 },
      { name: 'type3', color: '#FFD700', hp: 30, speed: 1, score: 30 }
    ]
  },
  boss: {
    width: 80,
    height: 80,
    hp: 500,
    score: 1000,
    patternChangeInterval: 5000
  },
  bullet: {
    player: { speed: 12, damage: 10, color: '#00FFFF' },
    enemy: { speed: 8, damage: 10, color: '#FF6666' }
  },
  item: {
    dropChance: 0.15,
    types: [
      { name: 'heal', color: '#00FF00', duration: 0 },
      { name: 'rapid', color: '#0099FF', duration: 5000 },
      { name: 'multi', color: '#FF9900', duration: 5000 },
      { name: 'shield', color: '#FFFF00', duration: 3000 }
    ]
  },
  skill: {
    chargePerKill: 10,
    cooldown: 30000
  }
};

// ==================== 유틸 함수 ====================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== GameManager (인트로 포함) ====================

class GameManager {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'intro'; // ✅ 인트로 상태 추가
    this.introStartTime = Date.now();

    this.keys = {};
    this.setupControls();
    this.gameLoop();
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'intro') {
          this.state = 'start'; // ✅ 인트로에서 시작화면으로 전환
        } else if (this.state === 'start' || this.state === 'gameOver') {
          this.resetGame();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  resetGame() {
    this.state = 'playing';
  }

  drawIntroScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // 로고 애니메이션 효과
    const alpha = 0.6 + Math.sin(Date.now() / 300) * 0.4;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 30;
    ctx.fillText('SPACE DRAGON SHOOTER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 40);
    ctx.globalAlpha = 1;

    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.fillText('Press SPACE to Continue', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 80);
    ctx.shadowBlur = 0;

    // 자동전환 (4초 후)
    if (Date.now() - this.introStartTime > 4000) {
      this.state = 'start';
    }
  }

  drawStartScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 20;
    ctx.fillText('SPACE DRAGON SHOOTER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.fillText('Press SPACE to Start', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 20);
    ctx.font = '16px Arial';
    ctx.fillText('Arrow Keys: Move | Space: Shoot | Shift: Bomb Skill', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 60);
    ctx.shadowBlur = 0;
  }

  draw() {
    if (this.state === 'intro') {
      this.drawIntroScreen();
    } else if (this.state === 'start') {
      this.drawStartScreen();
    }
  }

  gameLoop() {
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ==================== 게임 시작 ====================

window.addEventListener('load', () => {
  new GameManager();
});
