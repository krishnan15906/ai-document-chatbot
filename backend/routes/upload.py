from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import shutil
import os
import sys
import hashlib
from models import User
from routes.auth import get_current_user

# Add backend root to path so all utils/services are importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Existing utilities
from utils.pdf_reader import extract_pages
from utils.pdf_store import save_pages, load_pages
from utils.pdf_chat import answer_question

# RAG pipeline utilities
from utils.text_splitter import split_chunks
from utils.embedding import generate_embeddings
from services.pinecone_service import store_chunks_in_pinecone

router = APIRouter()

# Define the local uploads path under the backend workspace directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_doc_id(filename: str) -> str:
    return "doc-" + hashlib.md5(filename.encode('utf-8')).hexdigest()[:12]

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        filename = f"{current_user.id}_{os.path.basename(file.filename or 'document.pdf')}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # ── Step 1: Save the uploaded file ──────────────────────────────────
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size_bytes = os.path.getsize(file_path)
        if file_size_bytes >= 1024 * 1024:
            file_size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"
        else:
            file_size_str = f"{file_size_bytes / 1024:.1f} KB"

        print(f"\n{'='*50}")
        print(f"[UPLOAD] Starting RAG pipeline for: '{filename}'")
        ext = os.path.splitext(filename)[1].lower().replace(".", "")
        doc_type = ext if ext in ["pdf", "txt", "docx"] else "pdf"
        doc_id = generate_doc_id(filename)

        # ── Step 2: Extract text pages ───────────────────────────────────────
        pages = extract_pages(file_path)
        total_text_len = sum(len(p.get("text", "")) for p in pages)
        save_pages(doc_id, pages)
        print(f"[STEP 2] ✅ Text extracted: {len(pages)} page(s), {total_text_len} total characters")

        # ── Step 3: Split text into chunks ───────────────────────────────────
        chunks = split_chunks(pages, chunk_size=500, chunk_overlap=50)
        print(f"[STEP 3] ✅ Text split into {len(chunks)} chunk(s)")
        if chunks:
            preview = chunks[0][:120].replace("\n", " ")
            print(f"         First chunk preview: \"{preview}{'...' if len(chunks[0]) > 120 else ''}\"")

        # ── Step 4 & 5: Generate embeddings + store in Pinecone ──────────────
        pinecone_status = "skipped"
        total_chunks = len(chunks)

        if chunks:
            try:
                embeddings = generate_embeddings(chunks)
                print(f"[STEP 4] ✅ Embeddings generated: {len(embeddings)} vector(s), dim={len(embeddings[0])}")

                stored = store_chunks_in_pinecone(filename, chunks, embeddings)
                pinecone_status = f"{stored} vectors stored"
                print(f"[STEP 5] ✅ Pinecone upsert success: {stored} vector(s) stored for '{filename}'")
            except Exception as pinecone_err:
                # Non-fatal: log the error but don't fail the whole upload
                print(f"[STEP 4/5] ⚠️  Pinecone storage failed: {pinecone_err}")
                pinecone_status = f"error: {str(pinecone_err)}"

        print(f"[UPLOAD] 🎉 Pipeline complete for '{filename}'")
        print(f"{'='*50}\n")

        return {
            "message": "File uploaded and vectors stored successfully",
            "id": doc_id,
            "filename": filename,
            "size": file_size_str,
            "type": doc_type,
            "total_chunks": total_chunks,
            "pinecone_status": pinecone_status,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD] ❌ Pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        await file.close()

from pydantic import BaseModel

class ChatRequest(BaseModel):
    doc_id: str
    question: str

@router.post("/chat")
async def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        pages = load_pages(req.doc_id)
        if not pages:
            # Lazy re-extraction: If text is missing but file is on disk, re-extract it
            found_filename = None
            if os.path.exists(UPLOAD_DIR):
                for filename in os.listdir(UPLOAD_DIR):
                    if filename.startswith(f"{current_user.id}_") and generate_doc_id(filename) == req.doc_id:
                        found_filename = filename
                        break
            
            if found_filename:
                file_path = os.path.join(UPLOAD_DIR, found_filename)
                pages = extract_pages(file_path)
                save_pages(req.doc_id, pages)
            else:
                raise HTTPException(status_code=404, detail="Document text not found. Please re-upload the document.")
                
        answer = answer_question(pages, req.question, req.doc_id)
        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_documents(current_user: User = Depends(get_current_user)):
    try:
        docs = []
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                if not filename.startswith(f"{current_user.id}_"):
                    continue
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    file_size_bytes = os.path.getsize(file_path)
                    if file_size_bytes >= 1024 * 1024:
                        file_size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"
                    else:
                        file_size_str = f"{file_size_bytes / 1024:.1f} KB"
                    
                    # File modification time for sorting only
                    mtime = os.path.getmtime(file_path)
                    
                    ext = os.path.splitext(filename)[1].lower().replace(".", "")
                    doc_type = ext if ext in ["pdf", "txt", "docx"] else "pdf"
                    
                    doc_id = generate_doc_id(filename)
                    
                    # Strip the user_id_ prefix for display
                    display_name = filename.split("_", 1)[1] if "_" in filename else filename
                    
                    docs.append({
                        "id": doc_id,
                        "name": display_name,
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
async def delete_document(filename: str, current_user: User = Depends(get_current_user)):
    try:
        # Prevent path traversal and ensure user can only delete their own files
        # The filename sent from frontend might not have the prefix if it was stripped
        if not filename.startswith(f"{current_user.id}_"):
            actual_filename = f"{current_user.id}_{filename}"
        else:
            actual_filename = filename
            
        file_path = os.path.join(UPLOAD_DIR, actual_filename)
        if os.path.exists(file_path):
            import gc
            import time
            
            # Robust delete with retries for the PDF file
            deleted_pdf = False
            for i in range(10):
                try:
                    gc.collect()
                    os.remove(file_path)
                    deleted_pdf = True
                    break
                except PermissionError:
                    time.sleep(0.5)
            if not deleted_pdf:
                os.remove(file_path) # final attempt to raise the exception if still locked
                
            # Also remove the extracted text
            doc_id = generate_doc_id(actual_filename)
            json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "utils", "pdf_texts", f"{doc_id}.json")
            if os.path.exists(json_path):
                deleted_json = False
                for i in range(5):
                    try:
                        os.remove(json_path)
                        deleted_json = True
                        break
                    except PermissionError:
                        time.sleep(0.2)
                if not deleted_json:
                    os.remove(json_path)
                
            from utils.pdf_store import delete_document_vectors
            delete_document_vectors(actual_filename)
            
            return {"message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except PermissionError as pe:
        raise HTTPException(
            status_code=409,
            detail=f"The file '{filename}' is currently open or locked in another program (like a PDF viewer, editor, or browser). Please close the file and try again."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

