# Neura — assistente de IA com geração de imagens

Um aplicativo web inicial, feito do zero para este projeto. Ele oferece:

- Chat com histórico salvo no navegador.
- Geração de imagens a partir de descrições.
- Formatos quadrado, paisagem e retrato.
- Qualidade rápida, padrão ou alta.
- Chave da API mantida no servidor (não é enviada ao navegador).
- Interface responsiva para computador e celular.

## Antes de começar

Você precisa de Python 3.10 ou mais recente e de uma chave da OpenAI Platform. A API é cobrada separadamente de uma assinatura do ChatGPT; confira os preços e os créditos antes de usar.

Crie sua chave em: https://platform.openai.com/api-keys

## Instalação no Windows

1. Extraia o ZIP para uma pasta.
2. Abra essa pasta no Terminal ou PowerShell.
3. Crie o ambiente e instale as dependências:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

4. Copie `.env.example` para um arquivo chamado `.env`.
5. Abra `.env` e substitua `cole_sua_chave_aqui` pela sua chave real.
6. Inicie o aplicativo:

```powershell
py app.py
```

7. Abra `http://127.0.0.1:5000` no navegador.

## Instalação no macOS ou Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edite `.env`, coloque sua chave e rode:

```bash
python app.py
```

Abra `http://127.0.0.1:5000` no navegador.

## Modelos

Os modelos podem ser trocados no `.env`:

- `OPENAI_CHAT_MODEL`: modelo de texto compatível com a Responses API.
- `OPENAI_IMAGE_MODEL`: modelo de imagem compatível com a Images API.

O padrão do projeto usa `gpt-6-astra` para conversa e `gpt-image-2.5-sunburst` para imagens. Consulte a documentação oficial para modelos e preços atuais.

## Importante antes de publicar na internet

Este projeto é uma base local para desenvolvimento. Antes de disponibilizar publicamente, adicione autenticação, proteção contra abuso e limites de uso, HTTPS, monitoramento e uma política de privacidade. Não coloque sua chave da API no JavaScript nem em um repositório público.
