import urllib.request
import urllib.error
import json
import time

EMAIL = "qksdi0717@naver.com"
API_KEY = "685b64b8735e173d67f7770ef499809fe8b46"
PROJECT_NAME = "blogcraft1"

HEADERS = {
    "X-Auth-Email": EMAIL,
    "X-Auth-Key": API_KEY,
    "Content-Type": "application/json"
}

def cf_request(method, url, data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        req.data = json.dumps(data).encode()
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

# 1. Account ID 가져오기
print("계정 정보 가져오는 중...")
accounts = cf_request("GET", "https://api.cloudflare.com/client/v4/accounts")
account_id = accounts["result"][0]["id"]
print(f"Account ID: {account_id}")

# 2. 현재 활성 배포 확인
print("\n현재 활성 배포 확인 중...")
project = cf_request("GET", f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{PROJECT_NAME}")
active_id = project["result"]["canonical_deployment"]["id"]
print(f"활성 배포 ID (유지): {active_id}")

# 3. 전체 배포 목록 가져오기
print("\n전체 배포 목록 가져오는 중...")
deployments = cf_request("GET", f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{PROJECT_NAME}/deployments")
all_deployments = deployments["result"]
print(f"총 {len(all_deployments)}개 배포 발견")

# 4. 활성 배포 제외하고 삭제
to_delete = [d for d in all_deployments if d["id"] != active_id]
print(f"\n삭제 대상: {len(to_delete)}개\n")

for d in to_delete:
    branch = d.get("deployment_trigger", {}).get("metadata", {}).get("branch", "?")
    commit = d.get("deployment_trigger", {}).get("metadata", {}).get("commit_hash", "?")[:7]
    print(f"삭제 중: [{branch}] {commit} - {d['id'][:8]}...", end=" ")
    try:
        cf_request("DELETE", f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{PROJECT_NAME}/deployments/{d['id']}?force=true")
        print("완료")
    except Exception as e:
        print(f"실패: {e}")
    time.sleep(0.3)

print(f"\n완료! 활성 배포 1개만 남겼습니다.")
