import os
from dotenv import load_dotenv
from groq import Groq
load_dotenv()
client = Groq(
    api_key=os.getenv("Groq_API_KEY")
    )
def analyze_journal(text):
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role" :"system",
                "content": "Return only one word and one emoji representing the mood. Example: Happy 😊, Sad 😔, Stressed 😰."
            },
            {
                "role":"user",
                "content": text
            }
        ]
    )
    return response.choices[0].message.content