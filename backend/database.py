from sqlalchemy import create_engine
import sqlalchemy
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

# Use SQLite for local development without requiring a database server
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# connect_args={"check_same_thread": False} is needed only for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
