import sys, json, subprocess, urllib.request
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

TOKEN = dynamic_credential_entry("custom.github", "access_token")["surrogate"].strip()
REPO = "asly-97/openscreen"
BASE = "main"

def api(method, url, body=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=data) as r:
        return json.loads(r.read().decode())

files = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout
paths = [line[3:] for line in files.splitlines() if line.strip()]
print("files:", len(paths))

ref = api("GET", f"https://api.github.com/repos/{REPO}/git/refs/heads/{BASE}")
base_sha = ref["object"]["sha"]
commit = api("GET", f"https://api.github.com/repos/{REPO}/git/commits/{base_sha}")
base_tree = commit["tree"]["sha"]

tree_items = []
for path in paths:
    content = open(path, encoding="utf-8").read()
    blob = api("POST", f"https://api.github.com/repos/{REPO}/git/blobs", {"content": content, "encoding": "utf-8"})
    tree_items.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    print("blob", path)

tree = api("POST", f"https://api.github.com/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree_items})
new_commit = api("POST", f"https://api.github.com/repos/{REPO}/git/commits", {
    "message": "Effects presets + premium settings UI + full-width window drag\n\n- Named Video Effects presets (shadow, roundness, padding, motion blur, background blur, wallpaper): save current look, apply in one click, star one as default and it auto-applies to every new recording. Ships with Screen Studio and Flat built-ins.\n- Default roundness is now a subtler 8px.\n- Video Effects panel redesigned: single-column rows, value badges that never overlap labels.\n- Editor top bar: the whole bar now drags the window; only the actual buttons are no-drag (previously the full-width controls row blocked dragging).",
    "tree": tree["sha"],
    "parents": [base_sha],
})
api("PATCH", f"https://api.github.com/repos/{REPO}/git/refs/heads/{BASE}", {"sha": new_commit["sha"], "force": False})
print("pushed", new_commit["sha"])
