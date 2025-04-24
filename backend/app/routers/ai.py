from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
import os

router = APIRouter(tags=["ai"])


class AskRequest(BaseModel):
    question: str
    context: str | None = ""


class AskResponse(BaseModel):
    answer: str


HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL_URL = "https://api-inference.huggingface.co/models/johnsnowlabs/JSL-MedLlama-3-8B-v2.0"


async def call_medllama_remote(prompt: str) -> str:
    headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(HF_MODEL_URL, json={"inputs": prompt}, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
            return data[0]["generated_text"]
        return "No answer generated."


@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    prompt = f"Context: {req.context}\nQuestion: {req.question}\nAnswer:"
    try:
        answer = await call_medllama_remote(prompt)
        return AskResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 