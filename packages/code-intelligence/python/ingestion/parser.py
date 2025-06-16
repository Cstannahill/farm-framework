"""
Multi-language code parser for extracting semantic entities.

This module handles:
- AST parsing for Python, TypeScript, JavaScript, and other languages
- Entity extraction (functions, classes, components, etc.)
- Dependency relationship mapping
- Metadata collection (complexity, documentation, etc.)
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import ast
import json

@dataclass
class ParsedEntity:
    """Represents a parsed code entity."""
    id: str
    name: str
    entity_type: str
    file_path: str
    line_number: int
    content: str
    docstring: Optional[str] = None
    dependencies: List[str] = None
    metadata: Dict[str, Any] = None

class IntelligentParser:
    """Multi-language parser with deep semantic understanding."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.parsers = {
            '.py': self._parse_python,
            '.ts': self._parse_typescript,
            '.tsx': self._parse_typescript,
            '.js': self._parse_javascript,
            '.jsx': self._parse_javascript,
        }
    
    async def parse_file(self, file_path: Path) -> List[ParsedEntity]:
        """Parse a single file and extract entities."""
        suffix = file_path.suffix.lower()
        
        if suffix not in self.parsers:
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            parser_func = self.parsers[suffix]
            return await parser_func(file_path, content)
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []
    
    async def _parse_python(self, file_path: Path, content: str) -> List[ParsedEntity]:
        """Parse Python files using AST."""
        entities = []
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    entity = ParsedEntity(
                        id=f"{file_path}:{node.name}:{node.lineno}",
                        name=node.name,
                        entity_type="function",
                        file_path=str(file_path),
                        line_number=node.lineno,
                        content=ast.get_source_segment(content, node) or "",
                        docstring=ast.get_docstring(node),
                        dependencies=[],
                        metadata={
                            "async": isinstance(node, ast.AsyncFunctionDef),
                            "decorators": [d.id for d in node.decorator_list if hasattr(d, 'id')],
                            "language": "python"
                        }
                    )
                    entities.append(entity)
                
                elif isinstance(node, ast.ClassDef):
                    entity = ParsedEntity(
                        id=f"{file_path}:{node.name}:{node.lineno}",
                        name=node.name,
                        entity_type="class",
                        file_path=str(file_path),
                        line_number=node.lineno,
                        content=ast.get_source_segment(content, node) or "",
                        docstring=ast.get_docstring(node),
                        dependencies=[],
                        metadata={
                            "bases": [b.id for b in node.bases if hasattr(b, 'id')],
                            "decorators": [d.id for d in node.decorator_list if hasattr(d, 'id')],
                            "language": "python"
                        }
                    )
                    entities.append(entity)
        
        except SyntaxError as e:
            print(f"Syntax error in {file_path}: {e}")
        
        return entities
    
    async def _parse_typescript(self, file_path: Path, content: str) -> List[ParsedEntity]:
        """Parse TypeScript/TSX files."""
        # Placeholder for TypeScript parsing
        # Would use a TypeScript parser library like @typescript-eslint/parser
        entities = []
        
        # Simple regex-based extraction for demo
        import re
        
        # Find function declarations
        func_pattern = r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)'
        for match in re.finditer(func_pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            entities.append(ParsedEntity(
                id=f"{file_path}:{match.group(1)}:{line_num}",
                name=match.group(1),
                entity_type="function",
                file_path=str(file_path),
                line_number=line_num,
                content=match.group(0),
                dependencies=[],
                metadata={"language": "typescript"}
            ))
        
        # Find React components
        component_pattern = r'(?:export\s+)?(?:const|function)\s+(\w+)\s*[=:][^{]*\{[^}]*(?:return|jsx)'
        for match in re.finditer(component_pattern, content, re.DOTALL):
            line_num = content[:match.start()].count('\n') + 1
            entities.append(ParsedEntity(
                id=f"{file_path}:{match.group(1)}:{line_num}",
                name=match.group(1),
                entity_type="component",
                file_path=str(file_path),
                line_number=line_num,
                content=match.group(0)[:200] + "..." if len(match.group(0)) > 200 else match.group(0),
                dependencies=[],
                metadata={"framework": "react", "language": "typescript"}
            ))
        
        return entities
    
    async def _parse_javascript(self, file_path: Path, content: str) -> List[ParsedEntity]:
        """Parse JavaScript/JSX files."""
        # Similar to TypeScript but with JS-specific patterns
        return await self._parse_typescript(file_path, content)


class CodeIndexer:
    """Main indexer that coordinates parsing and storage."""
    
    def __init__(self, project_root: str, config: Dict[str, Any] = None):
        self.project_root = Path(project_root)
        self.config = config or {}
        self.parser = IntelligentParser(config)
        self.entities = []
    
    async def index_project(self) -> List[ParsedEntity]:
        """Index an entire project."""
        include_patterns = self.config.get('include', ['**/*.py', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'])
        exclude_patterns = self.config.get('exclude', ['**/node_modules/**', '**/dist/**', '**/.git/**'])
        
        all_entities = []
        
        for pattern in include_patterns:
            for file_path in self.project_root.glob(pattern):
                if self._should_include_file(file_path, exclude_patterns):
                    entities = await self.parser.parse_file(file_path)
                    all_entities.extend(entities)
        
        self.entities = all_entities
        return all_entities
    
    def _should_include_file(self, file_path: Path, exclude_patterns: List[str]) -> bool:
        """Check if a file should be included in indexing."""
        file_str = str(file_path)
        
        for pattern in exclude_patterns:
            if pattern.replace('**/', '') in file_str:
                return False
        
        return True
    
    async def get_entities_by_type(self, entity_type: str) -> List[ParsedEntity]:
        """Get all entities of a specific type."""
        return [e for e in self.entities if e.entity_type == entity_type]
    
    async def search_entities(self, query: str) -> List[ParsedEntity]:
        """Simple text search through entities."""
        results = []
        query_lower = query.lower()
        
        for entity in self.entities:
            if (query_lower in entity.name.lower() or 
                (entity.docstring and query_lower in entity.docstring.lower()) or
                query_lower in entity.content.lower()):
                results.append(entity)
        
        return results

# Example usage
async def demo_usage():
    """Demonstrate the code intelligence ingestion."""
    indexer = CodeIndexer("/path/to/farm/project")
    entities = await indexer.index_project()
    
    print(f"Indexed {len(entities)} entities")
    
    # Search for authentication-related code
    auth_entities = await indexer.search_entities("authentication")
    print(f"Found {len(auth_entities)} authentication-related entities")
    
    # Get all React components
    components = await indexer.get_entities_by_type("component")
    print(f"Found {len(components)} React components")
