import cv2
import tempfile
import numpy as np
import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv
import time
from PIL import Image
import base64
from io import BytesIO
import time

class AnalysisService:
    def __init__(self):
        load_dotenv()
        
        # Initialize Bedrock client
        self.bedrock_client = boto3.client(
        service_name="bedrock-runtime",
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID1'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY1'),
        region_name=os.getenv('AWS_REGION1')
    )
    
        self.model_id = os.getenv('BEDROCK_MODEL_ID')
    
        if not all([
            os.getenv('AWS_ACCESS_KEY_ID'),
            os.getenv('AWS_SECRET_ACCESS_KEY'),
            os.getenv('AWS_REGION'),
            self.model_id
        ]):
            raise ValueError(
                "Missing required AWS credentials for Bedrock. "
                "Please check your .env file for AWS credentials."
            )

    def extract_accident_frames(self, video_path):
        try:
            frames = []
            timestamps = []
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                raise ValueError(f"Failed to open video file: {video_path}")
                
            frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Get 8 evenly spaced frames instead of 4
            frame_indices = [int(i * total_frames / 4) for i in range(4)]
            
            print(f"Total video frames: {total_frames}")
            print(f"Extracting frames at indices: {frame_indices}")
            
            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret:
                    # Resize frame before adding to list
                    resized_frame = self.resize_image(frame)
                    frames.append(resized_frame)
                    timestamp = idx / frame_rate
                    timestamps.append(f"{int(timestamp//60):02d}:{int(timestamp%60):02d}")
                    print(f"Extracted frame at timestamp: {timestamps[-1]}")
            
            cap.release()
            
            if not frames:
                raise ValueError("No frames were extracted from the video")
            
            print(f"Successfully extracted {len(frames)} frames")
            
            # Convert frames to base64 for response
            frame_data = []
            for i, (frame, timestamp) in enumerate(zip(frames, timestamps)):
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                base64_frame = base64.b64encode(buffer).decode('utf-8')
                frame_data.append({
                    "id": i + 1,
                    "image": base64_frame,
                    "timestamp": timestamp
                })
            
            return frame_data
            
        except Exception as e:
            print(f"Error extracting frames: {str(e)}")
            raise

    def resize_image(self, frame, max_size=1024):
    
        height, width = frame.shape[:2]
        
        # Calculate new size maintaining aspect ratio
        if height > width:
            if height > max_size:
                ratio = max_size / height
                new_height = max_size
                new_width = int(width * ratio)
            else:
                return frame
        else:
            if width > max_size:
                ratio = max_size / width
                new_width = max_size
                new_height = int(height * ratio)
            else:
                return frame
                
        return cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

    def analyze_with_bedrock(self, frame):
        try:
            resized_frame = self.resize_image(frame)
            _, buffer = cv2.imencode('.jpg', resized_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_bytes = buffer.tobytes()
            
            # Initial analysis prompt for each frame
            frame_prompt = """
            Extract only the key information from this frame:
            1. Visible vehicles and damage
            2. Any visible injuries or trapped persons
            3. Visible hazards (smoke, fuel, fire)
            4. Environmental conditions
            5. Emergency services needed

            Be brief and focus only on what's visible in this specific frame.
            """
            
            conversation = [{
                "role": "user",
                "content": [
                    {"text": frame_prompt},
                    {"image": {"source": {"bytes": image_bytes}, "format": "jpeg"}}
                ]
            }]
            
            response = self.bedrock_client.converse(
                modelId="us.meta.llama3-2-11b-instruct-v1:0",
                messages=conversation,
                inferenceConfig={
                    "maxTokens": 256,
                    "temperature": 0.3
                }
            )
            
            return response["output"]["message"]["content"][0]["text"]
                
        except Exception as e:
            print(f"Error analyzing frame with Bedrock: {str(e)}")
            raise

    def process_video(self, video_path):
        try:
            # Extract frames
            frames = self.extract_accident_frames(video_path)
            
            # Analyze frames and generate report
            descriptions = []
            for frame_data in frames:
                # Convert base64 back to cv2 frame for analysis
                img_bytes = base64.b64decode(frame_data['image'])
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                description = self.analyze_with_bedrock(frame)
                descriptions.append(description)

            # Generate comprehensive analysis
            comprehensive_prompt = f"""
    Based on these observations from multiple frames of a vehicle accident scene:
    {' '.join(descriptions)}

    Provide a comprehensive incident analysis with EXACTLY these sections:

    **Vehicle Details:**
    - Number and types of vehicles involved
    - Overall damage assessment
    - Final position of vehicles

    **Casualties and Trapped Persons:**
    - Total number of visible injuries
    - Locations of trapped persons
    - Overall severity assessment

    **Hazard Assessment:**
    - All identified hazards
    - Progression of hazards across frames
    - Current risk level

    **Environmental Conditions:**
    - Overall scene conditions
    - Any changes visible across frames

    **Emergency Services Required:**
    - Priority services needed
    - Special equipment requirements
    - Recommended approach

    Use bullet points for all details and maintain these EXACT section headers.
    Focus on actionable information for emergency responders.
    """

            final_conversation = [{
                "role": "user",
                "content": [{"text": comprehensive_prompt}]
            }]

            final_response = self.bedrock_client.converse(
                modelId="us.meta.llama3-2-11b-instruct-v1:0",
                messages=final_conversation,
                inferenceConfig={
                    "maxTokens": 512,
                    "temperature": 0.5,
                    "topP": 0.9
                }
            )

            comprehensive_analysis = final_response["output"]["message"]["content"][0]["text"]
            
            # Format the analysis into structured sections
            formatted_analysis = self.format_analysis_response(comprehensive_analysis)
            print("Formatted analysis before return:", formatted_analysis)
            print("Analysis section being returned:", formatted_analysis["analysis"])

            # Generate keywords and report
            keywords = self.extract_keywords([comprehensive_analysis])
            report = self.generate_report([comprehensive_analysis], keywords)

            response_data = {
                "status": "success",
                "frames": frames,
                "report": report,
                "analysis": formatted_analysis["analysis"],
                "keywords": keywords
            }
            
            print("Final response data:", response_data)
            return response_data

        except Exception as e:
            print(f"Error processing video: {str(e)}")
            raise



    def format_analysis_response(self, analysis_text):
        """Format the analysis text into structured sections"""
        sections = {
            'analysis': {
                'vehicleDetails': [],
                'casualties': [],
                'hazards': [],
                'environment': [],
                'services': []
            }
        }
        
        current_section = None
        lines = analysis_text.split('\n')
        in_bullet_list = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for section headers
            if "**Vehicle Details:**" in line:
                current_section = 'vehicleDetails'
                in_bullet_list = False
                continue
            elif "**Casualties and Trapped Persons:**" in line:
                current_section = 'casualties'
                in_bullet_list = False
                continue
            elif "**Hazard Assessment:**" in line:
                current_section = 'hazards'
                in_bullet_list = False
                continue
            elif "**Environmental Conditions:**" in line:
                current_section = 'environment'
                in_bullet_list = False
                continue
            elif "**Emergency Services Required:**" in line:
                current_section = 'services'
                in_bullet_list = False
                continue
                
            # Process bullet points
            if current_section and (line.startswith('-') or line.startswith('*') or line.startswith('•')):
                in_bullet_list = True
                # Clean up the bullet point
                cleaned_line = line.lstrip('-*• ').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    sections['analysis'][current_section].append(cleaned_line)
            # Handle nested bullet points
            elif current_section and in_bullet_list and line.strip().startswith('*'):
                cleaned_line = line.lstrip('*• ').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    sections['analysis'][current_section].append(cleaned_line)
        
        return sections



    def extract_keywords(self, descriptions):
            """Extract keywords from descriptions"""
            keywords = []
            combined_text = " ".join(descriptions).lower()
            
            if "fire" in combined_text or "flames" in combined_text:
                keywords.append("Fire Hazard")
            if "smoke" in combined_text:
                keywords.append("Smoke")
            if "trapped" in combined_text:
                keywords.append("Trapped Occupants")
            if "injury" in combined_text or "injured" in combined_text:
                keywords.append("Injuries")
            if "collision" in combined_text or "crash" in combined_text:
                keywords.append("Vehicle Collision")
            if "fuel" in combined_text or "leak" in combined_text:
                keywords.append("Fuel Leak")
                
            return list(set(keywords))

    def generate_report(self, descriptions, keywords):
            """Generate comprehensive report"""
            severity = "HIGH" if any(k in ["Fire Hazard", "Trapped Occupants"] for k in keywords) else "MODERATE"
            
            report = f"""URGENT: Vehicle Incident Report
    Severity Level: {severity}
    Time of Report: {time.strftime('%H:%M:%S')}

    INITIAL ASSESSMENT:
    {chr(10).join(f'- {keyword}' for keyword in keywords)}

    DETAILED ANALYSIS:
    {chr(10).join(f'Frame {i+1}: {desc}' for i, desc in enumerate(descriptions))}

    RECOMMENDED SERVICES:
    {self.get_recommended_services(keywords)}
    """
            return report

    def get_recommended_services(self, keywords):
            services = []
            if "Fire Hazard" in keywords or "Smoke" in keywords:
                services.append("- Fire Department (URGENT)")
            if "Injuries" in keywords or "Trapped Occupants" in keywords:
                services.append("- Emergency Medical Services")
            if "Vehicle Collision" in keywords:
                services.append("- Police")
            if "Fuel Leak" in keywords:
                services.append("- Hazmat Team")
            return "\n".join(services)