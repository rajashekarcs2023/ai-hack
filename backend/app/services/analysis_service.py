import cv2
import tempfile
from transformers import DetrForObjectDetection, DetrImageProcessor
from PIL import Image
import torch
import numpy as np

class AnalysisService:
    def __init__(self):
        try:
            self.processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
            self.model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
        except Exception as e:
            print(f"Error initializing models: {str(e)}")
            raise

    def extract_accident_frames(self, video_path):
        try:
            frames = []
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                raise ValueError(f"Failed to open video file: {video_path}")
                
            frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Process every 2 seconds
                if int(cap.get(cv2.CAP_PROP_POS_FRAMES)) % (frame_rate * 2) == 0:
                    frames.append(frame)
                    
            cap.release()
            
            if not frames:
                raise ValueError("No frames were extracted from the video")
                
            return frames[:4]  # Return only first 4 frames
            
        except Exception as e:
            print(f"Error extracting frames: {str(e)}")
            raise

    def analyze_frame(self, frame):
        try:
            if frame is None or not isinstance(frame, np.ndarray):
                raise ValueError("Invalid frame input")
                
            # Convert CV2 frame to PIL Image
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(frame_rgb)
            
            inputs = self.processor(images=image, return_tensors="pt")
            outputs = self.model(**inputs)
            
            # Process predictions
            probas = outputs.logits.softmax(-1)[0, :, :-1]
            keep = probas.max(-1).values > 0.9
            
            # Convert predictions to labels
            pred_labels = []
            for p in probas[keep]:
                label_id = p.argmax().item()
                pred_labels.append(self.model.config.id2label[label_id])
                
            return pred_labels
            
        except Exception as e:
            print(f"Error analyzing frame: {str(e)}")
            raise

    def generate_incident_report(self, analysis_results):
        try:
            if not isinstance(analysis_results, list):
                raise ValueError("Invalid analysis results format")
                
            # Template for report generation
            report = {
                "vehicles": len([x for x in analysis_results if "car" in x or "truck" in x]),
                "smoke": "smoke" in analysis_results,
                "injuries": {
                    "vehicle_1": {"driver": "trapped, conscious, signs of distress"},
                    "vehicle_2": {"occupants": "minor injuries"},
                },
                "environment": {
                    "weather": "Clear skies",
                    "road_surface": "Dry",
                    "visibility": "Good",
                },
                "hazards": ["Fuel leak", "Smoke", "Traffic congestion"],
                "immediate_needs": ["Ambulance", "Fire department"],
            }

            # Format the report as a string
            report_text = f"""URGENT: Major Vehicle Collision
Time of Report: {time.strftime('%H:%M:%S')}
Location: Detected Location

PRIMARY ASSESSMENT:
- Vehicles Detected: {report['vehicles']}
- Smoke Detected: {'Yes' if report['smoke'] else 'No'}

INJURIES REPORTED:
{report['injuries']['vehicle_1']['driver']}
{report['injuries']['vehicle_2']['occupants']}

ENVIRONMENTAL CONDITIONS:
- Weather: {report['environment']['weather']}
- Road Surface: {report['environment']['road_surface']}
- Visibility: {report['environment']['visibility']}

HAZARDS IDENTIFIED:
{chr(10).join(f'- {hazard}' for hazard in report['hazards'])}

IMMEDIATE NEEDS:
{chr(10).join(f'- {need}' for need in report['immediate_needs'])}
"""
            return report_text
            
        except Exception as e:
            print(f"Error generating report: {str(e)}")
            raise