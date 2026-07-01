from pydantic import BaseModel

class JournalEntry(BaseModel):
    entry: str

class JournalUpdate(BaseModel):
    entry: str