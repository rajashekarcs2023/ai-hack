import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv

# Replace variables below to add your own imputs
file_path = 'mancrash.webp'
format = "webp"
prompt = "what do you see in this image, summarize in maximum 40 words"

load_dotenv()

# Put your AWS credentials in a .env file
access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")

client = boto3.client(
    service_name="bedrock-runtime",
    aws_access_key_id=access_key_id,
    aws_secret_access_key=secret_access_key,
    region_name="us-west-2",
)

# The model ID for the model you want to use
model_id = "us.meta.llama3-2-3b-instruct-v1:0"

def openimage(file_path):
    with open(file_path, "rb") as img_file:
        return img_file.read()

data_uri = openimage(file_path)





def parseKeywords(text):
    keywords = []
    if "lying" in text:
        keywords.append("injured")
    if "fire" in text or "flame" in text or "smoke" in text:
        keywords.append("Fire")
    if "collision" in text or "accident" in text:
        keywords.append("Collision")
    if "damage" in text or "destroyed" in text:
        keywords.append("Damage")
    if "injured" in text or "injury" in text:
        keywords.append("injury")

    return ", ".join(keywords)

conversation = [
    {
        "role": "user",
        "content": [{"text": prompt},{"image": {"source": {"bytes": data_uri}, "format": format}}]
    }
]
try:
    response = client.converse(
        modelId="us.meta.llama3-2-11b-instruct-v1:0",
        messages=conversation,
        inferenceConfig={"maxTokens": 512, "temperature": 0.5, "topP": 0.9},
    )

    response_text = response["output"]["message"]["content"][0]["text"] # output of AI model
    parsed_output = parseKeywords(response_text) #parsed output
    print(parsed_output)
except (ClientError, Exception) as e:
    print(f"ERROR: {e}")



