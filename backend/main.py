from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.ask import router as ask_router
from routes.auth import router as auth_router

from database import engine
import models

# Create all database tables on startup
try:
    models.Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")
except Exception as e:
    print(f"Failed to connect to database or create tables: {e}")

app = FastAPI()

# Configure CORS so frontend running on localhost:3000 can talk to API on localhost:8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(upload_router, prefix="/api")
app.include_router(ask_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")

@app.get("/")
def home():
    return {"message": "Hello World"}
@app.post("/upload")
def upload():
    return {"message": "uploaded successfully"}
