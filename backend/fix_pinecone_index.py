"""One-time migration script: delete the old 1024-dim Pinecone index
and recreate it with the correct 384-dim for all-MiniLM-L6-v2.

Run once from the backend/ directory:
    .\\venv\\Scripts\\python.exe fix_pinecone_index.py
"""

import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

API_KEY   = os.getenv("PINECONE_API_KEY", "")
INDEX     = os.getenv("PINECONE_INDEX_NAME", "document-chatbot")
REGION    = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
DIM       = 384          # all-MiniLM-L6-v2
METRIC    = "cosine"

if not API_KEY:
    raise SystemExit("ERROR: PINECONE_API_KEY not found in .env")

pc = Pinecone(api_key=API_KEY)
existing = [idx.name for idx in pc.list_indexes()]

# -- Delete old index --------------------------------------------------------
if INDEX in existing:
    desc = pc.describe_index(INDEX)
    old_dim = desc.dimension
    print(f"Found index '{INDEX}' with dimension={old_dim}")
    if old_dim == DIM:
        print(f"OK: Index already has correct dimension ({DIM}). Nothing to do.")
        raise SystemExit(0)
    print(f"Deleting index '{INDEX}' (dim={old_dim}) ...")
    pc.delete_index(INDEX)
    # Wait until deletion is confirmed
    for _ in range(20):
        time.sleep(3)
        if INDEX not in [i.name for i in pc.list_indexes()]:
            break
    print(f"DONE: Index '{INDEX}' deleted.")
else:
    print(f"Index '{INDEX}' does not exist -- will create fresh.")

# -- Recreate with correct dimension -----------------------------------------
print(f"Creating index '{INDEX}' (dim={DIM}, metric={METRIC}, region={REGION}) ...")
pc.create_index(
    name=INDEX,
    dimension=DIM,
    metric=METRIC,
    spec=ServerlessSpec(cloud="aws", region=REGION),
)

# Wait for it to become ready
for _ in range(30):
    time.sleep(3)
    info = pc.describe_index(INDEX)
    if info.status.get("ready", False):
        break

print(f"SUCCESS: Index '{INDEX}' recreated with dimension={DIM}.")
print("NOTE: Re-upload your PDFs to repopulate the index.")
