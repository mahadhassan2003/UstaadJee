import requests
url = 'http://127.0.0.1:8001/api/chat/transcribe'
files = {'file': ('test.m4a', b'fake audio data', 'audio/m4a')}
response = requests.post(url, files=files)
print(response.status_code)
print(response.text)
