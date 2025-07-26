import json
import os
import time
from flask import Flask, request, jsonify, send_from_directory

# Flaskアプリを初期化
app = Flask(__name__)

# データ保存用のファイルパス
DB_FILE = "drawings.json"

# --- APIエンドポイントの定義 ---

# GET /api/drawings : 全ての描画データを取得する
@app.route('/api/drawings', methods=['GET'])
def get_drawings():
    if not os.path.exists(DB_FILE):
        return jsonify([]) # ファイルがなければ空のリストを返す

    with open(DB_FILE, 'r') as f:
        data = json.load(f)
    return jsonify(data)

# POST /api/draw : 新しい描画データを保存する
@app.route('/api/draw', methods=['POST'])
def add_drawing():
    # ファイルがなければ空のリストで初期化
    if not os.path.exists(DB_FILE):
        all_data = []
    else:
        with open(DB_FILE, 'r') as f:
            all_data = json.load(f)

    # フロントエンドから送られてきたJSONデータを取得
    new_data = request.json
    # サーバー側でタイムスタンプを追加
    new_data['timestamp'] = int(time.time() * 1000)

    # 既存のデータに追加
    all_data.append(new_data)

    # ファイルに書き込み
    with open(DB_FILE, 'w') as f:
        json.dump(all_data, f, indent=2)

    return jsonify({"status": "success", "data": new_data})


# --- フロントエンドのファイルを提供するルーティング ---

# ルートURL ('/') にアクセスされたら、index.html を表示
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# その他のファイル（main.js, style.css）へのアクセスを許可
@app.route('/<path:path>')
def send_file(path):
    return send_from_directory('.', path)


# --- サーバーの起動 ---
if __name__ == '__main__':
    # debug=True にすると、コードを変更した時に自動でサーバーが再起動する
    app.run(debug=True, port=5001)