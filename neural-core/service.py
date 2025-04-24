from flask import Flask, request, jsonify
import torch
from neural_core.neurogenesis import DynamicNeuralArch

app = Flask(__name__)
model = DynamicNeuralArch()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    input_tensor = torch.tensor(data['input'], dtype=torch.float32)
    with torch.no_grad():
        output = model(input_tensor)
    return jsonify({'output': output.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)