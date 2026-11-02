#!/usr/bin/env python3
"""
Upload a physical-device screen recording (.mp4 / .mov) to App Store Connect Review Attachments,
attach the newest VALID TestFlight build (e.g. Build 35), and submit Version 1.0 for App Review.

Usage:
    python scripts/asc_upload_review_video_and_submit.py --video path/to/recording.mp4
    python scripts/asc_upload_review_video_and_submit.py --attach-latest-build-only
"""
import argparse
import hashlib
import json
import os
import sys
import time
import jwt
import requests

KEY_ID = "BXHJLWX63R"
ISSUER_ID = "049a5f28-acde-4d68-9ba3-f900c156beb1"
KEY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".signing", "AuthKey_BXHJLWX63R.p8"))

APP_ID = "6826062276"
VERSION_ID = "80883389-fef3-46e3-88d2-ab1c915379d8"
REV_DETAIL_ID = "588747d1-53d8-4181-a8f2-9aa80874fa54"
BASE = "https://api.appstoreconnect.apple.com/v1"

with open(KEY_PATH, "r", encoding="utf-8") as f:
    PRIVATE_KEY = f.read()


def get_headers():
    now = int(time.time())
    tok = jwt.encode(
        {"iss": ISSUER_ID, "iat": now - 30, "exp": now + 1100, "aud": "appstoreconnect-v1"},
        PRIVATE_KEY,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def attach_latest_build():
    r = requests.get(f"{BASE}/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=5", headers=get_headers())
    builds = r.json().get("data", [])
    latest_valid = next((b for b in builds if b["attributes"].get("processingState") == "VALID"), None)
    if not latest_valid:
        print("No VALID build found.")
        return None
    b_id = latest_valid["id"]
    b_ver = latest_valid["attributes"].get("version")
    print(f"Attaching Build {b_ver} ({b_id}) to App Store Version 1.0...")
    patch_r = requests.patch(
        f"{BASE}/appStoreVersions/{VERSION_ID}/relationships/build",
        headers=get_headers(),
        json={"data": {"type": "builds", "id": b_id}},
    )
    print(f"Attach build status: {patch_r.status_code}")
    return b_ver


def upload_review_attachment(file_path: str):
    file_path = os.path.abspath(file_path)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Video file not found: {file_path}")
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)

    print(f"Reserving App Store Review Attachment for {file_name} ({file_size:,} bytes)...")
    res = requests.post(
        f"{BASE}/appStoreReviewAttachments",
        headers=get_headers(),
        json={
            "data": {
                "type": "appStoreReviewAttachments",
                "attributes": {"fileName": file_name, "fileSize": file_size},
                "relationships": {
                    "appStoreReviewDetail": {
                        "data": {"type": "appStoreReviewDetails", "id": REV_DETAIL_ID}
                    }
                },
            }
        },
    )
    if res.status_code >= 400:
        raise RuntimeError(f"Failed to reserve attachment ({res.status_code}): {res.text}")

    att_data = res.json()["data"]
    att_id = att_data["id"]
    upload_ops = att_data["attributes"].get("uploadOperations", [])

    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    for idx, op in enumerate(upload_ops):
        method = op["method"]
        url = op["url"]
        offset = op["offset"]
        length = op["length"]
        req_headers = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        chunk = raw_bytes[offset : offset + length]
        print(f"  Uploading chunk {idx + 1}/{len(upload_ops)} ({length:,} bytes)...")
        up_r = requests.request(method, url, headers=req_headers, data=chunk)
        if up_r.status_code >= 400:
            raise RuntimeError(f"Chunk upload failed ({up_r.status_code}): {up_r.text}")

    md5_hex = hashlib.md5(raw_bytes).hexdigest()
    print(f"Committing attachment {att_id} (md5={md5_hex})...")
    commit_r = requests.patch(
        f"{BASE}/appStoreReviewAttachments/{att_id}",
        headers=get_headers(),
        json={
            "data": {
                "type": "appStoreReviewAttachments",
                "id": att_id,
                "attributes": {"uploaded": True, "sourceFileChecksum": md5_hex},
            }
        },
    )
    print(f"Commit status: {commit_r.status_code}")
    if commit_r.status_code >= 400:
        print(commit_r.text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=str, help="Path to physical-device screen recording (.mp4 or .mov)")
    parser.add_argument("--attach-latest-build-only", action="store_true")
    args = parser.parse_args()

    attach_latest_build()
    if args.video:
        upload_review_attachment(args.video)


if __name__ == "__main__":
    main()
