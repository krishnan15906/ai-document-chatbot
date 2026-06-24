from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import time
import sys
import hashlib
# Add backend utils path for pdf_reader and other utils
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.pdf_reader import extract_pages
from utils.pdf_store import save_pages, load_pages
from utils.pdf_chat import answer_question

router = APIRouter()

# Define the local uploads path under the backend workspace directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_doc_id(filename: str) -> str:
return "doc-" + hashlib.md5(filename.encode('utf-8')).hexdigest()[:12]

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
try:
filename = os.path.basename(file.filename or "document.pdf")
file_path = os.path.join(UPLOAD_DIR, filename)

with open(file_path, "wb") as buffer:
shutil.copyfileobj(file.file, buffer)

# Use stable doc_id based on filename hash
doc_id = generate_doc_id(filename)

# Extract pages from the saved PDF
pages = extract_pages(file_path)
print(f"--- Extracted {len(pages)} Pages ---")
save_pages(doc_id, pages)
file_size_bytes = os.path.getsize(file_path)

doc_type = ext if ext in ["pdf", "txt", "docx"] else "pdf"

doc_id = generate_doc_id(filename)

docs.append({
"id": doc_id,
"name": filename,
"size": file_size_str,
"uploadedAt": "Uploaded",
"type": doc_type,
"mtime": mtime
})
# Sort by mtime descending (most recent first)
docs.sort(key=lambda x: x["mtime"], reverse=True)
# Remove mtime from output
for doc in docs:
del doc["mtime"]
return docs
except Exception as e:
raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{filename}")
async def delete_document(filename: str):
try:
file_path = os.path.join(UPLOAD_DIR, filename)
if os.path.exists(file_path):
os.remove(file_path)
# Also remove the extracted text
doc_id = generate_doc_id(filename)
json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "utils", "pdf_texts", f"{doc_id}.json")
if os.path.exists(json_path):
os.remove(json_path)

from utils.pdf_store import delete_document_vectors
delete_document_vectors(doc_id)

return {"message": "Document deleted successfully"}
else:
raise HTTPException(status_code=404, detail="Document not found")
except Exception as e:
raise HTTPException(status_code=500, detail=str(e))

