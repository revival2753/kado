import urllib.request
import json

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtZW93QG1haWwucnUiLCJleHAiOjE3ODE0NTA2NjR9.QFGdOUV3HnjhjilkJ9caz9Q8Sq24MXFfZTkcpG_oiks"

data = json.dumps({"russian": "Hello", "english": "Hello"}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/words",
    data=data,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as response:
    print(response.read().decode())

req = urllib.request.Request(
    "http://127.0.0.1:8000/words",
    headers={"Authorization": f"Bearer {token}"},
    method="GET"
)
with urllib.request.urlopen(req) as response:
    print(response.read().decode())