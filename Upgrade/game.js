const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 상태
let playerX = canvas.width / 2 - 30;
let playerY = 500;
let bullets = [];
let enemyRows = [];
let particles = [];
let explosions = [];
let stars = [];
let planets = [];
let boss = null;
let frames = 0;
let distance = 0;
let bossesDefeated = 0;
let gameSpeed = 2;
let animFrame = 0;
let gameOver = false;
let scrollOffset = 0;

// 적 생성 관련
const ENEMY_SIZE = 40;
const ENEMIES_PER_ROW = 8;
const ROW_SPACING = 100;

// 별 초기화
for (let i = 0; i < 150; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1,
        brightness: Math.random()
    });
}

// 행성 초기화
function createPlanet() {
    const types = [
        { color1: '#FF6B6B', color2: '#C92A2A', hasRing: false },
        { color1: '#4DABF7', color2: '#1971C2', hasRing: false },
        { color1: '#FAB005', color2: '#F08C00', hasRing: true },
        { color1: '#BE4BDB', color2: '#862E9C', hasRing: false },
        { color1: '#20C997', color2: '#087F5B', hasRing: false },
        { color1: '#FF922B', color2: '#D9480F', hasRing: true },
        { color1: '#E599F7', color2: '#AE3EC9', hasRing: false },
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const size = Math.random() * 80 + 40;
    
    return {
        x: Math.random() * (canvas.width + 200) - 100,
        y: -size - 50,
        size: size,
        speed: Math.random() * 0.8 + 0.3,
        type: type,
        rotation: Math.random() * Math.PI * 2
    };
}

for (let i = 0; i < 3; i++) {
    const planet = createPlanet();
    planet.y = Math.random() * canvas.height;
    planets.push(planet);
}

// 게임 재시작 함수
function restartGame() {
    playerX = canvas.width / 2 - 30;
    playerY = 500;
    bullets = [];
    enemyRows = [];
    particles = [];
    explosions = [];
    boss = null;
    frames = 0;
    distance = 0;
    bossesDefeated = 0;
    gameSpeed = 2;
    animFrame = 0;
    gameOver = false;
    scrollOffset = 0;
    
    // 적 줄 재생성
    for (let i = 0; i < 6; i++) {
        enemyRows.push(createEnemyRow(-i * ROW_SPACING - 100));
    }
    
    gameLoop();
}

// 키 입력
const keys = {};
document.addEventListener('keydown', function(e) {
    keys[e.key] = true;
    
    // 게임 오버 상태에서 스페이스바로 재시작
    if (gameOver && e.key === " ") {
        restartGame();
        return;
    }
    
    if (e.key === " " && !keys.spacePressed && !gameOver) {
        bullets.push({ 
            x: playerX + 27, 
            y: playerY,
            width: 6,
            height: 20
        });
        keys.spacePressed = true;
    }
});

document.addEventListener('keyup', function(e) {
    keys[e.key] = false;
    if (e.key === " ") keys.spacePressed = false;
});

// 적 줄 생성
function createEnemyRow(y) {
    const row = [];
    const enemyWidth = canvas.width / ENEMIES_PER_ROW;
    
    for (let i = 0; i < ENEMIES_PER_ROW; i++) {
        if (Math.random() > 0.15) {
            const type = Math.random() < 0.6 ? 1 : (Math.random() < 0.8 ? 2 : 3);
            row.push({
                x: i * enemyWidth + (enemyWidth - ENEMY_SIZE) / 2,
                y: y,
                type: type,
                hp: type === 3 ? 2 : 1,
                maxHp: type === 3 ? 2 : 1,
                destroyed: false
            });
        }
    }
    
    return row;
}

for (let i = 0; i < 6; i++) {
    enemyRows.push(createEnemyRow(-i * ROW_SPACING - 100));
}

// 보스 생성
function createBoss() {
    return {
        x: canvas.width / 2 - 60,
        y: -150,
        hp: 30,
        maxHp: 30,
        direction: 1,
        phase: 'entering',
        targetY: 100
    };
}

// 파티클 생성
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 25,
            color: color,
            size: Math.random() * 3 + 2
        });
    }
}

// 대폭발 이펙트 생성
function createExplosion(x, y) {
    const explosion = {
        x: x,
        y: y,
        radius: 0,
        maxRadius: 150,
        particles: [],
        shockwaves: [],
        flashes: [],
        life: 60,
        maxLife: 60
    };

    for (let i = 0; i < 80; i++) {
        const angle = (Math.PI * 2 * i) / 80;
        const speed = Math.random() * 8 + 4;
        explosion.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 6 + 3,
            color: ['#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFFFF'][Math.floor(Math.random() * 5)],
            life: Math.random() * 40 + 20
        });
    }

    for (let i = 0; i < 3; i++) {
        explosion.shockwaves.push({
            radius: 0,
            maxRadius: 200 + i * 50,
            speed: 8 - i * 2,
            opacity: 1
        });
    }

    for (let i = 0; i < 5; i++) {
        explosion.flashes.push({
            opacity: 1,
            delay: i * 3
        });
    }

    explosions.push(explosion);

    for (let i = 0; i < 50; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 40,
            color: ['#FF0000', '#FF6600', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 4)],
            size: Math.random() * 8 + 4
        });
    }
}

// 폭발 그리기
function drawExplosions() {
    explosions.forEach((exp, index) => {
        exp.life--;
        exp.radius = Math.min(exp.radius + 5, exp.maxRadius);

        exp.flashes.forEach((flash, fi) => {
            if (exp.maxLife - exp.life > flash.delay) {
                flash.opacity -= 0.05;
                if (flash.opacity > 0) {
                    const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, 80 - fi * 15);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${flash.opacity})`);
                    gradient.addColorStop(0.3, `rgba(255, 200, 0, ${flash.opacity * 0.8})`);
                    gradient.addColorStop(0.6, `rgba(255, 100, 0, ${flash.opacity * 0.5})`);
                    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(exp.x, exp.y, 80 - fi * 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        exp.shockwaves.forEach(wave => {
            wave.radius += wave.speed;
            wave.opacity -= 0.02;

            if (wave.opacity > 0 && wave.radius < wave.maxRadius) {
                ctx.strokeStyle = `rgba(255, 150, 0, ${wave.opacity})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, wave.radius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(255, 255, 255, ${wave.opacity * 0.5})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, wave.radius + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        exp.particles.forEach((p, pi) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life--;

            if (p.life > 0) {
                ctx.globalAlpha = p.life / 40;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = `${p.color}88`;
                ctx.beginPath();
                ctx.arc(p.x - p.vx, p.y - p.vy, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                exp.particles.splice(pi, 1);
            }
        });

        ctx.globalAlpha = 1;

        if (exp.life <= 0) {
            explosions.splice(index, 1);
        }
    });
}

// 별 그리기
function drawStars() {
    stars.forEach(star => {
        star.brightness += (Math.random() - 0.5) * 0.1;
        star.brightness = Math.max(0.3, Math.min(1, star.brightness));
        
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 게임 오버 시 별 멈춤
        if (!gameOver) {
            star.y += star.speed + gameSpeed * 0.3;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        }
    });
}

// 행성 그리기
function drawPlanets() {
    planets.forEach((planet, index) => {
        ctx.save();
        ctx.translate(planet.x + planet.size / 2, planet.y + planet.size / 2);
        
        const gradient = ctx.createRadialGradient(
            -planet.size * 0.2, -planet.size * 0.2, planet.size * 0.1,
            0, 0, planet.size / 2
        );
        gradient.addColorStop(0, planet.type.color1);
        gradient.addColorStop(1, planet.type.color2);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, planet.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = planet.type.color2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
                Math.sin(planet.rotation + i) * planet.size * 0.2,
                Math.cos(planet.rotation + i * 2) * planet.size * 0.15,
                planet.size * 0.3,
                planet.size * 0.15,
                planet.rotation + i,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = `${planet.type.color1}88`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, planet.size / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();
        
        if (planet.type.hasRing) {
            ctx.strokeStyle = `${planet.type.color1}66`;
            ctx.lineWidth = planet.size * 0.15;
            ctx.beginPath();
            ctx.ellipse(0, 0, planet.size * 0.8, planet.size * 0.3, Math.PI / 6, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = `${planet.type.color2}88`;
            ctx.lineWidth = planet.size * 0.08;
            ctx.beginPath();
            ctx.ellipse(0, 0, planet.size * 0.8, planet.size * 0.3, Math.PI / 6, Math.PI * 0.4, Math.PI * 0.6);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // 게임 오버 시 행성 멈춤
        if (!gameOver) {
            planet.y += planet.speed + gameSpeed * 0.4;
            planet.rotation += 0.005;
            
            if (planet.y > canvas.height + planet.size) {
                planets[index] = createPlanet();
            }
        }
    });
}

// 드래곤 + 캐릭터 그리기
function drawPlayer() {
    const bobbing = Math.sin(animFrame * 0.15) * 2;
    const baseY = playerY + bobbing;

    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.ellipse(playerX + 10, baseY + 15, 12, 20, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#CD5C5C";
    ctx.beginPath();
    ctx.ellipse(playerX + 10, baseY + 15, 6, 12, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.ellipse(playerX + 50, baseY + 15, 12, 20, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#CD5C5C";
    ctx.beginPath();
    ctx.ellipse(playerX + 50, baseY + 15, 6, 12, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#DC143C";
    ctx.beginPath();
    ctx.ellipse(playerX + 30, baseY + 20, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#B22222";
    ctx.beginPath();
    ctx.ellipse(playerX + 30, baseY + 5, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(playerX + 23, baseY);
    ctx.lineTo(playerX + 20, baseY - 8);
    ctx.lineTo(playerX + 26, baseY + 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(playerX + 37, baseY);
    ctx.lineTo(playerX + 40, baseY - 8);
    ctx.lineTo(playerX + 34, baseY + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(playerX + 25, baseY + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(playerX + 35, baseY + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(playerX + 25, baseY + 3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(playerX + 35, baseY + 3, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4169E1";
    ctx.fillRect(playerX + 24, baseY + 8, 12, 12);
    
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.arc(playerX + 30, baseY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(playerX + 30, baseY + 3, 5, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.fillRect(playerX + 27, baseY + 5, 2, 2);
    ctx.fillRect(playerX + 31, baseY + 5, 2, 2);

    if (frames % 6 < 3) {
        ctx.fillStyle = "rgba(0, 200, 255, 0.8)";
        ctx.beginPath();
        ctx.moveTo(playerX + 30, baseY + 30);
        ctx.lineTo(playerX + 25, baseY + 40);
        ctx.lineTo(playerX + 35, baseY + 40);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.moveTo(playerX + 30, baseY + 30);
        ctx.lineTo(playerX + 27, baseY + 36);
        ctx.lineTo(playerX + 33, baseY + 36);
        ctx.closePath();
        ctx.fill();
    }
}

// 보스 그리기
function drawBoss(boss) {
    const bossY = boss.y + Math.sin(animFrame * 0.05) * 5;

    ctx.fillStyle = "#4B0082";
    ctx.beginPath();
    ctx.ellipse(boss.x + 60, bossY + 50, 50, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6A0DAD";
    ctx.beginPath();
    ctx.ellipse(boss.x + 60, bossY + 25, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(boss.x + 45, bossY + 25, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(boss.x + 75, bossY + 25, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(boss.x + 45, bossY + 25, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(boss.x + 75, bossY + 25, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.fillRect(boss.x, bossY - 20, 120, 12);
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(boss.x, bossY - 20, 120 * (boss.hp / boss.maxHp), 12);
    
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`BOSS: ${boss.hp}/${boss.maxHp}`, boss.x + 60, bossY - 25);

    if (frames % 20 < 10) {
        ctx.strokeStyle = "rgba(138, 43, 226, 0.5)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(boss.x + 60, bossY + 40, 55, 45, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 적 그리기
function drawEnemy(enemy) {
    if (enemy.destroyed) return;

    if (enemy.type === 1) {
        ctx.fillStyle = "#00FF88";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 25, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#00FFBB";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00FF88";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(enemy.x + 12, enemy.y + 5);
        ctx.lineTo(enemy.x + 8, enemy.y - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(enemy.x + 28, enemy.y + 5);
        ctx.lineTo(enemy.x + 32, enemy.y - 8);
        ctx.stroke();

        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        ctx.arc(enemy.x + 8, enemy.y - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 32, enemy.y - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.fillRect(enemy.x + 14, enemy.y + 12, 3, 5);
        ctx.fillRect(enemy.x + 23, enemy.y + 12, 3, 5);

    } else if (enemy.type === 2) {
        ctx.fillStyle = "#FF00FF";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 25, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FF66FF";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 12, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#CC00CC";
        ctx.beginPath();
        ctx.moveTo(enemy.x + 10, enemy.y + 5);
        ctx.lineTo(enemy.x + 6, enemy.y - 8);
        ctx.lineTo(enemy.x + 14, enemy.y + 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(enemy.x + 30, enemy.y + 5);
        ctx.lineTo(enemy.x + 34, enemy.y - 8);
        ctx.lineTo(enemy.x + 26, enemy.y + 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        ctx.arc(enemy.x + 14, enemy.y + 12, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 26, enemy.y + 12, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(enemy.x + 14, enemy.y + 12, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 26, enemy.y + 12, 2, 0, Math.PI * 2);
        ctx.fill();

    } else {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(enemy.x + 10, enemy.y + 20, 20, 15);
        
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 12, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(enemy.x + 20, enemy.y + 8, 14, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FF0000";
        ctx.fillRect(enemy.x + 12, enemy.y + 12, 4, 3);
        ctx.fillRect(enemy.x + 24, enemy.y + 12, 4, 3);

        if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = "#8B0000";
            ctx.fillRect(enemy.x + 5, enemy.y - 5, 30, 3);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(enemy.x + 5, enemy.y - 5, 30 * (enemy.hp / enemy.maxHp), 3);
        }
    }
}

// 총알 그리기
function drawBullet(bullet) {
    const gradient = ctx.createRadialGradient(bullet.x + 3, bullet.y + 10, 0, bullet.x + 3, bullet.y + 10, 8);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(0.5, "#00FFFF");
    gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bullet.x + 3, bullet.y + 10, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
    ctx.fillRect(bullet.x + 1, bullet.y + 15, 4, 10);
}

// 파티클 그리기
function drawParticles() {
    particles.forEach((p, i) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 25;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        if (!gameOver) p.y += gameSpeed;
        p.life--;
        
        if (p.life <= 0) particles.splice(i, 1);
    });
    ctx.globalAlpha = 1;
}

// 게임 오버 화면 그리기
function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#FF0000";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.fillStyle = "#00FFFF";
    ctx.font = "28px Arial";
    ctx.fillText(`Distance: ${distance}m`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Bosses Defeated: ${bossesDefeated}`, canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#FFD700";
    // 깜빡이는 효과
    if (Math.floor(frames / 30) % 2 === 0) {
        ctx.fillText("Press SPACE to Restart", canvas.width / 2, canvas.height / 2 + 90);
    }
}

// 게임 루프
function gameLoop() {
    animFrame++;
    frames++;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const nebula = ctx.createRadialGradient(
        canvas.width / 2, 
        canvas.height / 3, 
        0, 
        canvas.width / 2, 
        canvas.height / 3, 
        canvas.width
    );
    nebula.addColorStop(0, "rgba(138, 43, 226, 0.05)");
    nebula.addColorStop(0.5, "rgba(75, 0, 130, 0.03)");
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStars();
    drawPlanets();
    drawExplosions();

    if (!gameOver) {
        scrollOffset += gameSpeed;
        distance = Math.floor(scrollOffset / 10);

        gameSpeed = 2 + Math.floor(distance / 200) * 0.5;

        if (distance > 0 && distance % 500 === 0 && !boss && frames % 60 === 0) {
            boss = createBoss();
            enemyRows = [];
        }

        if (frames % 200 === 0 && planets.length < 5) {
            planets.push(createPlanet());
        }

        if (keys["ArrowLeft"] && playerX > 0) playerX -= 6;
        if (keys["ArrowRight"] && playerX < canvas.width - 60) playerX += 6;

        if (boss) {
            if (boss.phase === 'entering') {
                boss.y += 2;
                if (boss.y >= boss.targetY) {
                    boss.phase = 'fighting';
                }
            } else if (boss.phase === 'fighting') {
                boss.x += boss.direction * 3;
                if (boss.x <= 0 || boss.x >= canvas.width - 120) boss.direction *= -1;

                if (frames % 25 === 0) {
                    bullets.push({ x: boss.x + 35, y: boss.y + 80, width: 8, height: 12, enemy: true });
                    bullets.push({ x: boss.x + 85, y: boss.y + 80, width: 8, height: 12, enemy: true });
                }
            }

            drawBoss(boss);

            bullets.forEach((b, bi) => {
                if (!b.enemy && b.x < boss.x + 120 && b.x + b.width > boss.x && 
                    b.y < boss.y + 90 && b.y + b.height > boss.y) {
                    boss.hp--;
                    bullets.splice(bi, 1);
                    createParticles(b.x, b.y, "#8B00FF", 8);
                    
                    if (boss.hp <= 0) {
                        createExplosion(boss.x + 60, boss.y + 50);
                        bossesDefeated++;
                        boss = null;
                    }
                }
            });
        }

        if (!boss) {
            enemyRows.forEach((row, rowIndex) => {
                row.forEach((enemy, enemyIndex) => {
                    if (!enemy.destroyed) {
                        enemy.y += gameSpeed;
                        drawEnemy(enemy);

                        if (enemy.y + ENEMY_SIZE > playerY && 
                            enemy.y < playerY + 40 &&
                            enemy.x < playerX + 60 && 
                            enemy.x + ENEMY_SIZE > playerX) {
                            gameOver = true;
                            createParticles(playerX + 30, playerY + 20, "#DC143C", 40);
                        }

                        bullets.forEach((bullet, bi) => {
                            if (!bullet.enemy && bullet.x > enemy.x && bullet.x < enemy.x + ENEMY_SIZE &&
                                bullet.y > enemy.y && bullet.y < enemy.y + ENEMY_SIZE) {
                                enemy.hp--;
                                bullets.splice(bi, 1);
                                
                                if (enemy.hp <= 0) {
                                    enemy.destroyed = true;
                                    const colors = ["#00FF88", "#FF00FF", "#FFD700"];
                                    createParticles(enemy.x + 20, enemy.y + 20, colors[enemy.type - 1], 15);
                                }
                            }
                        });
                    }
                });

                if (row.length > 0 && row[0].y > canvas.height + 50) {
                    enemyRows.splice(rowIndex, 1);
                }
            });

            if (enemyRows.length < 8) {
                const lastRow = enemyRows[enemyRows.length - 1];
                const lastY = lastRow && lastRow[0] ? lastRow[0].y : 0;
                
                if (lastY > -ROW_SPACING + 50 || enemyRows.length === 0) {
                    enemyRows.push(createEnemyRow(-ROW_SPACING));
                }
            }
        }

        bullets.forEach((bullet, i) => {
            if (!bullet.enemy) {
                bullet.y -= 12;
                drawBullet(bullet);
                if (bullet.y < -20) bullets.splice(i, 1);
            } else {
                bullet.y += 8;
                const gradient = ctx.createRadialGradient(bullet.x + 4, bullet.y + 6, 0, bullet.x + 4, bullet.y + 6, 10);
                gradient.addColorStop(0, "#FF0000");
                gradient.addColorStop(0.5, "#8B0000");
                gradient.addColorStop(1, "rgba(139, 0, 0, 0)");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(bullet.x + 4, bullet.y + 6, 8, 0, Math.PI * 2);
                ctx.fill();
                
                if (bullet.x < playerX + 60 && bullet.x + bullet.width > playerX && 
                    bullet.y < playerY + 40 && bullet.y + bullet.height > playerY) {
                    bullets.splice(i, 1);
                    gameOver = true;
                    createParticles(bullet.x, bullet.y, "#ff0000", 20);
                }
                
                if (bullet.y > canvas.height) bullets.splice(i, 1);
            }
        });
    } else {
        // 게임 오버 상태에서도 적과 보스 그리기
        if (boss) drawBoss(boss);
        enemyRows.forEach(row => {
            row.forEach(enemy => {
                if (!enemy.destroyed) drawEnemy(enemy);
            });
        });
        
        bullets.forEach(bullet => {
            if (!bullet.enemy) {
                drawBullet(bullet);
            }
        });
    }

    drawParticles();
    drawPlayer();

    // 게임 오버 화면 표시
    if (gameOver) {
        drawGameOver();
    }

    document.getElementById('distance').textContent = distance;
    document.getElementById('speed').textContent = (gameSpeed / 2).toFixed(1);
    document.getElementById('bosses').textContent = bossesDefeated;

    requestAnimationFrame(gameLoop);
}

gameLoop();