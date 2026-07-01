from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from journal import router
from database.db import engine, Base
import models.journal_model

app = FastAPI()

# ADD THIS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {
        "message": "Hello World!"
    }