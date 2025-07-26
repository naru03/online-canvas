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
let currentSessionId = null;


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
// main.js のイベントリスナーセクションの先頭に追加

// --- ツール選択の処理 ---

const colorButtons = document.querySelectorAll('.color-btn');
const widthButtons = document.querySelectorAll('.width-btn');

// カラーボタンの処理
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 他のボタンの .selected を削除
        colorButtons.forEach(btn => btn.classList.remove('selected'));
        // クリックされたボタンに .selected を追加
        button.classList.add('selected');
        // ペンの色を更新
        currentStroke.color = button.dataset.color;
        // 消しゴム（白）を選んだら線の太さを太くする
        if (button.dataset.color === 'white') {
            currentStroke.lineWidth = 30;
        }
    });
});

// 太さボタンの処理
widthButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 他のボタンの .selected を削除
        widthButtons.forEach(btn => btn.classList.remove('selected'));
        // クリックされたボタンに .selected を追加
        button.classList.add('selected');
        // ペンの太さを更新 (文字列なので数値に変換)
        currentStroke.lineWidth = parseInt(button.dataset.width, 10);
    });
});

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

// リセットボタンが押された時
const resetButton = document.getElementById('reset-button');
resetButton.addEventListener('click', async () => {
    // 確認ダイアログを表示
    if (confirm('本当にキャンバスをリセットしますか？他の人の描画もすべて消えます。')) {
        try {
            await fetch('/api/reset', { method: 'POST' });
            // サーバー側でリセットされた後、自分の画面もリロードして綺麗にする
            location.reload();
        } catch (error) {
            console.error('リセットに失敗しました:', error);
        }
    }
});

// main.js の一番下に追加

// --- リアルタイム更新（ポーリング） ---------------------------------------------

// 最後にチェックしたサーバー時刻を保持する変数
let lastCheckTime = 0;

/**
 * サーバーに新しい描画データがないか問い合わせる関数
 */
// main.js の pollForNewDrawings を置き換え

// pollForNewDrawings 関数を丸ごと置き換え

async function pollForNewDrawings() {
    try {
        const userCountSpan = document.getElementById('user-count'); // 人数表示の要素を取得

        const response = await fetch(`/api/drawings?since=${lastCheckTime}&clientId=${clientId}`);
        const data = await response.json();

        // 人数を画面に反映
        if (data.user_count) {
            userCountSpan.textContent = data.user_count;
        }

        if (currentSessionId && data.session_id !== currentSessionId) {
            console.log("リセットを検知しました。キャンバスをクリアします。");
            context.clearRect(0, 0, canvas.width, canvas.height);
        }

        currentSessionId = data.session_id;

        if (data.strokes.length > 0) {
            data.strokes.forEach(drawOnCanvas);
            lastCheckTime = data.strokes[data.strokes.length - 1].timestamp;
        }
    } catch (error) {
        console.error('ポーリングエラー:', error);
    }
}

// main.js の initialize を置き換え

async function initialize() {
    try {
        // initialize 関数の fetch の行を修正
        const response = await fetch(`/api/drawings?clientId=${clientId}`); // sinceなしの初回ロード
        const data = await response.json();

        currentSessionId = data.session_id; // 最初のセッションIDを設定
        data.strokes.forEach(drawOnCanvas); // 既存の絵をロード

        lastCheckTime = Date.now();
        setInterval(pollForNewDrawings, 1000);
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
    }
}

initialize(); 