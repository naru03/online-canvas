//キャンバス取得
const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');

//線の設定
context.lineJoin = 'round';
context.lineCap = 'round';

//描画中フラグ
let isDrawing = false;

//ストローク記録
let currentStroke = {
    color: 'black',
    lineWidth: 3,
    points: []
};

//SessionId
let currentSessionId = null;

//sessionStorageからClientIdを取得、なければ新規作成
function getClientId() {
    let id = sessionStorage.getItem('clientId');
    if (!id) {
        id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        sessionStorage.setItem('clientId', id);
    }
    return id;
}
const clientId = getClientId();

//描画関数
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

//ストロークを保存する関数
async function saveStroke(stroke) {
    try {
        await fetch('/api/drawings', {
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

//既存の描画データを読み込んで表示する関数
async function loadAndDraw() {
    try {
        const response = await fetch('/api/drawings');
        const strokes = await response.json();
        strokes.forEach(drawOnCanvas);
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
    }
}

//最後にチェックしたサーバー時刻
let lastCheckTime = 0;

//ポーリング
async function pollForNewDrawings() {
    try {
        const userCountSpan = document.getElementById('user-count');
        const response = await fetch(`/api/drawings?since=${lastCheckTime}&clientId=${clientId}`);
        const data = await response.json();

        //人数を画面に反映
        if (data.user_count) {
            userCountSpan.textContent = data.user_count;
        }

        if (currentSessionId && data.session_id !== currentSessionId) {
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

//初期化関数
async function initialize() {
    try {
        const response = await fetch(`/api/drawings?clientId=${clientId}`); //sinceなしの初回ロード
        const data = await response.json();

        currentSessionId = data.session_id; //最初のセッションIDを設定
        data.strokes.forEach(drawOnCanvas); //既存の描画をロード

        lastCheckTime = Date.now();
        setInterval(pollForNewDrawings, 1000);
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
    }
}

initialize();


//イベントリスナー

//ボタン取得
const colorButtons = document.querySelectorAll('.color-btn');
const widthButtons = document.querySelectorAll('.width-btn');
const resetButton = document.getElementById('reset-button');

//カラーボタン
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        colorButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        currentStroke.color = button.dataset.color;
    });
});

//太さボタン
widthButtons.forEach(button => {
    button.addEventListener('click', () => {
        widthButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        currentStroke.lineWidth = parseInt(button.dataset.width, 10);
    });
});

//マウスのボタンが押された時
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    currentStroke.points = [{ x: e.offsetX, y: e.offsetY }];
});

//マウスが動いた時
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const point = { x: e.offsetX, y: e.offsetY };
    currentStroke.points.push(point);
    drawOnCanvas(currentStroke);
});

//マウスのボタンが離された時
canvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.points.length > 1) {
        saveStroke(currentStroke);
    }
    currentStroke.points = [];
});

//マウスカーソルがキャンバスの外に出た時
canvas.addEventListener('mouseleave', () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.points.length > 1) {
        saveStroke(currentStroke);
    }
    currentStroke.points = [];
});

//リセットボタンが押された時
resetButton.addEventListener('click', async () => {
    if (confirm('本当にキャンバスをリセットしますか？他の人の描画もすべて消えます。')) {
        try {
            await fetch('/api/drawings', { method: 'DELETE' });
        } catch (error) {
            console.error('リセットに失敗しました:', error);
        }
    }
});
