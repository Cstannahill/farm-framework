"""
FARM Code Intelligence Python Backend

This module provides the AI/ML backend for code intelligence features:
- Multi-language code parsing and AST analysis
- Semantic embeddings generation using CodeBERT/sentence transformers
- Vector database operations with ChromaDB
- Natural language query processing
- Architectural pattern detection

Requirements:
- Python 3.8+
- chromadb
- sentence-transformers
- transformers
- torch
- networkx
- numpy
- fastapi (for API endpoints)

Usage:
    # Parse and index a codebase
    from farm_intel.ingestion import CodeIndexer
    
    indexer = CodeIndexer(project_root="/path/to/project")
    await indexer.index_project()
    
    # Query the indexed codebase
    from farm_intel.query import QueryEngine
    
    engine = QueryEngine()
    results = await engine.query("user authentication flow")
"""

__version__ = "0.1.0"
__author__ = "FARM Framework Team"

# This is a Python package placeholder
# The actual implementation would be added in future iterations
