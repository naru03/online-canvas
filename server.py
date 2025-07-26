# server.py (修正版)

import json
import os
import time
import uuid
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)
DB_FILE = "drawings.json"
SESSION_ID = str(uuid.uuid4())
ACTIVE_USERS = {} # ←これを追加（キー: clientId, 値: 最終アクセス時刻

# --- APIエンドポイントの定義 ---

# server.py の get_drawings を置き換え

# server.py の get_drawings を置き換え

@app.route('/api/drawings', methods=['GET'])
def get_drawings():
    global SESSION_ID, ACTIVE_USERS
    
    # --- アクティブユーザーの記録と集計 ---
    client_id = request.args.get('clientId')
    if client_id:
        ACTIVE_USERS[client_id] = time.time()

    # タイムアウト（10秒以上応答がないユーザーは除外）
    timeout_threshold = time.time() - 10
    ACTIVE_USERS = {uid: t for uid, t in ACTIVE_USERS.items() if t > timeout_threshold}
    user_count = len(ACTIVE_USERS)

    # --- 描画データの処理（ここは以前と同じ） ---
    since_timestamp = request.args.get('since', 0, type=int)
    all_data = []
    if os.path.exists(DB_FILE) and os.path.getsize(DB_FILE) > 0:
        with open(DB_FILE, 'r') as f:
            all_data = json.load(f)

    if since_timestamp == 0:
        response_data = all_data
    else:
        response_data = [d for d in all_data if d.get('timestamp', 0) > since_timestamp]
    
    # --- 最終的なレスポンス（user_count を追加） ---
    return jsonify({
        "session_id": SESSION_ID,
        "strokes": response_data,
        "user_count": user_count # ←人数を追加
    })

@app.route('/api/draw', methods=['POST'])
def add_drawing():
    all_data = []
    # ファイルが存在し、かつ中身が空でない場合のみ読み込む
    if os.path.exists(DB_FILE) and os.path.getsize(DB_FILE) > 0:
        with open(DB_FILE, 'r') as f:
            all_data = json.load(f)

    new_data = request.json
    new_data['timestamp'] = int(time.time() * 1000)
    all_data.append(new_data)

    with open(DB_FILE, 'w') as f:
        json.dump(all_data, f, indent=2)

    return jsonify({"status": "success", "data": new_data})


# --- フロントエンドのファイルを提供するルーティング ---

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# POST /api/reset : 全ての描画データをリセットする
@app.route('/api/reset', methods=['POST'])
def reset_drawings():
    global SESSION_ID
    # ファイルを空のリストで上書きしてリセット
    with open(DB_FILE, 'w') as f:
        json.dump([], f)
    # 新しいセッションIDを生成して、リセットを識別
    SESSION_ID = str(uuid.uuid4())
    return jsonify({"status": "success", "message": "Canvas has been reset."})

@app.route('/<path:path>')
def send_file(path):
    return send_from_directory('.', path)


# --- サーバーの起動 ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)