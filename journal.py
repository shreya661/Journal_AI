from fastapi import APIRouter, HTTPException
from schemas.journal_schema import JournalEntry, JournalUpdate
from services.ai_service import analyze_journal
from services.suggestion_service import get_suggestion
from services.comfort_service import get_ai_comfort, is_negative_mood
from database.db import SessionLocal
from models.journal_model import Journal

router = APIRouter()


@router.get("/journal")
def get_journal():
    db = SessionLocal()
    # Return pinned entries first, then by newest
    journals = db.query(Journal).order_by(
        Journal.is_pinned.desc(),
        Journal.created_at.desc()
    ).all()

    data = []

    for journal in journals:
        data.append({
            "id": journal.id,
            "entry": journal.entry,
            "mood": journal.mood,
            "is_pinned": journal.is_pinned or False,
            "ai_advice": journal.ai_advice,
            "created_at": journal.created_at
        })

    db.close()
    return data


@router.post("/journal")
def create_journal(entry: JournalEntry):

    analysis = analyze_journal(entry.entry)
    suggestion = get_suggestion(analysis)

    # Generate AI comfort/advice if mood is negative
    ai_advice = get_ai_comfort(entry.entry, analysis)

    db = SessionLocal()

    new_journal = Journal(
        entry=entry.entry,
        mood=analysis,
        ai_advice=ai_advice
    )

    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    db.close()

    return {
        "message": "Journal saved successfully",
        "entry": entry.entry,
        "analysis": analysis,
        "suggestion": suggestion,
        "ai_advice": ai_advice
    }


@router.put("/journal/{journal_id}")
def update_journal(journal_id: int, update: JournalUpdate):
    db = SessionLocal()
    journal = db.query(Journal).filter(Journal.id == journal_id).first()

    if not journal:
        db.close()
        raise HTTPException(status_code=404, detail="Journal not found")

    journal.entry = update.entry
    # Re-analyze the mood for the updated entry
    journal.mood = analyze_journal(update.entry)
    db.commit()
    db.refresh(journal)
    db.close()

    return {"message": "Journal updated successfully", "id": journal_id}


@router.delete("/journal/{journal_id}")
def delete_journal(journal_id: int):
    db = SessionLocal()
    journal = db.query(Journal).filter(Journal.id == journal_id).first()

    if not journal:
        db.close()
        raise HTTPException(status_code=404, detail="Journal not found")

    db.delete(journal)
    db.commit()
    db.close()

    return {"message": "Journal deleted successfully", "id": journal_id}


@router.patch("/journal/{journal_id}/pin")
def toggle_pin(journal_id: int):
    db = SessionLocal()
    journal = db.query(Journal).filter(Journal.id == journal_id).first()

    if not journal:
        db.close()
        raise HTTPException(status_code=404, detail="Journal not found")

    journal.is_pinned = not (journal.is_pinned or False)
    db.commit()
    db.refresh(journal)
    db.close()

    return {
        "message": "Pin toggled",
        "id": journal_id,
        "is_pinned": journal.is_pinned
    }


@router.get("/analytics")
def get_analytics():
    db = SessionLocal()
    journals = db.query(Journal).all()
    db.close()

    analytics = {
        "Happy": 0, "Sad": 0, "Stressed": 0, "Calm": 0,
        "Angry": 0, "Motivated": 0, "Excited": 0, "Reflective": 0
    }

    for journal in journals:
        mood = journal.mood.lower()
        for key in analytics:
            if key.lower() in mood:
                analytics[key] += 1

    return analytics


@router.get("/streak")
def get_streak():
    """Return how many consecutive days the user has journaled up to today."""
    from datetime import date, timedelta
    db = SessionLocal()
    journals = db.query(Journal).order_by(Journal.created_at.desc()).all()
    db.close()

    if not journals:
        return {"streak": 0, "total_entries": 0}

    # Collect unique journaled dates
    journaled_dates = sorted(
        {j.created_at.date() for j in journals if j.created_at},
        reverse=True
    )

    streak = 0
    check = date.today()
    for d in journaled_dates:
        if d == check or d == check - timedelta(days=1):
            streak += 1
            check = d - timedelta(days=1)
        elif d < check - timedelta(days=1):
            break

    return {"streak": streak, "total_entries": len(journals), "total_days": len(journaled_dates)}


@router.get("/weekly-summary")
def get_weekly_summary():
    """Return this week's top mood, most active day, and entry count."""
    from datetime import date, timedelta
    from collections import Counter

    db = SessionLocal()
    week_ago = date.today() - timedelta(days=7)
    journals = db.query(Journal).filter(
        Journal.created_at >= week_ago
    ).all()
    db.close()

    if not journals:
        return {
            "week_count": 0,
            "top_mood": None,
            "top_mood_count": 0,
            "most_active_day": None,
            "mood_distribution": {}
        }

    mood_words = []
    day_counts = Counter()
    mood_dist = {}

    for j in journals:
        if j.mood:
            raw = j.mood.replace(
                *[c for c in j.mood if ord(c) > 127], ""
            ).strip().split()[0].lower().capitalize() if j.mood else "Unknown"
            # simpler extraction
            import re
            clean = re.sub(r'[^\w\s]', '', j.mood).strip().split()[0].capitalize() if j.mood else "Unknown"
            mood_words.append(clean)
            mood_dist[clean] = mood_dist.get(clean, 0) + 1
        if j.created_at:
            day_name = j.created_at.strftime("%A")
            day_counts[day_name] += 1

    top_mood = Counter(mood_words).most_common(1)[0] if mood_words else ("Unknown", 0)
    most_active_day = day_counts.most_common(1)[0][0] if day_counts else None

    return {
        "week_count": len(journals),
        "top_mood": top_mood[0],
        "top_mood_count": top_mood[1],
        "most_active_day": most_active_day,
        "mood_distribution": mood_dist
    }
