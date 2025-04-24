import numpy as np
from qiskit import QuantumCircuit, Aer, execute

class QuantumInference:
    def __init__(self, n_qubits=8):
        self.n_qubits = n_qubits
        self.backend = Aer.get_backend('qasm_simulator')
        
    def create_entanglement(self, inputs):
        if len(inputs) != self.n_qubits:
            raise ValueError(f"Input must have {self.n_qubits} elements")
        qc = QuantumCircuit(self.n_qubits)
        for i in range(self.n_qubits):
            theta = inputs[i] * np.pi
            qc.rx(theta, i)
        for i in range(self.n_qubits-1):
            qc.cx(i, i+1)
        qc.measure_all()
        return qc
    
    def infer(self, medical_data):
        norm_data = self.normalize(medical_data)
        qc = self.create_entanglement(norm_data)
        result = execute(qc, self.backend, shots=1024).result()
        counts = result.get_counts(qc)
        return self.interpret_counts(counts)
    
    def normalize(self, data):
        min_val = np.min(data)
        max_val = np.max(data)
        if min_val == max_val:
            return np.zeros_like(data)
        return (data - min_val) / (max_val - min_val)
    
    def interpret_counts(self, counts):
        total_shots = sum(counts.values())
        prob_1 = sum(value for key, value in counts.items() if key[0] == '1') / total_shots
        return {'probability': prob_1, 'class': 1 if prob_1 > 0.5 else 0}