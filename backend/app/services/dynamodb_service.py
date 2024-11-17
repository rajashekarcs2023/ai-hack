import boto3
from datetime import datetime
import uuid
import os

class DynamoDBService:
    def __init__(self):
        self.dynamodb = boto3.resource(
            'dynamodb',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION')
        )
        self.table = self.dynamodb.Table('EmergencyIncidents')

    def save_incident(self, incident_data):
        try:
            item = {
                'incident_id': str(uuid.uuid4()),
                'timestamp': incident_data['timestamp'],
                'incident_report': incident_data['incidentReport'],
                'selected_services': incident_data['selectedServices'],
                'notes': incident_data['notes'],
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.table.put_item(Item=item)
            return response
            
        except Exception as e:
            print(f"Error saving to DynamoDB: {str(e)}")
            raise

    def get_all_incidents(self):
        try:
            response = self.table.scan()
            items = response.get('Items', [])
            
            # Sort by timestamp in descending order (most recent first)
            items.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return items
        except Exception as e:
            print(f"Error scanning DynamoDB: {str(e)}")
            raise