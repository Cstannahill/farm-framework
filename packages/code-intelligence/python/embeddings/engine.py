"""
Embedding engine for generating semantic representations of code.

This module handles:
- Code embedding generation using CodeBERT and sentence transformers
- Hybrid embeddings combining multiple models
- Vector storage and similarity search
- Caching and batch processing
"""

from typing import List, Dict, Any, Optional
import numpy as np
from dataclasses import dataclass

@dataclass
class CodeEmbedding:
    """Represents an embedding for a code entity."""
    entity_id: str
    embedding: np.ndarray
    model_name: str
    timestamp: float

class HybridEmbeddingEngine:
    """Advanced embedding engine with code-specific models."""
    
    def __init__(self, device: str = None):
        self.device = device or self._detect_device()
        self.models = {}
        self.cache = {}
        
    def _detect_device(self) -> str:
        """Detect the best available device for embeddings."""
        try:
            import torch
            return 'cuda' if torch.cuda.is_available() else 'cpu'
        except ImportError:
            return 'cpu'
    
    async def initialize_models(self):
        """Initialize the embedding models."""
        # In a real implementation, this would load:
        # - Microsoft CodeBERT for code understanding
        # - sentence-transformers for semantic similarity
        # - Custom fine-tuned models for specific languages
        
        print(f"Initializing embedding models on {self.device}")
        
        # Placeholder model loading
        self.models = {
            'code': MockCodeBERTModel(),
            'semantic': MockSentenceTransformer(),
            'doc': MockDocumentationModel()
        }
    
    async def embed_entity(self, entity_content: str, entity_type: str = "function") -> np.ndarray:
        """Generate rich embeddings for a code entity."""
        if not self.models:
            await self.initialize_models()
        
        # Check cache first
        cache_key = f"{hash(entity_content)}:{entity_type}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Generate embeddings from multiple models
        embeddings = []
        
        # Code-specific embedding
        code_embedding = await self._embed_code(entity_content)
        embeddings.append(code_embedding)
        
        # Semantic embedding
        semantic_embedding = await self._embed_semantic(entity_content)
        embeddings.append(semantic_embedding)
        
        # Documentation embedding (if available)
        if self._has_documentation(entity_content):
            doc_embedding = await self._embed_documentation(entity_content)
            embeddings.append(doc_embedding)
        
        # Combine embeddings with attention
        combined = self._combine_embeddings(embeddings, entity_type)
        
        # Cache the result
        self.cache[cache_key] = combined
        
        return combined
    
    async def _embed_code(self, code: str) -> np.ndarray:
        """Embed code using code-specific model."""
        model = self.models['code']
        return await model.encode(code, max_length=512)
    
    async def _embed_semantic(self, text: str) -> np.ndarray:
        """Embed text using semantic model."""
        model = self.models['semantic']
        return await model.encode(text, max_length=256)
    
    async def _embed_documentation(self, text: str) -> np.ndarray:
        """Embed documentation/comments."""
        model = self.models['doc']
        return await model.encode(text, max_length=256)
    
    def _has_documentation(self, content: str) -> bool:
        """Check if content has documentation."""
        doc_indicators = ['"""', "'''", '/*', '//', '#']
        return any(indicator in content for indicator in doc_indicators)
    
    def _combine_embeddings(self, embeddings: List[np.ndarray], entity_type: str) -> np.ndarray:
        """Intelligently combine multiple embeddings."""
        if len(embeddings) == 1:
            return embeddings[0]
        
        # Weight embeddings based on entity type
        weights = self._calculate_weights(entity_type, len(embeddings))
        
        # Weighted average
        combined = np.zeros_like(embeddings[0])
        for emb, weight in zip(embeddings, weights):
            # Ensure embeddings have the same dimension
            if emb.shape != combined.shape:
                emb = self._resize_embedding(emb, combined.shape)
            combined += emb * weight
        
        # Normalize
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        
        return combined
    
    def _calculate_weights(self, entity_type: str, num_embeddings: int) -> List[float]:
        """Calculate weights for different embedding types."""
        # Different entity types benefit from different embedding combinations
        if entity_type == "function":
            return [0.6, 0.3, 0.1][:num_embeddings]  # Favor code embedding
        elif entity_type == "component":
            return [0.5, 0.4, 0.1][:num_embeddings]  # Balance code and semantic
        elif entity_type == "class":
            return [0.4, 0.5, 0.1][:num_embeddings]  # Favor semantic understanding
        else:
            # Default balanced weighting
            weight = 1.0 / num_embeddings
            return [weight] * num_embeddings
    
    def _resize_embedding(self, embedding: np.ndarray, target_shape: tuple) -> np.ndarray:
        """Resize embedding to match target shape."""
        if len(embedding) > target_shape[0]:
            return embedding[:target_shape[0]]
        elif len(embedding) < target_shape[0]:
            # Pad with zeros
            padding = np.zeros(target_shape[0] - len(embedding))
            return np.concatenate([embedding, padding])
        return embedding
    
    async def embed_batch(self, entities: List[Dict[str, Any]], batch_size: int = 32) -> List[np.ndarray]:
        """Process multiple entities in batches for efficiency."""
        embeddings = []
        
        for i in range(0, len(entities), batch_size):
            batch = entities[i:i + batch_size]
            batch_embeddings = []
            
            for entity in batch:
                embedding = await self.embed_entity(
                    entity['content'], 
                    entity.get('entity_type', 'function')
                )
                batch_embeddings.append(embedding)
            
            embeddings.extend(batch_embeddings)
        
        return embeddings


# Mock model classes (would be replaced with real implementations)
class MockCodeBERTModel:
    """Mock CodeBERT model for demonstration."""
    
    async def encode(self, code: str, max_length: int = 512) -> np.ndarray:
        """Generate a mock code embedding."""
        # In reality, this would use Microsoft's CodeBERT
        # For demo, generate a random embedding based on code hash
        hash_val = hash(code) % (2**32)
        np.random.seed(hash_val)
        return np.random.random(384).astype(np.float32)

class MockSentenceTransformer:
    """Mock sentence transformer for demonstration."""
    
    async def encode(self, text: str, max_length: int = 256) -> np.ndarray:
        """Generate a mock semantic embedding."""
        # In reality, this would use sentence-transformers library
        hash_val = hash(text) % (2**32)
        np.random.seed(hash_val)
        return np.random.random(384).astype(np.float32)

class MockDocumentationModel:
    """Mock documentation-specific model."""
    
    async def encode(self, text: str, max_length: int = 256) -> np.ndarray:
        """Generate a mock documentation embedding."""
        hash_val = hash(text) % (2**32)
        np.random.seed(hash_val)
        return np.random.random(384).astype(np.float32)


# Example usage
async def demo_embedding():
    """Demonstrate embedding generation."""
    engine = HybridEmbeddingEngine()
    await engine.initialize_models()
    
    # Example code snippets
    function_code = """
    async function authenticateUser(email: string, password: string) {
        const user = await db.users.findOne({ email });
        if (!user) throw new Error('User not found');
        
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) throw new Error('Invalid password');
        
        return generateToken(user);
    }
    """
    
    class_code = """
    class UserService {
        constructor(private db: Database) {}
        
        async createUser(userData: CreateUserData) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            return this.db.users.create({
                ...userData,
                hashedPassword
            });
        }
    }
    """
    
    # Generate embeddings
    func_embedding = await engine.embed_entity(function_code, "function")
    class_embedding = await engine.embed_entity(class_code, "class")
    
    print(f"Function embedding shape: {func_embedding.shape}")
    print(f"Class embedding shape: {class_embedding.shape}")
    
    # Calculate similarity
    similarity = np.dot(func_embedding, class_embedding)
    print(f"Similarity between function and class: {similarity:.3f}")
