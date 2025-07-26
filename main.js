// main.js

// --- 準備 --------------------------------------------------------------------
const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');

// 線の基本設定
context.lineJoin = 'round';
context.lineCap = 'round';

// 描画中フラグ
let isDrawing = false;
// 連続した線（ストローク）の情報を保持する配列
let currentStroke = {
    color: 'black',
    lineWidth: 3,
    points: []
};


// --- 描画ロジック --------------------------------------------------------------

/**
 * 渡されたストローク情報をもとに、キャンバスに線を描画する関数
 * @param {object} stroke - 描画する線の情報（色、太さ、点の配列）
 */
function drawOnCanvas(stroke) {
    if (!stroke || stroke.points.length < 2) {
        return;
    }
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.lineWidth;

    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    context.stroke();
}


// --- サーバーとの通信 -----------------------------------------------------------

/**
 * サーバーにストローク情報を保存する
 * @param {object} stroke - 保存する線の情報
 */
async function saveStroke(stroke) {
    try {
        await fetch('/api/draw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(stroke),
        });
    } catch (error) {
        console.error('保存に失敗しました:', error);
    }
}

/**
 * ページ読み込み時に、サーバーから既存の描画データを読み込んで表示する
 */
async function loadAndDraw() {
    try {
        const response = await fetch('/api/drawings');
        const strokes = await response.json();
        // 取得した全てのストロークを描画
        strokes.forEach(drawOnCanvas);
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
    }
}


// --- イベントリスナー -------------------------------------------------------------

// マウスのボタンが押された時
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    // 新しいストロークを開始
    currentStroke.points = [{ x: e.offsetX, y: e.offsetY }];
});

// マウスが動いた時
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    // 現在の点をストロークに追加
    const point = { x: e.offsetX, y: e.offsetY };
    currentStroke.points.push(point);

    // 画面に描画する
    drawOnCanvas(currentStroke);
});

// マウスのボタンが離された時
canvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;

    // 点が2つ以上あればサーバーに保存
    if (currentStroke.points.length > 1) {
        saveStroke(currentStroke);
    }
    // ストローク情報をリセット
    currentStroke.points = [];
});

// マウスカーソルがキャンバスの外に出た時
canvas.addEventListener('mouseleave', () => {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke.points.length > 1) {
        saveStroke(currentStroke);
    }
    currentStroke.points = [];
});


// --- 初期化処理 -------------------------------------------------------------
// ページが読み込まれたら、既存の絵をロードする
loadAndDraw();