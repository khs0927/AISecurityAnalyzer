from flask import Flask, request, jsonify
from quantum_opt.qreasoner import QuantumInference

app = Flask(__name__)
inference = QuantumInference()

@app.route('/infer', methods=['POST'])
def infer():
    data = request.json
    medical_data = data['medical_data']
    result = inference.infer(medical_data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)