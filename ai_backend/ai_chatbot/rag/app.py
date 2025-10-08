"""
RAG (Retrieval-Augmented Generation) Service.
Provides semantic document search using FAISS vector database and BGE-M3 embeddings.
Indexes FAQ documents and enables natural language search with multilingual support.
Uses cosine similarity (Inner Product on normalized vectors) for relevance scoring.
"""
import os
import json
import pickle
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
VECTOR_DIM = 1024  # BGE-M3 dimension
STORE_PATH = Path("rag/store")
STORE_PATH.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="RAG Service",
    description="Document retrieval and search for chatbot",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class Document(BaseModel):
    id: str
    title: str
    content: str
    content_zh: Optional[str] = None
    category: str
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class SearchRequest(BaseModel):
    query: str
    lang: str = "zh"
    top_k: int = 3
    category: Optional[str] = None

class SearchResult(BaseModel):
    id: str
    title: str
    content: str
    score: float
    category: str
    metadata: Dict[str, Any] = {}

class IngestRequest(BaseModel):
    documents: List[Document]

# Global variables for model and index
embedding_model: Optional[SentenceTransformer] = None
faiss_index: Optional[faiss.Index] = None
document_store: Dict[int, Document] = {}
id_to_index: Dict[str, int] = {}

def initialize_model():
    """
    Initialize the embedding model for document vectorization.
    Tries to load BGE-M3 (1024-dim multilingual model) first,
    falls back to smaller all-MiniLM-L6-v2 (384-dim) if BGE-M3 fails.
    """
    global embedding_model
    try:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        # Fallback to a smaller model if BGE-M3 fails
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Loaded fallback model: all-MiniLM-L6-v2")

def initialize_index():
    """
    Initialize or load FAISS vector index from disk.
    Loads existing index, document store, and ID mappings if available.
    Creates new index with default documents if no existing index found.
    """
    global faiss_index, document_store, id_to_index

    index_path = STORE_PATH / "faiss.index"
    docs_path = STORE_PATH / "documents.pkl"
    mapping_path = STORE_PATH / "id_mapping.pkl"

    # Check if all required files exist
    if index_path.exists() and docs_path.exists() and mapping_path.exists():
        # Load existing index and metadata from disk
        try:
            faiss_index = faiss.read_index(str(index_path))
            with open(docs_path, "rb") as f:
                document_store = pickle.load(f)
            with open(mapping_path, "rb") as f:
                id_to_index = pickle.load(f)
            logger.info(f"Loaded existing index with {faiss_index.ntotal} vectors")
        except Exception as e:
            logger.error(f"Failed to load existing index: {e}")
            create_new_index()
    else:
        # No existing index found, create new one
        create_new_index()

def create_new_index():
    """
    Create a new FAISS index from scratch.
    Uses IndexFlatIP for Inner Product (cosine similarity with normalized vectors).
    Automatically adds default FAQ documents to the new index.
    """
    global faiss_index, document_store, id_to_index

    # Inner Product index for cosine similarity (vectors are normalized)
    faiss_index = faiss.IndexFlatIP(VECTOR_DIM)
    document_store = {}
    id_to_index = {}
    logger.info("Created new FAISS index")

    # Populate with default FAQ documents
    add_default_documents()

def save_index():
    """
    Persist FAISS index and document metadata to disk.
    Saves three files: faiss.index (vectors), documents.pkl (docs), id_mapping.pkl (IDs).
    """
    try:
        index_path = STORE_PATH / "faiss.index"
        docs_path = STORE_PATH / "documents.pkl"
        mapping_path = STORE_PATH / "id_mapping.pkl"

        faiss.write_index(faiss_index, str(index_path))
        with open(docs_path, "wb") as f:
            pickle.dump(document_store, f)
        with open(mapping_path, "wb") as f:
            pickle.dump(id_to_index, f)
        logger.info("Index saved successfully")
    except Exception as e:
        logger.error(f"Failed to save index: {e}")

def add_default_documents():
    """
    Add default FAQ documents to the index.
    Includes bilingual (Chinese/English) FAQs covering common topics:
    expense tracking, budgeting, data export, and category explanations.
    """
    default_docs = [
        Document(
            id="faq_1",
            title="如何添加支出记录",
            content="要添加支出记录，请点击主页的'添加支出'按钮，输入金额、选择类别和商家，然后点击保存。",
            content_zh="要添加支出记录，请点击主页的'添加支出'按钮，输入金额、选择类别和商家，然后点击保存。",
            category="使用指南",
            tags=["添加", "支出", "记录"]
        ),
        Document(
            id="faq_2",
            title="How to add expense",
            content="To add an expense, click the 'Add Expense' button on the home page, enter the amount, select category and merchant, then save.",
            category="Usage Guide",
            tags=["add", "expense", "record"]
        ),
        Document(
            id="faq_3",
            title="如何设置预算",
            content="在'预算'页面，点击'添加预算'，选择类别并设置每月限额。系统会自动跟踪该类别的支出并在接近限额时提醒您。",
            content_zh="在'预算'页面，点击'添加预算'，选择类别并设置每月限额。系统会自动跟踪该类别的支出并在接近限额时提醒您。",
            category="使用指南",
            tags=["预算", "限额", "设置"]
        ),
        Document(
            id="faq_4",
            title="如何导出数据",
            content="在'设置'页面中，选择'导出数据'，选择日期范围和格式（CSV或Excel），然后点击'导出'按钮下载文件。",
            content_zh="在'设置'页面中，选择'导出数据'，选择日期范围和格式（CSV或Excel），然后点击'导出'按钮下载文件。",
            category="数据管理",
            tags=["导出", "数据", "CSV", "Excel"]
        ),
        Document(
            id="faq_5",
            title="支出类别说明",
            content="系统提供多种支出类别：餐饮（日常饮食）、交通（出行费用）、购物（日用品购买）、娱乐（休闲活动）、水电费（日常账单）、医疗（健康相关）、教育（学习费用）、其他（未分类支出）。",
            content_zh="系统提供多种支出类别：餐饮（日常饮食）、交通（出行费用）、购物（日用品购买）、娱乐（休闲活动）、水电费（日常账单）、医疗（健康相关）、教育（学习费用）、其他（未分类支出）。",
            category="功能说明",
            tags=["类别", "分类", "支出类型"]
        )
    ]

    # Index all default documents
    for doc in default_docs:
        add_document_to_index(doc)

def add_document_to_index(document: Document):
    """
    Add a single document to the FAISS index.
    Combines title and content (including Chinese version if available),
    generates normalized embeddings, and stores in index with mappings.

    Args:
        document: Document object to index
    """
    global faiss_index, document_store, id_to_index

    try:
        # Combine title and content for embedding
        text = f"{document.title}\n{document.content}"
        if document.content_zh:
            text += f"\n{document.content_zh}"  # Include Chinese for multilingual search

        # Generate normalized embedding (required for Inner Product similarity)
        embedding = embedding_model.encode([text], normalize_embeddings=True)
        embedding = np.array(embedding).astype('float32')

        # Add vector to FAISS index
        current_index = faiss_index.ntotal
        faiss_index.add(embedding)

        # Store document metadata and create ID mapping
        document_store[current_index] = document
        id_to_index[document.id] = current_index

        logger.info(f"Added document {document.id} to index")

    except Exception as e:
        logger.error(f"Failed to add document {document.id}: {e}")

@app.on_event("startup")
async def startup_event():
    """
    Initialize embedding model and FAISS index on application startup.
    Ensures all components are ready before accepting requests.
    """
    initialize_model()
    initialize_index()

@app.get("/health")
async def health_check():
    """
    Health check endpoint for service monitoring.
    Returns service status, model status, and index size.
    """
    return {
        "status": "healthy",
        "service": "rag",
        "model_loaded": embedding_model is not None,
        "index_size": faiss_index.ntotal if faiss_index else 0
    }

@app.post("/search", response_model=List[SearchResult])
async def search(request: SearchRequest):
    """
    Semantic search endpoint for finding relevant documents.
    Embeds query, searches FAISS index using cosine similarity,
    and returns top-k most relevant documents with scores.

    Args:
        request: SearchRequest with query, language, top_k, and optional category filter

    Returns:
        List of SearchResult objects with matched documents and scores
    """
    try:
        if not embedding_model or not faiss_index:
            raise HTTPException(status_code=503, detail="Service not initialized")

        logger.info(f"Searching for: {request.query}")

        # Convert query to normalized embedding vector
        query_embedding = embedding_model.encode([request.query], normalize_embeddings=True)
        query_embedding = np.array(query_embedding).astype('float32')

        # Search FAISS index for nearest neighbors (higher score = more similar)
        distances, indices = faiss_index.search(query_embedding, request.top_k)

        # Build result list from retrieved documents
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < 0:  # Invalid index from FAISS
                continue

            doc = document_store.get(idx)
            if not doc:
                continue

            # Apply category filter if specified
            if request.category and doc.category != request.category:
                continue

            # Select appropriate language version
            content = doc.content_zh if request.lang == "zh" and doc.content_zh else doc.content

            results.append(SearchResult(
                id=doc.id,
                title=doc.title,
                content=content,
                score=float(distance),  # Higher is better for IP
                category=doc.category,
                metadata=doc.metadata
            ))

        logger.info(f"Found {len(results)} results")
        return results

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest")
async def ingest_documents(request: IngestRequest):
    """
    Batch ingest new documents into the index.
    Processes multiple documents, generates embeddings, and updates FAISS index.
    Persists index to disk after batch completion.

    Args:
        request: IngestRequest with list of documents

    Returns:
        Dictionary with success/failure counts and failed document IDs
    """
    try:
        success_count = 0
        failed_ids = []

        # Process each document individually
        for doc in request.documents:
            try:
                add_document_to_index(doc)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to ingest document {doc.id}: {e}")
                failed_ids.append(doc.id)

        # Persist updated index to disk
        save_index()

        return {
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids,
            "total_documents": faiss_index.ntotal
        }

    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    """
    Ingest documents from uploaded JSON file.
    Expects JSON array of document objects matching Document schema.

    Args:
        file: Uploaded JSON file

    Returns:
        Ingestion result with success/failure counts
    """
    try:
        content = await file.read()
        data = json.loads(content)

        documents = []
        for item in data:
            doc = Document(**item)
            documents.append(doc)

        request = IngestRequest(documents=documents)
        return await ingest_documents(request)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
    except Exception as e:
        logger.error(f"File ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document from the index.
    Note: FAISS doesn't support true deletion, so document is only removed from
    document_store and id_to_index mappings. Vector remains in FAISS index.
    For complete removal, index would need to be rebuilt.

    Args:
        doc_id: Document ID to delete

    Returns:
        Confirmation message
    """
    try:
        if doc_id not in id_to_index:
            raise HTTPException(status_code=404, detail="Document not found")

        # Remove from metadata stores (vector stays in FAISS)
        index = id_to_index[doc_id]
        if index in document_store:
            del document_store[index]
            del id_to_index[doc_id]
            save_index()

        return {"message": f"Document {doc_id} deleted"}

    except Exception as e:
        logger.error(f"Deletion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """
    Get index statistics for monitoring.
    Returns total documents, available categories, model name, and vector dimension.
    """
    return {
        "total_documents": faiss_index.ntotal if faiss_index else 0,
        "categories": list(set(doc.category for doc in document_store.values())),
        "model": EMBEDDING_MODEL,
        "vector_dimension": VECTOR_DIM
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7002, reload=True)