import json
import os
import time
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)
DB_FILE = "drawings.json"
RESET_TIMESTAMP = 0  # リセットが発生した時刻
ACTIVE_SESSIONS = {}  # キー: sessionId, 値: 最終アクセス時刻
SESSION_RESET_STATUS = {}  # キー: sessionId, 値: 最後に受信したリセットタイムスタンプ


# APIエンドポイントの定義
@app.route("/api/drawings", methods=["GET", "POST", "DELETE"])
def handle_drawings():
    global RESET_TIMESTAMP, ACTIVE_SESSIONS, SESSION_RESET_STATUS

    if request.method == "GET":
        # アクティブセッションの記録と集計
        session_id = request.args.get("sessionId")
        if session_id:
            ACTIVE_SESSIONS[session_id] = time.time()

        # 10秒以上アクセスがないセッションを削除
        timeout_threshold = time.time() - 10
        ACTIVE_SESSIONS = {sid: t for sid, t in ACTIVE_SESSIONS.items() if t > timeout_threshold}
        # 非アクティブなセッションのリセット状態も削除
        SESSION_RESET_STATUS = {sid: ts for sid, ts in SESSION_RESET_STATUS.items() if sid in ACTIVE_SESSIONS}
        user_count = len(ACTIVE_SESSIONS)

        # 描画データの処理
        since_timestamp = request.args.get("since", 0, type=int)
        all_data = []
        if os.path.exists(DB_FILE) and os.path.getsize(DB_FILE) > 0:
            with open(DB_FILE, "r") as f:
                all_data = json.load(f)

        if since_timestamp == 0:
            response_data = all_data
        else:
            response_data = [d for d in all_data if d.get("timestamp", 0) > since_timestamp]

        # リセット検知
        reset_flag = False
        if session_id:
            last_reset_received = SESSION_RESET_STATUS.get(session_id, 0)
            if RESET_TIMESTAMP > last_reset_received:
                reset_flag = True
                SESSION_RESET_STATUS[session_id] = RESET_TIMESTAMP
                print(f"Reset flag sent to session: {session_id}")

        # レスポンス
        return jsonify(
            {"strokes": response_data, "user_count": user_count, "reset_flag": reset_flag}
        )

    elif request.method == "POST":
        # 新しい描画データの追加
        all_data = []
        if os.path.exists(DB_FILE) and os.path.getsize(DB_FILE) > 0:
            with open(DB_FILE, "r") as f:
                all_data = json.load(f)

        new_data = request.json
        new_data["timestamp"] = int(time.time() * 1000)
        all_data.append(new_data)

        with open(DB_FILE, "w") as f:
            json.dump(all_data, f, indent=2)

        return jsonify({"status": "success", "data": new_data})

    elif request.method == "DELETE":
        with open(DB_FILE, "w") as f:
            json.dump([], f)
        # リセットタイムスタンプを現在時刻に設定
        RESET_TIMESTAMP = int(time.time() * 1000)
        return jsonify({"status": "success", "message": "Canvas has been reset."})


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def send_file(path):
    return send_from_directory(".", path)


# サーバーの起動
if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=False, port=5001)
