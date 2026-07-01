def get_suggestion(mood):

    suggestions = {
        "Sad": "🌈 Tough times don't last, but tough people do.",
        "Happy": "✨ Keep shining and enjoy the moment!",
        "Stressed": "🌿 Take a deep breath and drink some water.",
        "Angry": "🌬️ Pause and take three deep breaths.",
        "Calm": "🧘 Keep nurturing your inner peace.",
        "Motivated": "🔥 Keep going, you're doing great!"
    }

    return suggestions.get(
        mood,
        "💜 Thank you for sharing your thoughts today."
    )