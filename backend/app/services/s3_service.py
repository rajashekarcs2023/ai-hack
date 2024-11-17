import boto3
import os
from botocore.client import Config
from typing import Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class S3Service:
    def __init__(self):
        # Check if environment variables exist
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region = os.getenv('AWS_REGION')
        self.bucket_name = os.getenv('AWS_BUCKET_NAME')

        # Validate environment variables
        if not all([self.aws_access_key, self.aws_secret_key, self.region, self.bucket_name]):
            raise ValueError(
                "Missing required AWS credentials. Please check your .env file for: "
                "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME"
            )

        self.client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.region,
            config=Config(signature_version='s3v4')
        )

    def get_upload_url(self, file_name: str, content_type: str) -> Tuple[str, str]:
        if not file_name or not content_type:
            raise ValueError("file_name and content_type are required")

        video_key = f"videos/{file_name}"
        try:
            url = self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': video_key,
                    'ContentType': content_type
                },
                ExpiresIn=3600
            )
            return url, video_key
        except Exception as e:
            print(f"Error generating presigned URL: {str(e)}")
            raise

    def download_video(self, video_key: str, local_path: str):
        """Download a video from S3 to a local path"""
        try:
            print(f"Downloading video {video_key} from S3...")
            self.client.download_file(
                self.bucket_name,
                video_key,
                local_path
            )
            print(f"Video downloaded successfully to {local_path}")
        except Exception as e:
            print(f"Error downloading video from S3: {str(e)}")
            raise

    def upload_frame(self, local_path: str, frame_key: str) -> str:
        """Upload a frame to S3 and return its URL"""
        try:
            print(f"Uploading frame {frame_key} to S3...")
            self.client.upload_file(
                local_path,
                self.bucket_name,
                frame_key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'ACL': 'public-read'
                }
            )
            
            # Generate public URL for the frame
            frame_url = f"https://{self.bucket_name}.s3.amazonaws.com/{frame_key}"
            print(f"Frame uploaded successfully. URL: {frame_url}")
            return frame_url
        except Exception as e:
            print(f"Error uploading frame to S3: {str(e)}")
            raise

    def get_video_url(self, video_key: str) -> str:
        """Get the URL of a video in S3"""
        try:
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{video_key}"
            return url
        except Exception as e:
            print(f"Error generating video URL: {str(e)}")
            raise