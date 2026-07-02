import os
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

class RetrievalSystem:
    def __init__(self, model_name="sentence-transformers/all-MiniLM-L6-v2", cache_dir=None):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self.model = None
        self.bm25 = None
        
    def lazy_load_model(self):
        if self.model is None:
            import torch
            device = "cpu"
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            print(f"Loading SentenceTransformer on device: {device}")
            # HuggingFace will cache this model locally
            self.model = SentenceTransformer(self.model_name, cache_folder=self.cache_dir, device=device)
            
    def get_candidate_text(self, cand):
        profile = cand.get("profile", {})
        headline = profile.get("headline", "") or ""
        summary = profile.get("summary", "") or ""
        
        career_texts = []
        for role in cand.get("career_history", []):
            desc = role.get("description", "") or ""
            title = role.get("title", "") or ""
            career_texts.append(f"{title} {desc}")
            
        combined = f"{headline} {summary} " + " ".join(career_texts)
        # Basic cleaning: remove double spaces, lowercase for indexing
        return " ".join(combined.split())

    def precompute_embeddings(self, candidates, batch_size=64):
        self.lazy_load_model()
        texts = [self.get_candidate_text(cand) for cand in candidates]
        # Return numpy array of embeddings (shape: num_candidates, embedding_dim)
        embeddings = self.model.encode(texts, batch_size=batch_size, show_progress_bar=True, normalize_embeddings=True)
        return embeddings

    def compute_embedding_similarities(self, query_text, candidate_embeddings):
        self.lazy_load_model()
        query_emb = self.model.encode([query_text], normalize_embeddings=True)[0]
        # Dot product for normalized embeddings is equivalent to cosine similarity
        similarities = np.dot(candidate_embeddings, query_emb)
        return similarities

    def build_bm25_index(self, candidates):
        tokenized_corpus = []
        for cand in candidates:
            text = self.get_candidate_text(cand)
            tokens = text.lower().split()
            tokenized_corpus.append(tokens)
            
        self.bm25 = BM25Okapi(tokenized_corpus)

    def compute_bm25_scores(self, query_terms):
        if self.bm25 is None:
            raise ValueError("BM25 index has not been built.")
        
        # Query terms: list of skills
        query_tokens = [term.lower() for term in query_terms]
        scores = self.bm25.get_scores(query_tokens)
        return scores

    def save_bm25(self, filepath):
        with open(filepath, 'wb') as f:
            pickle.dump(self.bm25, f)

    def load_bm25(self, filepath):
        with open(filepath, 'rb') as f:
            self.bm25 = pickle.load(f)
