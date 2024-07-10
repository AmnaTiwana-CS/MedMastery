import sys
import json
from llama_model import LLaMAModel
from dotenv import load_dotenv
import os

load_dotenv()

def vectorize_text(text):
    try:
        model = LLaMAModel()
        vector = model.vectorize_text(text)
        return vector
    except Exception as e:
        print(f"Error during vectorization: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vectorize.py <text_to_vectorize>")
        sys.exit(1)
    
    text_to_vectorize = sys.argv[1]
    vector = vectorize_text(text_to_vectorize)
    print(json.dumps(vector))
