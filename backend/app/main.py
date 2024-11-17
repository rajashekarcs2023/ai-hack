
from dotenv import load_dotenv
import base64
import cv2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .services.s3_service import S3Service
from .services.analysis_service import AnalysisService
import tempfile
import os
import cv2
import base64
import boto3
from typing import Dict
from botocore.exceptions import ClientError
import requests

# Load environment variables
load_dotenv()
VAPI_AUTH_TOKEN = os.getenv('VAPI_AUTH_TOKEN')
VAPI_PHONE_NUMBER_ID = os.getenv('VAPI_PHONE_NUMBER_ID')


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
try:
    s3_service = S3Service()
    analysis_service = AnalysisService()
except ValueError as e:
    print(f"Error initializing S3 service: {str(e)}")
    raise

client = boto3.client(
    service_name="bedrock-runtime",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID1"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY1"),
    region_name="us-west-2",
)

from .services.dynamodb_service import DynamoDBService

# Initialize DynamoDB service
dynamodb_service = DynamoDBService()

@app.post("/api/save-incident")
async def save_incident(incident_data: Dict):
    try:
        response = dynamodb_service.save_incident(incident_data)
        return {
            "status": "success",
            "message": "Incident details saved successfully"
        }
    except Exception as e:
        print(f"Error saving incident: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/get-upload-url")
async def get_upload_url(file_info: dict):
    try:
        if not file_info or 'fileName' not in file_info or 'fileType' not in file_info:
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: fileName and fileType"
            )
            
        upload_url, video_key = s3_service.get_upload_url(
            file_info['fileName'],
            file_info['fileType']
        )
        return {"uploadUrl": upload_url, "videoKey": video_key}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in get_upload_url: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-video")
async def process_video(video_info: dict):
    try:
        video_key = video_info['videoKey']
        
        print(f"Starting processing for video: {video_key}")
        
        # Create temporary file for video processing
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
            try:
                print("Downloading video from S3...")
                # Download video from S3
                s3_service.download_video(video_key, temp_file.name)
                
                print("Processing video...")
                # Use the new process_video method that handles everything
                result = analysis_service.process_video(temp_file.name)
                
                print("Processing complete!")
                print("API Response:", result)  # Debug log
                
                return {
                    "status": "success",
                    "frames": result["frames"],
                    "report": result["report"],
                    "analysis": result["analysis"],  # Add this line
                    "keywords": result["keywords"],
                    "frame_count": len(result["frames"])
                }
            
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    print(f"Error deleting temporary file: {str(e)}")
                
    except Exception as e:
        print(f"Error in process_video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
def create_vapi_call(first_message):
    headers = {
        'Authorization': f'Bearer {VAPI_AUTH_TOKEN}',
        'Content-Type': 'application/json',
    }

    data = {
        'assistant': {
            "firstMessage": first_message,
            "model": {
                "provider": "openai",
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an emergency dispatch coordinator. Your role is to clearly communicate critical incident details including: nature of emergency, location, number of people affected, immediate risks, and required emergency services. Provide information in a clear, concise, and urgent manner appropriate for emergency responders."
                    }
                ]
            },
            "voice": "jennifer-playht"
        },
        'phoneNumberId': VAPI_PHONE_NUMBER_ID,
        'customer': {
            'number': "+16695774085",
        },
    }

    response = requests.post(
        'https://api.vapi.ai/call/phone', 
        headers=headers, 
        json=data
    )

    if response.status_code == 201:
        return {"status": "success", "response": response.json()}
    else:
        raise ValueError(f"Failed to create call: {response.text}")
    

def generate_summary(incident_analysis):
    conversation = [
        {
            "role": "user",
            "content": [{
                "text": f"""
                Summarize this incident analysis into a clear emergency dispatch message:
                {incident_analysis}
                Focus on: location, number of people involved, type of emergency, and immediate risks.
                Keep it under 100 words.
                """
            }],
        }
    ]

    try:
        response = client.converse(
            modelId="us.meta.llama3-2-3b-instruct-v1:0",
            messages=conversation,
            inferenceConfig={
                "maxTokens": 512,
                "temperature": 0.5,
                "topP": 0.9
            }
        )
        
        return response["output"]["message"]["content"][0]["text"]
    except (ClientError, Exception) as e:
        print(f"Bedrock Error: {e}")
        raise ValueError(f"Failed to generate summary: {str(e)}")

@app.post("/api/phone-call")
async def initiate_phone_call(request_data: Dict):
    try:
        incident_analysis = request_data.get('incidentAnalysis')
        if not incident_analysis:
            raise HTTPException(status_code=400, detail="Incident analysis is required")

        # Generate concise summary using Bedrock
        summary = generate_summary(incident_analysis)
        
        # Initiate VAPI call with the summary
        call_response = create_vapi_call(summary)

        return {
            "status": "success",
            "message": "Phone call initiated",
            "summary": summary,
            "call_details": call_response
        }
    except Exception as e:
        print(f"Error in initiate_phone_call: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))