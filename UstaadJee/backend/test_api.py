import requests
import json

url = "http://localhost:8000/api/chat"
payload = {
    "message": "Mujhe kal subah G-13 mein AC technician chahiye"
}

print("Sending request to:", url)
response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2))
