import litserve as ls
import torch
from torch.utils.data import DataLoader
from PIL import Image
from colpali_engine.models import ColQwen2, ColQwen2Processor
from datasets import Dataset, load_dataset
from tqdm import tqdm
import os

class ColPaliServer(ls.LitAPI):
    def setup(self, device: str):
        self.k = 3
        self.model_name = "vidore/colqwen2-v0.1"
        
        self.model = ColQwen2.from_pretrained(
            self.model_name,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        ).eval()
        self.processor = ColQwen2Processor.from_pretrained(self.model_name)
        self.dataset = load_dataset("vidore/docvqa_test_subsampled")["test"]
        self.images = self.dataset["image"]
        self.embeddings_path = "vidore_colqwen_embs.pt"
        if os.path.exists(self.embeddings_path):
            self.document_embs = torch.load(self.embeddings_path)
        else:
            self.document_dl = DataLoader(
                self.images,
                batch_size=4,
                shuffle=False,
                collate_fn=lambda x: self.processor.process_images(x),
            )
            self.document_embs = []
            for batch in tqdm(self.document_dl):
                with torch.no_grad():
                    batch_docs = {k: v.to(self.model.device) for k, v in batch.items()}
                    embs = self.model(**batch_docs)
                self.document_embs.extend(torch.unbind(embs.to("cpu")))
            torch.save(self.document_embs, self.embeddings_path)

    def decode_request(self, request):
        return request["input"]
    
    def predict(self, x):
        query_dl = DataLoader([x], batch_size=1, collate_fn=lambda x: self.processor.process_queries(x))
        qs = []
        for batch in query_dl:
            with torch.no_grad():
                batch_queries = {k: v.to(self.model.device) for k, v in batch.items()}
                embs = self.model(**batch_queries)
            qs.extend(torch.unbind(embs.to("cpu")))
        scores = self.processor.score(qs, self.document_embs).cpu().numpy()
        return scores

    def encode_response(self, response):
        top_k_idxs = response.argsort(axis=1)[:, -self.k:]
        idxs = top_k_idxs.tolist()
        images = []
        for idx in idxs[0]:
            img = self.images[idx]
            # Convert PIL Image to base64 string for JSON serialization
            import base64
            from io import BytesIO
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            images.append(img_str)
            
        return {
            "output_indices": idxs[0],
            "images": images
        }

if __name__ == "__main__":
    api = ColPaliServer()
    server = ls.LitServer(api, accelerator="auto")
    server.run(port=8000)