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