import os
import sys
from transformers import AutoModelForQuestionAnswering, AutoTokenizer, logging
import torch
from dotenv import load_dotenv
import PyPDF2

logging.set_verbosity(logging.ERROR)

# Load environment variables from .env file
load_dotenv()
hub_token = os.getenv("HUGGINGFACE_HUB_TOKEN")

def extract_text_from_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

def vectorize_text(text):
    try:
        model_name = "NousResearch/Hermes-2-Theta-Llama-3-8B"
        tokenizer = AutoTokenizer.from_pretrained(model_name, token=hub_token)
        model = AutoModelForQuestionAnswering.from_pretrained(model_name, token=hub_token)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()

        # Tokenize input text
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        inputs.to(device)

        # Get outputs from the model
        with torch.no_grad():
            outputs = model(**inputs)

        # Print the outputs for debugging
        print("Start logits:", outputs.start_logits)
        print("End logits:", outputs.end_logits)

        # Handle special tokens and decode the answer
        all_tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"].tolist()[0])
        answer_tokens = all_tokens[torch.argmax(outputs.start_logits): torch.argmax(outputs.end_logits) + 1]
        answer = tokenizer.decode(tokenizer.convert_tokens_to_ids(answer_tokens))

        print("Answer:", answer)

    except Exception as e:
        print(f"Error during vectorization: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        text = extract_text_from_pdf(pdf_path)
        if text:
            print(f"Extracted Text: {text[:500]}...")  # Print first 500 characters for debugging
            vectorize_text(text)
        else:
            print("Failed to extract text from PDF.")
    else:
        print("Please provide a PDF file path.")
