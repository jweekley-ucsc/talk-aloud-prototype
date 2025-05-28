from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
import uuid

app = Flask(__name__)
CORS(app, supports_credentials=True)

# In-memory storage
rubrics = {}
latest_transcript = {}

@app.route('/')
@cross_origin(origin='*', methods=['GET'])
def home():
    return 'Flask server is running.'

@app.route('/rubrics', methods=['GET', 'OPTIONS'])
@cross_origin(origin='*', methods=['GET', 'POST', 'OPTIONS'])
def get_rubrics():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    return jsonify(list(rubrics.values())), 200

@app.route('/rubrics', methods=['POST', 'OPTIONS'])
@cross_origin(origin='*', methods=['POST', 'OPTIONS'])
def upload_rubric():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    try:
        data = request.get_json()
        rubric_id = str(uuid.uuid4())
        rubric_entry = {
            "id": rubric_id,
            "name": data.get("rubric_name", "Untitled Rubric"),
            "criteria": data.get("criteria", [])
        }
        rubrics[rubric_id] = rubric_entry
        return jsonify({"status": "success", "rubric": rubric_entry}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/submit-session', methods=['POST', 'OPTIONS'])
@cross_origin(origin='*', methods=['POST', 'OPTIONS'])
def receive_transcript():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    try:
        global latest_transcript
        data = request.get_json()
        latest_transcript = data
        print("Transcript received:", data)
        return jsonify({"status": "success", "message": "Transcript received."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/transcript', methods=['GET', 'OPTIONS'])
@cross_origin(origin='*', methods=['GET', 'OPTIONS'])
def fetch_transcript():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    if not latest_transcript:
        return jsonify({"status": "error", "message": "No transcript available."}), 404
    return jsonify(latest_transcript), 200

# Handles preflight (CORS)
def _build_cors_preflight_response():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5050)
