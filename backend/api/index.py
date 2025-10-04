from app import app  # import your Flask app
from flask import Request, Response
import os

# Vercel expects a function called 'handler'
def handler(request: Request, response: Response):
    """
    Vercel will call this for every request.
    """
    return app(request.environ, response.start_response)
