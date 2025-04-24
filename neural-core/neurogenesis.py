import torch
import torch.nn as nn

class NeurogeneticLayer(nn.Module):
    def __init__(self, input_dim, output_dim):
        super().__init__()
        self.weights = nn.Parameter(torch.randn(output_dim, input_dim))
        self.apoptosis = nn.Parameter(torch.zeros(output_dim))

    def forward(self, x):
        connectivity = torch.sigmoid(self.apoptosis).unsqueeze(1)
        activated = torch.matmul(x, self.weights.t()) * connectivity
        return activated

class DynamicNeuralArch(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.ModuleList()
        self.current_dim = 768
        
    def add_layer(self, new_dim):
        new_layer = NeurogeneticLayer(self.current_dim, new_dim)
        self.layers.append(new_layer)
        self.current_dim = new_dim
        
    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
            x = torch.relu(x)
        return x