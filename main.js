// HTMLからcanvas要素を取得
const canvas = document.getElementById('whiteboard');
// 2D描画コンテキストを取得
const context = canvas.getContext('2d');

// 線の色や太さを設定
context.strokeStyle = 'black'; 
context.lineWidth = 3;       
context.lineJoin = 'round';  
context.lineCap = 'round';   

// 描画中かどうかを判定するフラグ
let isDrawing = false;
// 最後に描画した座標を保存する変数
let lastX = 0;
let lastY = 0;

// 描画処理の関数
function draw(e) {
    // isDrawingがfalseなら何もしない
    if (!isDrawing) return;

    // 現在のマウスの座標を取得
    const currentX = e.offsetX;
    const currentY = e.offsetY;

    // 描画処理
    context.beginPath();       // 新しいパス（線）を開始
    context.moveTo(lastX, lastY); // パスの開始位置を前の座標に設定
    context.lineTo(currentX, currentY); // 現在の座標まで線を引く
    context.stroke();          // 線をキャンバスに描画

    // 座標を更新
    [lastX, lastY] = [currentX, currentY];
}

// --- イベントリスナーの設定 ---

// マウスのボタンが押された時
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    // 現在の座標を保存
    [lastX, lastY] = [e.offsetX, e.offsetY];
});

// マウスが動いた時
canvas.addEventListener('mousemove', draw);

// マウスのボタンが離された時
canvas.addEventListener('mouseup', () => isDrawing = false);

// マウスカーソルがキャンバスの外に出た時
canvas.addEventListener('mouseleave', () => isDrawing = false);