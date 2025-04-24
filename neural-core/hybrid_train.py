import torch
from torch.optim import Optimizer
from qiskit.algorithms.optimizers import SPSA

class HybridOptimizer(Optimizer):
    def __init__(self, params, quantum_opt=SPSA()):
        super().__init__(params, {})
        self.quantum_opt = quantum_opt
        
    def step(self, closure=None):
        loss = closure()
        params = [p.data.numpy() for p in self.param_groups[0]['params']]
        
        optimized = self.quantum_opt.optimize(
            len(params), 
            lambda x: self.eval_loss(x),
            initial_point=params
        )
        
        for p, v in zip(self.param_groups[0]['params'], optimized.x):
            p.data = torch.tensor(v)
        return loss
    
    def eval_loss(self, params):
        return 0.0