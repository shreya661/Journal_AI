import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(
    api_key=os.getenv("Groq_API_KEY")
)

# Moods that are considered negative/needing comfort
NEGATIVE_MOODS = [
    "sad", "stressed", "angry", "anxious", "lonely",
    "tired", "confused", "frustrated", "overwhelmed",
    "depressed", "worried", "fearful", "hopeless"
]


def is_negative_mood(mood):
    """Check if the detected mood is negative and needs comfort."""
    if not mood:
        return False
    mood_lower = mood.lower()
    return any(neg in mood_lower for neg in NEGATIVE_MOODS)


def get_ai_comfort(journal_entry, mood):
    """
    Generate personalized AI comfort and advice when the user's mood
    is negative. Uses the journal entry context to provide warm,
    empathetic, and actionable advice.
    """
    if not is_negative_mood(mood):
        return None

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a warm, empathetic AI wellness companion inside a journaling app. "
                        "The user just wrote a journal entry and their mood has been detected as negative. "
                        "Your job is to:\n"
                        "1. Acknowledge their feelings with genuine empathy (don't be dismissive)\n"
                        "2. Provide 1-2 specific, actionable pieces of advice tailored to their situation\n"
                        "3. End with a short, uplifting message of hope\n\n"
                        "RULES:\n"
                        "- Keep it under 100 words\n"
                        "- Be warm and conversational, like a caring friend\n"
                        "- Don't use generic platitudes — reference specifics from their entry\n"
                        "- Use 1-2 relevant emojis naturally\n"
                        "- Never start with 'I'm sorry to hear that'\n"
                        "- Don't be preachy or lecture them\n"
                        "- If they mention serious issues (self-harm, crisis), gently suggest professional help"
                    )
                },
                {
                    "role": "user",
                    "content": f"My mood: {mood}\n\nMy journal entry:\n{journal_entry}"
                }
            ],
            temperature=0.8,
            max_tokens=200
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"AI comfort generation failed: {e}")
        return get_fallback_comfort(mood)


def get_fallback_comfort(mood):
    """Fallback comfort messages if the AI API call fails."""
    mood_lower = mood.lower() if mood else ""

    fallbacks = {
        "sad": "💙 It's okay to feel sad sometimes. These emotions are valid and they will pass. Consider doing one small thing that brings you comfort — a warm drink, your favorite song, or a short walk. You deserve gentleness today.",
        "stressed": "🌿 When stress feels heavy, try the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, exhale for 8. Even 3 rounds can reset your nervous system. You've handled tough things before, and you'll handle this too.",
        "angry": "🌊 Your anger is telling you something important — that a boundary has been crossed or something matters deeply to you. Try writing down exactly what triggered it. Understanding the 'why' behind anger is the first step to channeling it productively.",
        "anxious": "🦋 Anxiety often comes from trying to control what hasn't happened yet. Right now, in this exact moment, you are safe. Try naming 5 things you can see, 4 you can touch, 3 you hear. Grounding yourself in the present can quiet the noise.",
        "lonely": "🌟 Loneliness doesn't mean you're alone — it means you're craving meaningful connection, and that's beautifully human. Reach out to one person today, even with a simple 'hey, thinking of you.' Small bridges lead to big connections.",
        "tired": "🌙 Your body and mind are asking for rest, and that's not weakness — it's wisdom. Give yourself permission to pause without guilt. Even 10 minutes of true rest (no screens, just breathing) can make a difference.",
        "confused": "🧭 Feeling confused often means you're at a crossroads of growth. You don't need all the answers right now. Try writing down the one question that matters most — clarity often follows when we simplify."
    }

    for key, message in fallbacks.items():
        if key in mood_lower:
            return message

    return "💜 Whatever you're going through, know that writing about it is already a step forward. Be gentle with yourself today — you're doing better than you think."
