from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Prompt Optimizer API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    original_prompt: str
    optimized_prompt: str
    optimization_explanation: str

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Prompt optimization template
OPTIMIZATION_PROMPT = """
You are an expert prompt engineer. Your task is to optimize user prompts for AI models to get better, more specific, and more useful responses.

Please optimize the following prompt according to these rules:

1. Make it more specific and detailed
2. Add clear context and constraints
3. Specify the desired format or structure of the response
4. Include relevant examples if helpful
5. Make it unambiguous and clear
6. Add any necessary role-playing or perspective
7. Ensure it follows best practices for the specific type of request (creative, analytical, technical, etc.)

Original prompt: "{prompt}"

Return ONLY the optimized prompt without any additional explanation or commentary. The response should be the optimized prompt ready to use.
"""

@app.post("/optimize-prompt", response_model=PromptResponse)
async def optimize_prompt(request: PromptRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")

        # Use Gemini to optimize the prompt
        model = genai.GenerativeModel('gemini-2.5-pro')
        
        optimization_instruction = OPTIMIZATION_PROMPT.format(prompt=request.prompt)
        
        response = model.generate_content(optimization_instruction)
        
        if not response.text:
            raise HTTPException(status_code=500, detail="Failed to generate optimized prompt")
        
        optimized_prompt = response.text.strip()
        
        # Generate explanation
        explanation_prompt = f"""
        Explain how this prompt was optimized:

        Original: {request.prompt}
        Optimized: {optimized_prompt}

        Provide a brief explanation of the improvements made in 1-2 sentences.
        """
        
        explanation_response = model.generate_content(explanation_prompt)
        explanation = explanation_response.text.strip() if explanation_response.text else "Prompt was optimized for clarity and specificity."

        logger.info(f"Optimized prompt: {request.prompt[:50]}... -> {optimized_prompt[:50]}...")
        
        return PromptResponse(
            original_prompt=request.prompt,
            optimized_prompt=optimized_prompt,
            optimization_explanation=explanation
        )
        
    except Exception as e:
        logger.error(f"Error optimizing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize prompt: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Prompt Optimizer API"}

@app.get("/")
async def root():
    return {"message": "Prompt Optimizer API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)