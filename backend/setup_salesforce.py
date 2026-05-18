"""
Creates all UXReach custom objects + fields in Salesforce.

Object creation uses the Metadata API REST deploy (more reliable than Tooling CRUD).
Field creation uses the Tooling API (fast, idempotent).

Run once from the backend/ directory:
    python setup_salesforce.py

Safe to re-run — skips objects/fields that already exist.
"""

import base64
import io
import json
import os
import sys
import time
import zipfile

import requests
from dotenv import load_dotenv

load_dotenv()

API_VERSION = "59.0"


# ── auth ──────────────────────────────────────────────────────────────────────

def _get_token() -> tuple[str, str]:
    consumer_key    = os.getenv("SF_CONSUMER_KEY")
    consumer_secret = os.getenv("SF_CONSUMER_SECRET")
    instance_env    = os.getenv("SF_INSTANCE_URL", "").rstrip("/")

    api_base  = instance_env.replace("lightning.force.com", "my.salesforce.com")
    token_url = f"{api_base}/services/oauth2/token"

    resp = requests.post(token_url, data={
        "grant_type":    "client_credentials",
        "client_id":     consumer_key,
        "client_secret": consumer_secret,
    }, timeout=15)

    if not resp.ok:
        raise SystemExit(f"Auth failed {resp.status_code}: {resp.text}")

    data = resp.json()
    return data["access_token"], data["instance_url"]


# ── tooling helpers ───────────────────────────────────────────────────────────

def _tooling_post(session, base, sobject, payload):
    url  = f"{base}/tooling/sobjects/{sobject}/"
    resp = session.post(url, json=payload, timeout=30)

    if resp.status_code == 400:
        try:
            errs = resp.json()
        except Exception:
            errs = [{"message": resp.text}]
        if not isinstance(errs, list):
            errs = [errs]
        for e in errs:
            msg = e.get("message", "")
            if ("already" in msg.lower() or "duplicate" in msg.lower()
                    or e.get("errorCode", "").upper().startswith("DUPLICATE")):
                return {"_skipped": True}
        print(f"    WARN {sobject}: {resp.text[:200]}")
        return None

    if not resp.ok:
        print(f"    ERROR {resp.status_code} {sobject}: {resp.text[:300]}")
        return None

    return resp.json()


def _object_exists(session, base, api_name) -> bool:
    resp = session.get(
        f"{base}/tooling/query/",
        params={"q": f"SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName = '{api_name}'"},
        timeout=15,
    )
    if resp.ok:
        return len(resp.json().get("records", [])) > 0
    return False


def _create_field(session, base, obj, field, label, ftype, extra=None):
    print(f"    field  {field} … ", end="", flush=True)
    meta = {"label": label, "type": ftype, **(extra or {})}
    result = _tooling_post(session, base, "CustomField", {
        "FullName": f"{obj}.{field}",
        "Metadata": meta,
    })
    if result and result.get("_skipped"):
        print("already exists")
    elif result:
        print("ok")
    else:
        print("FAILED")
    time.sleep(0.3)
    return result


def _picklist_meta(values: list[str]) -> dict:
    return {
        "valueSet": {
            "valueSetDefinition": {
                "sorted": False,
                "value": [
                    {"fullName": v, "label": v, "default": i == 0}
                    for i, v in enumerate(values)
                ],
            }
        }
    }


# ── Metadata API REST deploy ──────────────────────────────────────────────────

# PermissionSet that grants CRUD + FLS on every UXR field so the API user can see them.
_PERMSET_XML = """<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <description>UXReach API field access</description>
    <label>UXReach API Access</label>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>true</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>true</modifyAllRecords>
        <object>UXR_Study__c</object>
        <viewAllRecords>true</viewAllRecords>
    </objectPermissions>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>true</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>true</modifyAllRecords>
        <object>UXR_Participant__c</object>
        <viewAllRecords>true</viewAllRecords>
    </objectPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Study_ID__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Researcher__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.RC_Name__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Status__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Total_Required__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Already_Sent__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Last_Run__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.New_Responses__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.P0_Ready__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.P0_Newly_Marked__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Study__c.Latest_Note__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Participant_ID__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Email__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Phone__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Status__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Invite_Sent__c</field><readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable><field>UXR_Participant__c.Study__c</field><readable>true</readable>
    </fieldPermissions>
</PermissionSet>"""

_PACKAGE_XML = f"""<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>UXR_Study__c</members>
        <members>UXR_Participant__c</members>
        <name>CustomObject</name>
    </types>
    <types>
        <members>UXReachAPIAccess</members>
        <name>PermissionSet</name>
    </types>
    <version>{API_VERSION}</version>
</Package>"""

_STUDY_XML = """<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <deploymentStatus>Deployed</deploymentStatus>
    <label>UXR Study</label>
    <nameField>
        <label>Study Name</label>
        <type>Text</type>
    </nameField>
    <pluralLabel>UXR Studies</pluralLabel>
    <sharingModel>ReadWrite</sharingModel>
    <fields>
        <fullName>Study_ID__c</fullName>
        <label>Study ID</label>
        <length>50</length>
        <required>false</required>
        <type>Text</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>Researcher__c</fullName>
        <label>Researcher</label>
        <length>120</length>
        <required>false</required>
        <type>Text</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>RC_Name__c</fullName>
        <label>RC Name</label>
        <length>120</length>
        <required>false</required>
        <type>Text</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>Status__c</fullName>
        <label>Status</label>
        <required>false</required>
        <type>Picklist</type>
        <valueSet>
            <valueSetDefinition>
                <sorted>false</sorted>
                <value><fullName>Active</fullName><label>Active</label><default>true</default></value>
                <value><fullName>Completed</fullName><label>Completed</label><default>false</default></value>
                <value><fullName>On Hold</fullName><label>On Hold</label><default>false</default></value>
                <value><fullName>Cancelled</fullName><label>Cancelled</label><default>false</default></value>
            </valueSetDefinition>
        </valueSet>
    </fields>
    <fields>
        <fullName>Total_Required__c</fullName>
        <label>Total Required</label>
        <precision>6</precision>
        <scale>0</scale>
        <required>false</required>
        <type>Number</type>
    </fields>
    <fields>
        <fullName>Already_Sent__c</fullName>
        <label>Already Sent</label>
        <precision>6</precision>
        <scale>0</scale>
        <required>false</required>
        <type>Number</type>
    </fields>
    <fields>
        <fullName>Last_Run__c</fullName>
        <label>Last Run</label>
        <length>50</length>
        <required>false</required>
        <type>Text</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>New_Responses__c</fullName>
        <label>New Responses</label>
        <precision>6</precision>
        <scale>0</scale>
        <required>false</required>
        <type>Number</type>
    </fields>
    <fields>
        <fullName>P0_Ready__c</fullName>
        <label>P0 Ready</label>
        <precision>6</precision>
        <scale>0</scale>
        <required>false</required>
        <type>Number</type>
    </fields>
    <fields>
        <fullName>P0_Newly_Marked__c</fullName>
        <label>P0 Newly Marked</label>
        <precision>6</precision>
        <scale>0</scale>
        <required>false</required>
        <type>Number</type>
    </fields>
    <fields>
        <fullName>Latest_Note__c</fullName>
        <label>Latest Note</label>
        <length>32768</length>
        <required>false</required>
        <type>LongTextArea</type>
        <visibleLines>10</visibleLines>
    </fields>
</CustomObject>"""

_PARTICIPANT_XML = """<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <deploymentStatus>Deployed</deploymentStatus>
    <label>UXR Participant</label>
    <nameField>
        <label>Participant Name</label>
        <type>Text</type>
    </nameField>
    <pluralLabel>UXR Participants</pluralLabel>
    <sharingModel>ReadWrite</sharingModel>
    <fields>
        <fullName>Participant_ID__c</fullName>
        <label>Participant ID</label>
        <length>50</length>
        <required>false</required>
        <type>Text</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>Email__c</fullName>
        <label>Email</label>
        <required>false</required>
        <type>Email</type>
        <unique>false</unique>
        <externalId>false</externalId>
    </fields>
    <fields>
        <fullName>Phone__c</fullName>
        <label>Phone</label>
        <required>false</required>
        <type>Phone</type>
    </fields>
    <fields>
        <fullName>Status__c</fullName>
        <label>Status</label>
        <required>false</required>
        <type>Picklist</type>
        <valueSet>
            <valueSetDefinition>
                <sorted>false</sorted>
                <value><fullName>P0</fullName><label>P0</label><default>false</default></value>
                <value><fullName>Shortlisted</fullName><label>Shortlisted</label><default>true</default></value>
                <value><fullName>Invited</fullName><label>Invited</label><default>false</default></value>
                <value><fullName>Responded</fullName><label>Responded</label><default>false</default></value>
                <value><fullName>Completed</fullName><label>Completed</label><default>false</default></value>
                <value><fullName>No Show</fullName><label>No Show</label><default>false</default></value>
            </valueSetDefinition>
        </valueSet>
    </fields>
    <fields>
        <fullName>Invite_Sent__c</fullName>
        <label>Invite Sent</label>
        <defaultValue>false</defaultValue>
        <required>false</required>
        <type>Checkbox</type>
    </fields>
    <fields>
        <fullName>Study__c</fullName>
        <label>Study</label>
        <referenceTo>UXR_Study__c</referenceTo>
        <relationshipLabel>Participants</relationshipLabel>
        <relationshipName>Participants</relationshipName>
        <required>false</required>
        <type>Lookup</type>
    </fields>
</CustomObject>"""


def _deploy_objects(session: requests.Session, base: str) -> bool:
    """Deploy both custom objects (with all fields) via Metadata API REST deploy."""
    print("  Deploying UXR_Study__c + UXR_Participant__c via Metadata API … ", end="", flush=True)

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("package.xml", _PACKAGE_XML)
        zf.writestr("objects/UXR_Study__c.object", _STUDY_XML)
        zf.writestr("objects/UXR_Participant__c.object", _PARTICIPANT_XML)
        zf.writestr("permissionsets/UXReachAPIAccess.permissionset", _PERMSET_XML)

    zip_bytes = zip_buf.getvalue()

    # REST Metadata deploy uses multipart/form-data.
    # Pass Content-Type: None to strip the session's application/json default
    # so requests can set the correct multipart boundary automatically.
    resp = session.post(
        f"{base}/metadata/deployRequest",
        headers={"Content-Type": None},
        files=[
            ("entity_content",  (None, json.dumps({"deployOptions": {
                "allowMissingFiles": False,
                "autoUpdatePackage": False,
                "checkOnly": False,
                "ignoreWarnings": True,
                "rollbackOnError": True,
                "singlePackage": True,
                "testLevel": "NoTestRun",
            }}), "application/json")),
            ("entity_document", ("package.zip", zip_bytes, "application/zip")),
        ],
        timeout=60,
    )

    if not resp.ok:
        print(f"FAILED\n  {resp.status_code}: {resp.text[:300]}")
        return False

    deploy_id = resp.json()["id"]
    print(f"id={deploy_id}", end="", flush=True)

    for _ in range(60):
        time.sleep(3)
        check = session.get(
            f"{base}/metadata/deployRequest/{deploy_id}?includeDetails=true",
            timeout=30,
        )
        if not check.ok:
            print(".", end="", flush=True)
            continue

        result = check.json().get("deployResult", {})
        status = result.get("status", "")
        print(".", end="", flush=True)

        if status == "Succeeded":
            successes = result.get("details", {}).get("componentSuccesses", [])
            print(f" done ({len(successes)} components deployed)")
            return True
        if status in ("Failed", "Canceled"):
            print(f" {status}")
            for f in result.get("details", {}).get("componentFailures", [])[:10]:
                print(f"  FAIL: {f.get('fullName')} — {f.get('problem')}")
            return False

    print(" TIMEOUT")
    return False


# ── field setup ───────────────────────────────────────────────────────────────

def _add_study_fields(session, base):
    print("\n  Fields for UXR_Study__c")
    _create_field(session, base, "UXR_Study__c", "Study_ID__c",        "Study ID",        "Text",     {"length": 50})
    _create_field(session, base, "UXR_Study__c", "Researcher__c",      "Researcher",      "Text",     {"length": 120})
    _create_field(session, base, "UXR_Study__c", "RC_Name__c",         "RC Name",         "Text",     {"length": 120})
    _create_field(session, base, "UXR_Study__c", "Status__c",          "Status",          "Picklist", _picklist_meta(["Active", "Completed", "On Hold", "Cancelled"]))
    _create_field(session, base, "UXR_Study__c", "Total_Required__c",  "Total Required",  "Number",   {"precision": 6, "scale": 0})
    _create_field(session, base, "UXR_Study__c", "Already_Sent__c",    "Already Sent",    "Number",   {"precision": 6, "scale": 0})
    _create_field(session, base, "UXR_Study__c", "Last_Run__c",        "Last Run",        "Text",     {"length": 50})
    _create_field(session, base, "UXR_Study__c", "New_Responses__c",   "New Responses",   "Number",   {"precision": 6, "scale": 0})
    _create_field(session, base, "UXR_Study__c", "P0_Ready__c",        "P0 Ready",        "Number",   {"precision": 6, "scale": 0})
    _create_field(session, base, "UXR_Study__c", "P0_Newly_Marked__c", "P0 Newly Marked", "Number",   {"precision": 6, "scale": 0})


def _add_participant_fields(session, base):
    print("\n  Fields for UXR_Participant__c")
    _create_field(session, base, "UXR_Participant__c", "Participant_ID__c", "Participant ID", "Text",     {"length": 50})
    _create_field(session, base, "UXR_Participant__c", "Email__c",          "Email",          "Email",    {})
    _create_field(session, base, "UXR_Participant__c", "Phone__c",          "Phone",          "Phone",    {})
    _create_field(session, base, "UXR_Participant__c", "Status__c",         "Status",         "Picklist", _picklist_meta(["P0", "Shortlisted", "Invited", "Responded", "Completed", "No Show"]))
    _create_field(session, base, "UXR_Participant__c", "Invite_Sent__c",    "Invite Sent",    "Checkbox", {"defaultValue": False})
    _create_field(session, base, "UXR_Participant__c", "Study__c",          "Study",          "Lookup",   {
        "referenceTo": "UXR_Study__c",
        "relationshipName": "Participants",
        "relationshipLabel": "Participants",
    })


# ── permission set assignment ─────────────────────────────────────────────────

def _assign_permset(session: requests.Session, base: str) -> None:
    """Assign the UXReachAPIAccess permission set to the running user so fields are visible."""
    print("  Assigning UXReachAPIAccess permission set … ", end="", flush=True)

    # Get the PermissionSet Id
    ps_resp = session.get(
        f"{base}/query/",
        params={"q": "SELECT Id FROM PermissionSet WHERE Name = 'UXReachAPIAccess' LIMIT 1"},
        timeout=15,
    )
    if not ps_resp.ok or not ps_resp.json().get("records"):
        print("PermissionSet not found — skipping")
        return
    ps_id = ps_resp.json()["records"][0]["Id"]

    # Get current user Id from the /userinfo endpoint
    ui_resp = session.get(f"{base.rsplit('/services', 1)[0]}/services/oauth2/userinfo", timeout=15)
    # Fallback: query User WHERE Username = SF_USERNAME
    if ui_resp.ok:
        user_id = ui_resp.json().get("user_id")
    else:
        uname = os.getenv("SF_USERNAME", "")
        u_resp = session.get(
            f"{base}/query/",
            params={"q": f"SELECT Id FROM User WHERE Username = '{uname}' LIMIT 1"},
            timeout=15,
        )
        if not u_resp.ok or not u_resp.json().get("records"):
            print("could not resolve user — skipping")
            return
        user_id = u_resp.json()["records"][0]["Id"]

    # Check if already assigned
    chk = session.get(
        f"{base}/query/",
        params={"q": f"SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '{user_id}' AND PermissionSetId = '{ps_id}' LIMIT 1"},
        timeout=15,
    )
    if chk.ok and chk.json().get("records"):
        print("already assigned")
        return

    # Assign
    assign = session.post(
        f"{base}/sobjects/PermissionSetAssignment/",
        json={"AssigneeId": user_id, "PermissionSetId": ps_id},
        timeout=15,
    )
    if assign.ok:
        print("done")
    else:
        print(f"WARN: {assign.status_code} {assign.text[:200]}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("Authenticating with Salesforce…")
    access_token, instance_url = _get_token()
    print(f"Connected: {instance_url}")

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    })

    base = f"{instance_url}/services/data/v{API_VERSION}"

    print()
    ok = _deploy_objects(session, base)
    if not ok:
        print("\nDeploy failed — aborting.")
        sys.exit(1)

    _assign_permset(session, base)

    print("\nDone — UXR_Study__c and UXR_Participant__c are ready.")
    print("Next: run  python seed_salesforce.py  to populate studies.")


if __name__ == "__main__":
    main()
