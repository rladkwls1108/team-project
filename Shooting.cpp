#include <iostream>
#include <windows.h>
#include <conio.h>
#include <vector>
#include <ctime>
#include <algorithm>

using namespace std;

const int WIDTH = 50;
const int HEIGHT = 20;

struct GameObject {
    int x, y;
};

void gotoxy(int x, int y) {
    COORD coord;
    coord.X = x;
    coord.Y = y;
    SetConsoleCursorPosition(GetStdHandle(STD_OUTPUT_HANDLE), coord);
}

void hideCursor() {
    CONSOLE_CURSOR_INFO cursorInfo;
    GetConsoleCursorInfo(GetStdHandle(STD_OUTPUT_HANDLE), &cursorInfo);
    cursorInfo.bVisible = false;
    SetConsoleCursorInfo(GetStdHandle(STD_OUTPUT_HANDLE), &cursorInfo);
}

int main() {
    srand(time(0));
    hideCursor();
    
    // 플레이어 (왼쪽에 고정)
    GameObject player = {5, HEIGHT / 2};
    
    // 적들 (오른쪽에서 등장)
    vector<GameObject> enemies;
    for (int i = 0; i < 3; i++) {
        enemies.push_back({WIDTH + rand() % 20, rand() % HEIGHT});
    }
    
    // 총알 (오른쪽으로 발사)
    vector<GameObject> bullets;
    
    int frameCount = 0;
    bool running = true;
    
    while (running) {
        // 입력 처리
        if (_kbhit()) {
            char key = _getch();
            if (key == 'w' && player.y > 0) player.y--;
            if (key == 's' && player.y < HEIGHT - 1) player.y++;
            if (key == ' ') bullets.push_back({player.x + 2, player.y});
            if (key == 27) running = false; // ESC
        }
        
        // 게임 로직
        if (frameCount % 2 == 0) {
            // 총알 이동 (오른쪽으로)
            for (auto& bullet : bullets) {
                bullet.x++;
            }
            
            // 화면 밖 총알 제거
            bullets.erase(
                remove_if(bullets.begin(), bullets.end(),
                    [](const GameObject& b) { return b.x >= WIDTH; }),
                bullets.end()
            );
            
            // 적 이동 (왼쪽으로)
            for (auto& enemy : enemies) {
                enemy.x--;
                if (enemy.x < 0) {
                    enemy.x = WIDTH + rand() % 20;
                    enemy.y = rand() % HEIGHT;
                }
            }
            
            // 충돌 체크
            for (auto bulletIt = bullets.begin(); bulletIt != bullets.end(); ) {
                bool hit = false;
                for (auto& enemy : enemies) {
                    if (abs(bulletIt->x - enemy.x) <= 1 && 
                        abs(bulletIt->y - enemy.y) <= 0) {
                        enemy.x = WIDTH + rand() % 20;
                        enemy.y = rand() % HEIGHT;
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    bulletIt = bullets.erase(bulletIt);
                } else {
                    ++bulletIt;
                }
            }
        }
        
        // 화면 그리기
        system("cls");
        
        // 테두리
        for (int i = 0; i < WIDTH + 2; i++) {
            cout << "=";
        }
        cout << endl;
        
        for (int y = 0; y < HEIGHT; y++) {
            cout << "|";
            for (int x = 0; x < WIDTH; x++) {
                bool drawn = false;
                
                // 플레이어 (드래곤 모양 - 매우 간단)
                if (x == player.x && y == player.y) {
                    cout << ">";
                    drawn = true;
                } else if (x == player.x - 1 && y == player.y) {
                    cout << "=";
                    drawn = true;
                }
                
                // 총알
                if (!drawn) {
                    for (const auto& bullet : bullets) {
                        if (x == bullet.x && y == bullet.y) {
                            cout << "-";
                            drawn = true;
                            break;
                        }
                    }
                }
                
                // 적 (간단한 모양)
                if (!drawn) {
                    for (const auto& enemy : enemies) {
                        if (x == enemy.x && y == enemy.y) {
                            cout << "<";
                            drawn = true;
                            break;
                        }
                    }
                }
                
                if (!drawn) cout << " ";
            }
            cout << "|" << endl;
        }
        
        for (int i = 0; i < WIDTH + 2; i++) {
            cout << "=";
        }
        cout << endl;
        
        cout << "Controls: W/S - Move Up/Down, SPACE - Shoot, ESC - Quit" << endl;
        
        frameCount++;
        Sleep(50);
    }
    
    return 0;
}