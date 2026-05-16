import os
import json
import boto3
from typing import Dict, Any

class BedrockAgent:
    """Agent that uses Amazon Bedrock for LLM inference"""
    
    def __init__(self):
        self.client = boto3.client(
            'bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        )
        self.model_id = os.getenv('BEDROCK_MODEL', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
    
    async def process(self, user_message: str) -> Dict[str, Any]:
        """Process user message and return structured response for A2UI generation"""
        
        system_prompt = """You are a UI generation assistant. Based on the user's request, 
determine what UI components they need and return a structured JSON response.

For forms: Return fields with type, label, placeholder
For cards: Return data with title, subtitle, content, image
For surveys: Return questions with type, options

Response format:
{
    "title": "UI Title",
    "type": "form|card|survey",
    "fields": [...],  // For forms/surveys
    "data": {...}     // For cards
}
"""
        
        # Prepare Bedrock request
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            "temperature": 0.7,
        }
        
        try:
            # Invoke Bedrock
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            assistant_message = response_body['content'][0]['text']
            
            # Extract JSON from response (handle markdown code blocks)
            if '```json' in assistant_message:
                json_str = assistant_message.split('```json')[1].split('```')[0].strip()
            elif '```' in assistant_message:
                json_str = assistant_message.split('```')[1].split('```')[0].strip()
            else:
                json_str = assistant_message.strip()
            
            try:
                structured_response = json.loads(json_str)
            except json.JSONDecodeError:
                # Fallback if parsing fails
                structured_response = self._create_fallback_response(user_message)
            
            return structured_response
            
        except Exception as e:
            print(f"Bedrock error: {e}")
            return self._create_fallback_response(user_message)
    
    def _create_fallback_response(self, message: str) -> Dict[str, Any]:
        """Create a fallback response if Bedrock fails"""
        if "form" in message.lower():
            return {
                "title": "Contact Form",
                "type": "form",
                "fields": [
                    {"type": "text", "name": "name", "label": "Name", "placeholder": "Your name"},
                    {"type": "email", "name": "email", "label": "Email", "placeholder": "your@email.com"},
                    {"type": "text", "name": "message", "label": "Message", "placeholder": "Your message"}
                ]
            }
        elif "card" in message.lower():
            return {
                "title": "User Card",
                "type": "card",
                "data": {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "role": "Developer"
                }
            }
        else:
            return {
                "title": "Survey",
                "type": "survey",
                "fields": [
                    {"type": "text", "question": "What is your name?"},
                    {"type": "choice", "question": "How satisfied are you?", "options": ["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"]}
                ]
            }
