from transformers import Trainer, TrainingArguments
from datasets import Dataset

class MedicalSelfPropagatingTrainer:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer
        self.knowledge = []
        
    def assimilate_data(self, new_data):
        self.knowledge.extend(new_data)
        if len(self.knowledge) >= 1000000:
            self.retrain()
            self.knowledge = []
            
    def retrain(self):
        dataset = Dataset.from_list(self.knowledge)
        def tokenize_function(examples):
            return self.tokenizer(examples['text'], padding="max_length", truncation=True)
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        
        train_args = TrainingArguments(
            output_dir='./autonomous_medical',
            learning_rate=3e-5,
            per_device_train_batch_size=16,
            gradient_accumulation_steps=2,
            num_train_epochs=1,
            logging_dir='./logs',
            logging_steps=10,
        )
        
        trainer = Trainer(
            model=self.model,
            args=train_args,
            train_dataset=tokenized_dataset,
        )
        
        trainer.train()
        self.model.save_pretrained("./autonomous_medical_model")