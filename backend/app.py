from flask import Flask
from flask_cors import CORS
import os

app = Flask(__name__)

# Read frontend URL from environment, with fallback
frontend_url = os.getenv("FRONTEND_URL", "https://jainrochak05.github.io")

# NOTE: GitHub Pages serves your project under the repo path, 
# so you must include the full subpath here:
allowed_origin = "https://jainrochak05.github.io/EverAuraBeauty"

CORS(
    app,
    origins=[allowed_origin],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

@app.route("/")
def home():
    return {"message": "CORS OK", "allowed_origin": allowed_origin}
