import urllib.request

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwiZXhwIjoxNzgyNDI3NzU2fQ.aDMaARl5mh6pGY_yog7uHKsCCRjtNMxkshje-p3Qjk4"

req = urllib.request.Request(
    "http://127.0.0.1:8000/stats",
    headers={"Authorization": f"Bearer {token}"},
    method="GET"
)
with urllib.request.urlopen(req) as response:
    print(response.read().decode())