from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from database.db import Base
from datetime import datetime

class Journal(Base):
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    entry = Column(String)
    mood = Column(String)
    is_pinned = Column(Boolean, default=False)
    ai_advice = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)