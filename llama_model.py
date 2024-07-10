import os
from transformers import LlamaTokenizer, LlamaForCausalLM, AutoTokenizer, AutoModelForCausalLM

class LLaMAModel:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(
            'NousResearch/Hermes-2-Theta-Llama-3-8B',
            token=os.getenv("HUGGINGFACE_HUB_TOKEN")
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            'NousResearch/Hermes-2-Theta-Llama-3-8B',
            token=os.getenv("HUGGINGFACE_HUB_TOKEN")
        )

    def vectorize_text(self, text):
        inputs = self.tokenizer(text, return_tensors='pt')
        outputs = self.model(**inputs)
        return outputs.last_hidden_state.detach().numpy().flatten().tolist()

    def answer_question(self, question, context):
        inputs = self.tokenizer(question, context, return_tensors="pt")
        output = self.model.generate(input_ids=inputs['input_ids'], 
                                     attention_mask=inputs['attention_mask'], 
                                     max_length=50)
        response = self.tokenizer.decode(output[0], skip_special_tokens=True)
        return response

