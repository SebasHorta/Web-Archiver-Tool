# Import the FastAPI class to create the web application
from fastapi import FastAPI
# Import CORS middleware to allow cross-origin requests (frontend to backend)
from fastapi.middleware.cors import CORSMiddleware

# Create an instance of the FastAPI application
app = FastAPI()

# Add CORS middleware to the app so the frontend (on a different port) can make requests to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin (for development only)
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],    # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],    # Allow all headers
)

# Define a GET endpoint at /api/hello
@app.get("/api/hello")
def hello():
    # When this endpoint is called, return a JSON response with a message
    return {"message": "Hello from Sebas!"}