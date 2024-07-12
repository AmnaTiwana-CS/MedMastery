from transformers import AutoModelForQuestionAnswering, AutoTokenizer, logging
import torch
import os
from dotenv import load_dotenv

logging.set_verbosity(logging.ERROR)

# Load environment variables from .env file
load_dotenv()
hub_token = os.getenv("HUGGINGFACE_HUB_TOKEN")

class LLaMAModel:
    def __init__(self):
        self.model_name = "NousResearch/Hermes-2-Theta-Llama-3-8B"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, use_auth_token=hub_token)
        self.model = AutoModelForQuestionAnswering.from_pretrained(self.model_name, use_auth_token=hub_token)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()

    def answer_question(self, question, context):
        """
        Answer a given question based on the provided context using the LLaMA model.

        Args:
            question (str): The question to answer.
            context (str): The context or passage where the question is based.

        Returns:
            str: The answer to the question.
        """
        try:
            inputs = self.tokenizer(question, context, return_tensors="pt", padding=True, truncation=True)
            inputs = inputs.to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
            start_scores = outputs.start_logits
            end_scores = outputs.end_logits
            all_tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0].tolist())
            answer_tokens = all_tokens[torch.argmax(start_scores) : torch.argmax(end_scores) + 1]
            answer = self.tokenizer.decode(self.tokenizer.convert_tokens_to_ids(answer_tokens))
            return answer.strip()
        except Exception as e:
            print(f"Error answering question: {e}")
            return ""

# Example usage
if __name__ == "__main__":
    model = LLaMAModel()
    question = "What is the purpose of this model?"
    context = "This model is designed to provide accurate answers to questions based on the given context."
    answer = model.answer_question(question, context)
    print("Answer:", answer)
