# server.py (修正版)

import json
import os
import time
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)
DB_FILE = "drawings.json"

# --- APIエンドポイントの定義 ---

@app.route('/api/drawings', methods=['GET'])
def get_drawings():
    # ファイルが存在し、かつ中身が空でないかチェック
    if not os.path.exists(DB_FILE) or os.path.getsize(DB_FILE) == 0:
        return jsonify([]) # 存在しないか空の場合は、空のリストを返す

    with open(DB_FILE, 'r') as f:
        data = json.load(f)
    return jsonify(data)

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

@app.route('/<path:path>')
def send_file(path):
    return send_from_directory('.', path)


# --- サーバーの起動 ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)