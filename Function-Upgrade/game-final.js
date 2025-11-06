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

// ==================== 유틸리티 함수 ====================

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function circleCollision(obj1, obj2) {
  const radius1 = obj1.width / 2;
  const radius2 = obj2.width / 2;
  const dist = distance(obj1.x + radius1, obj1.y + radius1, obj2.x + radius2, obj2.y + radius2);
  return dist < radius1 + radius2;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// ==================== Particle 클래스 ====================

class Particle {
  constructor(x, y, color, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = randomFloat(-3, 3);
    this.vy = randomFloat(-3, 3);
    this.color = color;
    this.size = size;
    this.life = 1.0;
    this.decay = randomFloat(0.02, 0.05);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.size *= 0.95;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

// ==================== Player 클래스 ====================

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.hp = CONFIG.player.hp;
    this.maxHp = CONFIG.player.maxHp;
    this.speed = CONFIG.player.speed;
    this.fireRate = CONFIG.player.fireRate;
    this.lastFireTime = 0;
    this.bulletType = 'normal';
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.animFrame = 0;
    
    this.buffs = {
      rapid: { active: false, endStage: -1 },
      multi: { active: false, endStage: -1 },
      shield: { active: false, duration: 0 }
    };
  }

  move(keys) {
    if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;
    if (keys.ArrowRight && this.x < CONFIG.canvas.width - this.width) this.x += this.speed;
    if (keys.ArrowUp && this.y > 0) this.y -= this.speed;
    if (keys.ArrowDown && this.y < CONFIG.canvas.height - this.height) this.y += this.speed;
  }

  shoot(currentTime) {
    const fireRate = this.buffs.rapid.active ? this.fireRate / 2 : this.fireRate;
    if (currentTime - this.lastFireTime < fireRate) return [];
    this.lastFireTime = currentTime;

    const bullets = [];
    const centerX = this.x + this.width / 2;
    const centerY = this.y;

    if (this.buffs.multi.active) {
      bullets.push(new Bullet(centerX - 5, centerY, true, -0.3));
      bullets.push(new Bullet(centerX, centerY, true, 0));
      bullets.push(new Bullet(centerX + 5, centerY, true, 0.3));
    } else {
      bullets.push(new Bullet(centerX, centerY, true, 0));
    }

    return bullets;
  }

  takeDamage(dmg) {
    if (this.isInvincible || this.buffs.shield.active) return false;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      return true;
    }

    this.isInvincible = true;
    this.invincibleTimer = Date.now() + CONFIG.player.invincibleDuration;
    return false;
  }

  applyItem(item, currentStage = 1) {
    switch(item.type) {
      case 'heal':
        this.hp = Math.min(this.hp + 20, this.maxHp);
        break;
      case 'rapid':
        this.buffs.rapid = { active: true, endStage: currentStage + 1 };
        break;
      case 'multi':
        this.buffs.multi = { active: true, endStage: currentStage + 1 };
        break;
      case 'shield':
        this.buffs.shield = { active: true, duration: 3000 };
        break;
    }
  }

  updateBuffs(currentStage) {
    if (this.buffs.rapid.active && currentStage >= this.buffs.rapid.endStage) {
      this.buffs.rapid.active = false;
      this.buffs.rapid.endStage = -1;
    }
    
    if (this.buffs.multi.active && currentStage >= this.buffs.multi.endStage) {
      this.buffs.multi.active = false;
      this.buffs.multi.endStage = -1;
    }
    
    if (this.buffs.shield.active) {
      this.buffs.shield.duration -= 16;
      if (this.buffs.shield.duration <= 0) {
        this.buffs.shield.active = false;
      }
    }
  }

  update(currentTime) {
    this.animFrame++;
    if (this.isInvincible && currentTime > this.invincibleTimer) {
      this.isInvincible = false;
    }
  }

  draw(ctx) {
    // 🔴 기존 게임의 드래곤 + 캐릭터 디자인
    const bobbing = Math.sin(this.animFrame * 0.15) * 2;
    const baseY = this.y + bobbing;

    if (this.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 드래곤 날개 (왼쪽)
    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.ellipse(this.x + 10, baseY + 15, 12, 20, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#CD5C5C";
    ctx.beginPath();
    ctx.ellipse(this.x + 10, baseY + 15, 6, 12, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 드래곤 날개 (오른쪽)
    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.ellipse(this.x + 50, baseY + 15, 12, 20, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#CD5C5C";
    ctx.beginPath();
    ctx.ellipse(this.x + 50, baseY + 15, 6, 12, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 드래곤 몸통
    ctx.fillStyle = "#DC143C";
    ctx.beginPath();
    ctx.ellipse(this.x + 30, baseY + 20, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 드래곤 머리
    ctx.fillStyle = "#B22222";
    ctx.beginPath();
    ctx.ellipse(this.x + 30, baseY + 5, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 드래곤 뿔
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(this.x + 23, baseY);
    ctx.lineTo(this.x + 20, baseY - 8);
    ctx.lineTo(this.x + 26, baseY + 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x + 37, baseY);
    ctx.lineTo(this.x + 40, baseY - 8);
    ctx.lineTo(this.x + 34, baseY + 2);
    ctx.closePath();
    ctx.fill();

    // 눈
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(this.x + 25, baseY + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 35, baseY + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(this.x + 25, baseY + 3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 35, baseY + 3, 1, 0, Math.PI * 2);
    ctx.fill();

    // 캐릭터 몸
    ctx.fillStyle = "#4169E1";
    ctx.fillRect(this.x + 24, baseY + 8, 12, 12);

    // 캐릭터 얼굴
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.arc(this.x + 30, baseY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(this.x + 30, baseY + 3, 5, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.fillRect(this.x + 27, baseY + 5, 2, 2);
    ctx.fillRect(this.x + 31, baseY + 5, 2, 2);

    // 비행 이펙트
    if (this.animFrame % 6 < 3) {
      ctx.fillStyle = "rgba(0, 200, 255, 0.8)";
      ctx.beginPath();
      ctx.moveTo(this.x + 30, baseY + 30);
      ctx.lineTo(this.x + 25, baseY + 40);
      ctx.lineTo(this.x + 35, baseY + 40);
      ctx.closePath();
      ctx.fill();
    }

    // 쉴드 버프 표시
    if (this.buffs.shield.active) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }
}

// ==================== Bullet 클래스 ====================

class Bullet {
  constructor(x, y, fromPlayer, angleOffset = 0) {
    this.x = x;
    this.y = y;
    this.fromPlayer = fromPlayer;
    this.speed = fromPlayer ? CONFIG.bullet.player.speed : CONFIG.bullet.enemy.speed;
    this.damage = fromPlayer ? CONFIG.bullet.player.damage : CONFIG.bullet.enemy.damage;
    this.color = fromPlayer ? CONFIG.bullet.player.color : CONFIG.bullet.enemy.color;
    this.width = 4;
    this.height = 10;
    this.angle = angleOffset;
  }

  update() {
    if (this.fromPlayer) {
      this.y -= this.speed;
      this.x += this.angle * this.speed;
    } else {
      this.y += this.speed;
    }
  }

  draw(ctx) {
    if (this.fromPlayer) {
      // 기존 게임의 플레이어 총알 스타일
      const gradient = ctx.createRadialGradient(this.x + 3, this.y + 10, 0, this.x + 3, this.y + 10, 8);
      gradient.addColorStop(0, "#FFFFFF");
      gradient.addColorStop(0.5, "#00FFFF");
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x + 3, this.y + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
      ctx.fillRect(this.x + 1, this.y + 15, 4, 10);
    } else {
      // 기존 게임의 적 총알 스타일
      const gradient = ctx.createRadialGradient(this.x + 4, this.y + 6, 0, this.x + 4, this.y + 6, 10);
      gradient.addColorStop(0, "#FF0000");
      gradient.addColorStop(0.5, "#8B0000");
      gradient.addColorStop(1, "rgba(139, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x + 4, this.y + 6, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  isOffScreen() {
    return this.y < -20 || this.y > CONFIG.canvas.height + 20 || this.x < -20 || this.x > CONFIG.canvas.width + 20;
  }
}

// ==================== Enemy 클래스 ====================

class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = 30;
    this.height = 30;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.speed = type.speed;
    this.color = type.color;
    this.patternType = ['straight', 'zigzag', 'chase'][randomInt(0, 2)];
    this.shootInterval = 2000;
    this.lastShotTime = Date.now();
    this.frameCount = 0;
  }

  update(playerX, playerY) {
    this.frameCount++;
    switch(this.patternType) {
      case 'straight':
        this.y += this.speed;
        break;
      case 'zigzag':
        this.y += this.speed;
        this.x += Math.sin(this.frameCount / 10) * 2;
        break;
      case 'chase':
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.x += (dx / dist) * this.speed * 0.5;
          this.y += (dy / dist) * this.speed * 0.5;
        }
        break;
    }
  }

  shoot(currentTime) {
    if (this.type.name === 'type1') return null;
    if (currentTime - this.lastShotTime < this.shootInterval) return null;
    this.lastShotTime = currentTime;
    return new Bullet(this.x + this.width/2, this.y + this.height, false);
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    return this.hp <= 0;
  }

  draw(ctx) {
    // 🔴 기존 게임의 적 디자인 유지
    if (this.type.name === 'type1') {
      // 녹색 적
      ctx.fillStyle = "#00FF88";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 15, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#00FFBB";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + 8, this.y + 2);
      ctx.lineTo(this.x + 4, this.y - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x + 22, this.y + 2);
      ctx.lineTo(this.x + 26, this.y - 6);
      ctx.stroke();

      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      ctx.arc(this.x + 4, this.y - 6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + 26, this.y - 6, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.fillRect(this.x + 11, this.y + 8, 2, 4);
      ctx.fillRect(this.x + 17, this.y + 8, 2, 4);

    } else if (this.type.name === 'type2') {
      // 보라색 적
      ctx.fillStyle = "#FF00FF";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 15, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FF66FF";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 8, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#CC00CC";
      ctx.beginPath();
      ctx.moveTo(this.x + 7, this.y + 2);
      ctx.lineTo(this.x + 3, this.y - 6);
      ctx.lineTo(this.x + 11, this.y + 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.x + 23, this.y + 2);
      ctx.lineTo(this.x + 27, this.y - 6);
      ctx.lineTo(this.x + 19, this.y + 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      ctx.arc(this.x + 11, this.y + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + 19, this.y + 8, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(this.x + 11, this.y + 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + 19, this.y + 8, 1.5, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // 금색 적 (type 3)
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(this.x + 8, this.y + 15, 14, 10);

      ctx.fillStyle = "#FFA500";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 8, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(this.x + 15, this.y + 4, 11, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FF0000";
      ctx.fillRect(this.x + 9, this.y + 8, 3, 2);
      ctx.fillRect(this.x + 18, this.y + 8, 3, 2);
    }

    // HP 바
    if (this.hp < this.maxHp) {
      ctx.fillStyle = "#8B0000";
      ctx.fillRect(this.x, this.y - 5, 30, 2);
      ctx.fillStyle = "#00FF00";
      ctx.fillRect(this.x, this.y - 5, 30 * (this.hp / this.maxHp), 2);
    }
  }

  isOffScreen() {
    return this.y > CONFIG.canvas.height + 50;
  }
}

// ==================== Boss 클래스 ====================

class Boss extends Enemy {
  constructor(x, y, stage = 1) {
    const difficulty = 1.0 + (stage - 1) * 0.2;
    const baseHp = CONFIG.boss.hp;
    const hp = Math.floor(baseHp * difficulty);
    
    super(x, y, { 
      name: 'boss', 
      hp: hp,
      speed: 1 * difficulty,
      score: CONFIG.boss.score 
    });
    
    this.stage = stage;
    this.difficulty = difficulty;
    this.shootInterval = Math.max(200, Math.floor(500 / difficulty));
    
    this.width = CONFIG.boss.width;
    this.height = CONFIG.boss.height;
    this.color = '#4B0082';
    this.phase = 'entering';
    this.attackType = 'spread';
    this.patternTimer = Date.now();
    this.patternChangeInterval = CONFIG.boss.patternChangeInterval;
    this.moveDirection = 1;
    this.targetY = 100;
    this.animFrame = 0;
  }

  update(playerX, playerY) {
    this.animFrame++;
    if (this.phase === 'entering') {
      if (this.y < this.targetY) {
        this.y += 2;
      } else {
        this.phase = 'fighting';
      }
      return;
    }

    this.x += this.speed * this.moveDirection;
    if (this.x <= 0 || this.x >= CONFIG.canvas.width - this.width) {
      this.moveDirection *= -1;
    }

    if (Date.now() - this.patternTimer > this.patternChangeInterval) {
      this.changePattern();
    }
  }

  changePattern() {
    const patterns = ['spread', 'rotate', 'homing'];
    this.attackType = patterns[randomInt(0, 2)];
    this.patternTimer = Date.now();
  }

  shoot(currentTime, playerX, playerY) {
    if (this.phase === 'entering') return [];
    if (currentTime - this.lastShotTime < this.shootInterval) return [];
    
    this.lastShotTime = currentTime;
    const bullets = [];

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height;

    switch(this.attackType) {
      case 'spread':
        for (let i = -2; i <= 2; i++) {
          const bullet = new Bullet(centerX, centerY, false);
          bullet.angle = i * 0.3;
          bullets.push(bullet);
        }
        break;

      case 'rotate':
        const rotateAngle = (currentTime / 50) % (Math.PI * 2);
        for (let i = 0; i < 8; i++) {
          const angle = rotateAngle + (i * Math.PI / 4);
          const bullet = new Bullet(centerX, centerY, false);
          bullet.vx = Math.cos(angle) * 3;
          bullet.vy = Math.sin(angle) * 3;
          bullet.update = function() {
            this.x += this.vx;
            this.y += this.vy;
          };
          bullets.push(bullet);
        }
        break;

      case 'homing':
        const dx = playerX - centerX;
        const dy = playerY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const bullet = new Bullet(centerX, centerY, false);
          bullet.vx = (dx / dist) * 5;
          bullet.vy = (dy / dist) * 5;
          bullet.update = function() {
            this.x += this.vx;
            this.y += this.vy;
          };
          bullets.push(bullet);
        }
        break;
    }

    return bullets;
  }

  draw(ctx) {
    // 🔴 기존 게임의 보스 디자인
    const bossY = this.y + Math.sin(this.animFrame * 0.05) * 5;

    ctx.fillStyle = "#4B0082";
    ctx.beginPath();
    ctx.ellipse(this.x + 40, bossY + 40, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6A0DAD";
    ctx.beginPath();
    ctx.ellipse(this.x + 40, bossY + 20, 28, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(this.x + 28, bossY + 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 52, bossY + 20, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(this.x + 28, bossY + 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 52, bossY + 20, 4, 0, Math.PI * 2);
    ctx.fill();

    // HP 바
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x, bossY - 15, 80, 10);

    ctx.fillStyle = "#FF0000";
    ctx.fillRect(this.x, bossY - 15, 80 * (this.hp / this.maxHp), 10);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`BOSS: ${this.hp}/${this.maxHp}`, this.x + 40, bossY - 18);

    // 보스 테두리
    if (this.animFrame % 20 < 10) {
      ctx.strokeStyle = "rgba(138, 43, 226, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x + 40, bossY + 35, 43, 35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ==================== Item 클래스 ====================

class Item {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    const itemType = CONFIG.item.types[randomInt(0, CONFIG.item.types.length - 1)];
    this.type = itemType.name;
    this.color = itemType.color;
    this.duration = itemType.duration;
    this.speed = 2;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    switch(this.type) {
      case 'heal':
        ctx.fillRect(this.x + 7, this.y + 2, 6, 16);
        ctx.fillRect(this.x + 2, this.y + 7, 16, 6);
        break;
      case 'rapid':
        ctx.beginPath();
        ctx.moveTo(this.x + 12, this.y);
        ctx.lineTo(this.x + 8, this.y + 10);
        ctx.lineTo(this.x + 12, this.y + 10);
        ctx.lineTo(this.x + 8, this.y + 20);
        ctx.lineTo(this.x + 14, this.y + 8);
        ctx.lineTo(this.x + 10, this.y + 8);
        ctx.closePath();
        ctx.fill();
        break;
      case 'multi':
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(this.x + 10 + i * 5, this.y);
          ctx.lineTo(this.x + 7 + i * 5, this.y + 15);
          ctx.lineTo(this.x + 13 + i * 5, this.y + 15);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y);
        ctx.quadraticCurveTo(this.x + 20, this.y + 5, this.x + 20, this.y + 15);
        ctx.lineTo(this.x + 10, this.y + 20);
        ctx.lineTo(this.x, this.y + 15);
        ctx.quadraticCurveTo(this.x, this.y + 5, this.x + 10, this.y);
        ctx.fill();
        break;
    }

    ctx.shadowBlur = 0;
  }

  isOffScreen() {
    return this.y > CONFIG.canvas.height + 50;
  }
}

// ==================== GameManager 클래스 ====================

class GameManager {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'start';
    this.score = 0;
    this.highScore = 0;
    this.stage = 1;
    this.currentStage = 1;
    this.lastBossStage = -1;
    this.distance = 0;
    this.bossesDefeated = 0;
    this.difficulty = 1.0;
    
    this.bossActive = false;
    this.bossWarning = false;
    this.bossWarningTimer = 0;

    this.player = new Player(CONFIG.canvas.width / 2 - 20, CONFIG.canvas.height - 80);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.items = [];
    this.particles = [];
    this.boss = null;

    this.keys = {};
    this.lastEnemySpawn = 0;
    this.enemySpawnRate = CONFIG.enemy.spawnRate;

    this.skillGauge = 0;
    this.skillCooldown = 0;
    this.lastSkillUse = 0;

    this.stars = [];
    this.initStars();

    this.screenShake = 0;
    this.shakeIntensity = 0;
    this.animFrame = 0;

    this.setupControls();
    this.gameLoop();
  }

  initStars() {
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.canvas.width,
        y: Math.random() * CONFIG.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1,
        brightness: Math.random()
      });
    }
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'start' || this.state === 'gameOver') {
          this.resetGame();
        }
      }

      if (e.code === 'KeyP' && this.state === 'playing') {
        this.state = 'paused';
      } else if (e.code === 'KeyP' && this.state === 'paused') {
        this.state = 'playing';
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.useSkill();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  resetGame() {
    this.state = 'playing';
    this.score = 0;
    this.stage = 1;
    this.currentStage = 1;
    this.lastBossStage = -1;
    this.distance = 0;
    this.bossesDefeated = 0;
    this.difficulty = 1.0;
    this.player = new Player(CONFIG.canvas.width / 2 - 20, CONFIG.canvas.height - 80);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.items = [];
    this.particles = [];
    this.boss = null;
    this.lastEnemySpawn = 0;
    this.skillGauge = 0;
    this.skillCooldown = 0;
    this.bossWarning = false;
    this.bossWarningTimer = 0;
    this.bossActive = false;
  }

  spawnEnemies(currentTime) {
    if (this.bossActive) return;

    if (currentTime - this.lastEnemySpawn > this.enemySpawnRate / this.difficulty) {
      const typeIndex = randomInt(0, CONFIG.enemy.types.length - 1);
      const enemyType = { ...CONFIG.enemy.types[typeIndex] };

      enemyType.hp = Math.floor(enemyType.hp * this.difficulty);
      enemyType.speed = enemyType.speed * (1 + (this.difficulty - 1) * 0.3);

      const x = randomInt(0, CONFIG.canvas.width - 30);
      this.enemies.push(new Enemy(x, -30, enemyType));
      this.lastEnemySpawn = currentTime;
    }
  }

  spawnBoss() {
    if (this.boss) return;
    
    this.boss = new Boss(
      CONFIG.canvas.width / 2 - CONFIG.boss.width / 2, 
      -150, 
      this.currentStage
    );
    
    this.boss.targetY = 100;
    this.boss.phase = 'entering';
    this.enemies = [];
    this.enemyBullets = [];
    this.bossActive = true;
  }

  checkCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      let hit = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (circleCollision(bullet, enemy)) {
          if (enemy.takeDamage(bullet.damage)) {
            this.score += enemy.type.score * this.stage;
            this.skillGauge = Math.min(100, this.skillGauge + CONFIG.skill.chargePerKill);
            this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
            this.enemies.splice(j, 1);

            const dropChance = 0.15 + (this.currentStage - 1) * 0.02;
            if (Math.random() < dropChance) {
              this.items.push(new Item(enemy.x, enemy.y));
            }
          }
          hit = true;
          break;
        }
      }

      if (this.boss && circleCollision(bullet, this.boss)) {
        if (this.boss.takeDamage(bullet.damage)) {
          this.score += this.boss.type.score * this.stage;
          this.createExplosion(this.boss.x + this.boss.width/2, this.boss.y + this.boss.height/2, this.boss.color);
          this.screenShake = 30;
          this.shakeIntensity = 10;
          this.boss = null;
          this.bossActive = false;
          this.nextStage();
        }
        hit = true;
      }

      if (hit) {
        this.bullets.splice(i, 1);
      }
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      if (circleCollision(bullet, this.player)) {
        if (this.player.takeDamage(bullet.damage)) {
          this.gameOver();
        } else {
          this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#FF6666');
        }
        this.enemyBullets.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (circleCollision(this.player, enemy)) {
        if (this.player.takeDamage(20)) {
          this.gameOver();
        } else {
          this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
        }
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (circleCollision(this.player, item)) {
        this.player.applyItem(item, this.currentStage);
        this.createExplosion(item.x, item.y, item.color);
        this.items.splice(i, 1);
      }
    }

    if (this.boss && circleCollision(this.player, this.boss)) {
      if (this.player.takeDamage(30)) {
        this.gameOver();
      }
    }
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y, color, randomInt(2, 5)));
    }
  }

  nextStage() {
    this.stage++;
    this.bossesDefeated++;
    this.difficulty += 0.1;
    this.enemySpawnRate = Math.max(500, CONFIG.enemy.spawnRate - (this.stage * 100));
    this.player.updateBuffs(this.currentStage);
  }

  useSkill() {
    const currentTime = Date.now();
    if (this.state !== 'playing') return;
    if (this.skillGauge < 100) return;
    if (currentTime - this.lastSkillUse < CONFIG.skill.cooldown) return;

    this.skillGauge = 0;
    this.lastSkillUse = currentTime;

    this.enemies.forEach(enemy => {
      this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
    });
    this.enemies = [];

    this.enemyBullets.forEach(bullet => {
      this.createExplosion(bullet.x, bullet.y, bullet.color);
    });
    this.enemyBullets = [];

    if (this.boss) {
      this.boss.takeDamage(100);
      if (this.boss.hp <= 0) {
        this.score += this.boss.type.score * this.stage;
        this.createExplosion(this.boss.x + this.boss.width/2, this.boss.y + this.boss.height/2, this.boss.color);
        this.screenShake = 30;
        this.shakeIntensity = 10;
        this.boss = null;
        this.bossActive = false;
        this.nextStage();
      }
    }

    this.screenShake = 20;
    this.shakeIntensity = 5;

    for (let i = 0; i < 100; i++) {
      this.particles.push(new Particle(
        randomInt(0, CONFIG.canvas.width),
        randomInt(0, CONFIG.canvas.height),
        '#FFFF00',
        randomInt(3, 8)
      ));
    }
  }

  gameOver() {
    this.state = 'gameOver';
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  update() {
    if (this.state !== 'playing') return;

    const currentTime = Date.now();
    this.animFrame++;

    if (!this.bossActive) {
      this.distance += 0.5;
    }

    this.player.move(this.keys);
    this.player.update(currentTime);

    if (this.keys.Space) {
      const newBullets = this.player.shoot(currentTime);
      this.bullets.push(...newBullets);
    }

    this.spawnEnemies(currentTime);

    const currentBossStage = Math.floor(this.distance / 1000);
    if (currentBossStage > this.lastBossStage && !this.boss && currentBossStage > 0) {
      this.spawnBoss();
      this.lastBossStage = currentBossStage;
      this.currentStage = currentBossStage + 1;
      this.enemies = [];
      this.enemyBullets = [];

      this.bossWarning = true;
      this.bossWarningTimer = currentTime + 2000;
    }

    if (this.bossWarning && currentTime > this.bossWarningTimer) {
      this.bossWarning = false;
    }

    this.stars.forEach(star => {
      star.brightness += (Math.random() - 0.5) * 0.1;
      star.brightness = Math.max(0.3, Math.min(1, star.brightness));

      if (!this.state === 'gameOver') {
        star.y += star.speed;
        if (star.y > CONFIG.canvas.height) {
          star.y = 0;
          star.x = Math.random() * CONFIG.canvas.width;
        }
      }
    });

    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      return !bullet.isOffScreen();
    });

    this.enemyBullets = this.enemyBullets.filter(bullet => {
      bullet.update();
      return !bullet.isOffScreen();
    });

    this.enemies = this.enemies.filter(enemy => {
      enemy.update(this.player.x, this.player.y);

      const bullet = enemy.shoot(currentTime);
      if (bullet) {
        this.enemyBullets.push(bullet);
      }

      return !enemy.isOffScreen();
    });

    if (this.boss) {
      this.boss.update(this.player.x, this.player.y);
      const bossBullets = this.boss.shoot(currentTime, this.player.x + this.player.width/2, this.player.y + this.player.height/2);
      this.enemyBullets.push(...bossBullets);
    }

    this.items = this.items.filter(item => {
      item.update();
      return !item.isOffScreen();
    });

    this.particles = this.particles.filter(particle => {
      particle.update();
      return !particle.isDead();
    });

    this.checkCollisions();

    if (this.screenShake > 0) {
      this.screenShake--;
    }

    if (currentTime - this.lastSkillUse < CONFIG.skill.cooldown) {
      this.skillCooldown = Math.floor((CONFIG.skill.cooldown - (currentTime - this.lastSkillUse)) / 1000);
    } else {
      this.skillCooldown = 0;
    }
  }

  draw() {
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);

    // 🔴 기존 게임의 배경 스타일
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    const nebula = this.ctx.createRadialGradient(
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height / 3,
      0,
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height / 3,
      CONFIG.canvas.width
    );
    nebula.addColorStop(0, "rgba(138, 43, 226, 0.05)");
    nebula.addColorStop(0.5, "rgba(75, 0, 130, 0.03)");
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.ctx.fillStyle = nebula;
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // 별 그리기
    this.stars.forEach(star => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.particles.forEach(particle => particle.draw(this.ctx));

    this.player.draw(this.ctx);
    this.bullets.forEach(bullet => bullet.draw(this.ctx));
    this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));
    this.enemies.forEach(enemy => enemy.draw(this.ctx));
    this.items.forEach(item => item.draw(this.ctx));

    if (this.boss) {
      this.boss.draw(this.ctx);
    }

    if (this.bossWarning) {
      this.drawBossWarning();
    }

    this.ctx.restore();

    this.drawUI();

    if (this.state === 'start') {
      this.drawStartScreen();
    } else if (this.state === 'paused') {
      this.drawPausedScreen();
    } else if (this.state === 'gameOver') {
      this.drawGameOverScreen();
    }
  }

  drawUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('stage').textContent = this.currentStage;
    document.getElementById('distance').textContent = Math.floor(this.distance);
    document.getElementById('bosses').textContent = this.bossesDefeated;
    document.getElementById('hp').textContent = this.player.hp;
    document.getElementById('maxHp').textContent = this.player.maxHp;
    document.getElementById('skill').textContent = Math.floor(this.skillGauge);

    const buffsDiv = document.getElementById('buffs');
    buffsDiv.innerHTML = '';
    
    if (this.player.buffs.rapid.active) {
      const icon = document.createElement('span');
      icon.className = 'buff-icon';
      icon.textContent = 'R';
      icon.style.backgroundColor = '#0099FF';
      icon.title = `Rapid: Until Stage ${this.player.buffs.rapid.endStage}`;
      buffsDiv.appendChild(icon);
    }
    
    if (this.player.buffs.multi.active) {
      const icon = document.createElement('span');
      icon.className = 'buff-icon';
      icon.textContent = 'M';
      icon.style.backgroundColor = '#FF9900';
      icon.title = `Multi: Until Stage ${this.player.buffs.multi.endStage}`;
      buffsDiv.appendChild(icon);
    }
    
    if (this.player.buffs.shield.active) {
      const icon = document.createElement('span');
      icon.className = 'buff-icon';
      icon.textContent = 'S';
      icon.style.backgroundColor = '#FFFF00';
      icon.title = `Shield: ${Math.ceil(this.player.buffs.shield.duration / 1000)}s`;
      buffsDiv.appendChild(icon);
    }

    if (this.skillCooldown > 0) {
      const cooldownText = document.createElement('div');
      cooldownText.textContent = `Cooldown: ${this.skillCooldown}s`;
      cooldownText.style.color = '#FF6666';
      buffsDiv.appendChild(cooldownText);
    }
  }

  drawStartScreen() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#00FFFF';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('SPACE DRAGON SHOOTER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 50);
    this.ctx.font = '24px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('Press SPACE to Start', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 20);
    this.ctx.font = '16px Arial';
    this.ctx.fillText('Arrow Keys: Move | Space: Shoot | Shift: Bomb Skill', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 60);
    this.ctx.shadowBlur = 0;
  }

  drawPausedScreen() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#FFFF00';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('PAUSED', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
    this.ctx.font = '24px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('Press P to Resume', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 50);
    this.ctx.shadowBlur = 0;
  }

  drawBossWarning() {
    const time = Date.now();
    const flash = Math.floor(time / 200) % 2 === 0;
    if (flash) {
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 10;
      this.ctx.strokeRect(5, 5, CONFIG.canvas.width - 10, CONFIG.canvas.height - 10);

      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#FF0000';
      this.ctx.shadowBlur = 30;
      this.ctx.fillText('STAGE ' + this.currentStage + ' BOSS!', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
      this.ctx.font = '24px Arial';
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillText('WARNING! INCOMING!', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 50);
      this.ctx.shadowBlur = 0;
    }
  }

  drawGameOverScreen() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 50);
    this.ctx.font = '24px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(`Final Stage: ${this.currentStage}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 20);
    this.ctx.fillText(`Score: ${this.score}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 50);
    this.ctx.fillText(`Bosses Defeated: ${this.bossesDefeated}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 80);
    this.ctx.fillText(`High Score: ${this.highScore}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 110);
    this.ctx.fillText('Press SPACE to Restart', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 150);
    this.ctx.shadowBlur = 0;
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ==================== 게임 시작 ====================

window.addEventListener('load', () => {
  new GameManager();
});
