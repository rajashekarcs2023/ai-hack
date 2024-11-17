from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .services.s3_service import S3Service
from .services.analysis_service import AnalysisService
import tempfile
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
        
        # Create temporary file for video processing
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
            try:
                # Download video from S3
                s3_service.download_video(video_key, temp_file.name)
                
                # Extract frames
                frames = analysis_service.extract_accident_frames(temp_file.name)
                
                # Analyze each frame
                analysis_results = []
                for frame in frames:
                    frame_analysis = analysis_service.analyze_frame(frame)
                    analysis_results.extend(frame_analysis)
                
                # Generate incident report
                report = analysis_service.generate_incident_report(analysis_results)
                
                return {
                    "status": "success",
                    "report": report,
                    "frame_count": len(frames)
                }
            
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    print(f"Error deleting temporary file: {str(e)}")
                
    except Exception as e:
        print(f"Error in process_video: {str(e)}")  # Added logging
        raise HTTPException(status_code=500, detail=str(e))