import base64
import logging
import os
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from openai import OpenAI

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neura")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # 2 MB para requests JSON

CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-6-astra")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst")
SYSTEM_PROMPT = os.getenv(
    "NEURA_SYSTEM_PROMPT",
    "Você é a Neura, uma assistente de IA útil, clara, criativa e bem-humorada. "
    "Responda em português do Brasil, a menos que a pessoa peça outro idioma. "
    "Se não souber algo, seja honesta e não invente fatos.",
)


def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "A chave da API não foi configurada. Adicione OPENAI_API_KEY no arquivo .env."
        )
    return OpenAI(api_key=api_key)


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/status")
def status():
    return jsonify({"configured": bool(os.getenv("OPENAI_API_KEY", "").strip())})


@app.post("/api/chat")
def chat():
    data: dict[str, Any] = request.get_json(silent=True) or {}
    messages = data.get("messages")

    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "Envie pelo menos uma mensagem."}), 400

    # Limita tamanho e aceita apenas mensagens simples de usuário/assistente.
    cleaned_messages = []
    for item in messages[-30:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        content = content.strip()
        if content:
            cleaned_messages.append({"role": role, "content": content[:12000]})

    if not cleaned_messages or cleaned_messages[-1]["role"] != "user":
        return jsonify({"error": "A última mensagem precisa ser uma mensagem sua."}), 400

    try:
        client = get_client()
        response = client.responses.create(
            model=CHAT_MODEL,
            instructions=SYSTEM_PROMPT,
            input=cleaned_messages,
        )
        answer = (response.output_text or "").strip()
        if not answer:
            answer = "Não consegui montar uma resposta desta vez. Tente perguntar de outro jeito."
        return jsonify({"answer": answer})
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:  # O detalhe fica no servidor, não no navegador.
        logger.exception("Erro ao gerar resposta de texto")
        return jsonify({"error": "A IA não conseguiu responder agora. Confira a chave, os créditos e tente novamente."}), 502


@app.post("/api/image")
def generate_image():
    data: dict[str, Any] = request.get_json(silent=True) or {}
    prompt = data.get("prompt")
    size = data.get("size", "1024x1024")
    quality = data.get("quality", "medium")

    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({"error": "Escreva como deve ser a imagem."}), 400
    prompt = prompt.strip()[:4000]

    allowed_sizes = {"1024x1024", "1536x1024", "1024x1536"}
    allowed_qualities = {"low", "medium", "high"}
    if size not in allowed_sizes:
        size = "1024x1024"
    if quality not in allowed_qualities:
        quality = "medium"

    try:
        client = get_client()
        result = client.images.generate(
            model=IMAGE_MODEL,
            prompt=prompt,
            size=size,
            quality=quality,
            n=1,
        )
        if not result.data or not result.data[0].b64_json:
            return jsonify({"error": "O serviço não retornou uma imagem. Tente novamente."}), 502

        image_bytes = base64.b64decode(result.data[0].b64_json)
        image_data_url = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
        return jsonify({"image": image_data_url, "prompt": prompt})
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception:
        logger.exception("Erro ao gerar imagem")
        return jsonify({"error": "Não consegui gerar a imagem. Confira a chave, os créditos e tente novamente."}), 502


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "A solicitação ficou grande demais."}), 413


if __name__ == "__main__":
    # Para uso local. Em produção, rode com um servidor WSGI e HTTPS.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
