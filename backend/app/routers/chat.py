from fastapi import APIRouter

from app.models.chat import ChatRequest, ChatResponse
from app.services.chat_service import parse_command
from app.services import study_service
from app.services.mock_data import PARTICIPANTS

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_send_invite_html(study_id: str, count: int) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        # Show RC's recent studies as suggestions
        rc_studies = study_service.get_studies_for_rc("Sarah Chen")
        actions = []
        html = f"I couldn't find study {study_id}. Here are your recent studies:<br><br>"
        for s in rc_studies:
            actions.append({
                "label": f"Study {s.id} - {s.name} ({s.already_sent}/{s.total_required} sent)",
                "type": "primary",
                "action": "suggest",
                "payload": f"send 10 invites for study {s.id}",
            })
        html += "Which study would you like to work on?"
        return html, actions

    remaining = study.total_required - study.already_sent
    actual_count = min(count, remaining)
    after_batch = remaining - actual_count

    html = (
        f"<strong>Study {study_id} - {study.name}</strong><br>"
        f"Researcher: {study.researcher}<br><br>"
        f"Currently sending: {actual_count}<br>"
        f"{study.already_sent} already sent out of {study.total_required} required<br>"
        f"After this batch: {after_batch} remaining<br><br>"
        f"Ready to send?"
    )
    actions = [
        {"label": "Send", "type": "primary", "action": "send_now",
         "payload": {"studyId": study_id, "count": actual_count}},
        {"label": "Cancel", "type": "secondary", "action": "cancel"},
    ]
    return html, actions


def _build_status_html(study_id: str) -> tuple[str, list[dict] | None]:
    from app.services.mock_data import AUDIT_RUNS

    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span> Please verify and try again.', None

    remaining = study.total_required - study.already_sent
    html = f"<strong>Status -- Study {study_id}</strong>"
    html += '<table class="msg-table" style="margin-top:8px;">'
    html += f"<tr><td>Study</td><td>{study.name}</td></tr>"
    html += f"<tr><td>Sent</td><td>{study.already_sent} of {study.total_required} required</td></tr>"
    html += f"<tr><td>Remaining</td><td>{remaining}</td></tr>"
    html += f"<tr><td>Last Run</td><td>{study.last_run or 'Never'}</td></tr>"
    html += "</table>"

    runs = [r for r in AUDIT_RUNS if r["study_id"] == study_id]
    if runs:
        html += "<br><strong>Run History</strong>"
        html += '<table class="msg-table" style="margin-top:8px;">'
        for r in runs:
            status_icon = (
                '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--green);">check_circle</span>'
                if r["status"] == "completed"
                else '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--amber);">warning</span>'
            )
            html += f'<tr><td>{r["date"]}</td><td>{r["sent"]} sent &#x2022; {r["duration"]} &#x2022; {status_icon}</td></tr>'
        html += "</table>"

    actions = []
    if remaining > 0:
        send_count = min(remaining, 10)
        actions.append({
            "label": f"Send {send_count} More",
            "type": "primary",
            "action": "suggest",
            "payload": f"send {send_count} invites for study {study_id}",
        })
    return html, actions if actions else None


def _build_daily_summary_html() -> str:
    from app.services.mock_data import AUDIT_RUNS
    from datetime import date

    today = date.today().isoformat()
    today_runs = [r for r in AUDIT_RUNS if r["date"] == today]

    if not today_runs:
        if AUDIT_RUNS:
            latest_date = AUDIT_RUNS[0]["date"]
            latest_runs = [r for r in AUDIT_RUNS if r["date"] == latest_date]
            total_sent = sum(r["sent"] for r in latest_runs)
            html = f"<strong>Latest activity -- {latest_date}</strong><br>"
            for r in latest_runs:
                html += f'&#x2022; Study {r["study_id"]}: {r["sent"]} sent, {r["failed"]} failed<br>'
            html += f"Total: {total_sent} sent"
        else:
            html = "No runs recorded yet."
    else:
        total_sent = sum(r["sent"] for r in today_runs)
        html = f"<strong>Today -- {today}</strong><br>"
        for r in today_runs:
            html += f'&#x2022; Study {r["study_id"]}: {r["sent"]} sent, {r["failed"]} failed<br>'
        html += f"Total: {total_sent} sent today"

    # Add participant status summary across all studies
    total_confirmed = 0
    total_pending_icf = 0
    total_no_response = 0
    for sid, parts in PARTICIPANTS.items():
        total_confirmed += sum(1 for p in parts if p["status"] == "confirmed")
        total_pending_icf += sum(1 for p in parts if p["status"] == "booked" and not p["icf_signed"])
        total_no_response += sum(1 for p in parts if p["status"] == "no_response")

    html += "<br><br><strong>Participant Status (all studies)</strong><br>"
    html += f'<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> {total_confirmed} confirmed &nbsp;&#x2022;&nbsp; '
    html += f'<span style="color:var(--amber);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> {total_pending_icf} pending ICF</span> &nbsp;&#x2022;&nbsp; '
    html += f'<span style="color:var(--rose);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">block</span> {total_no_response} no response</span>'

    return html


def _build_pending_html(rc_name: str) -> tuple[str, list[dict] | None]:
    pending = study_service.get_pending_studies(rc_name)
    if not pending:
        return "All your studies are fully invited. Nothing pending.", None

    html = "<strong>Studies needing invites:</strong><br>"
    actions = []
    for s in pending:
        remaining = s.total_required - s.already_sent
        html += f"&#x2022; Study {s.id} - {s.name} ({s.already_sent}/{s.total_required} sent)<br>"
        actions.append({
            "label": f"Send for {s.id}",
            "type": "primary",
            "action": "suggest",
            "payload": f"send 10 invites for study {s.id}",
        })
    return html, actions if actions else None


def _build_failure_html() -> str:
    from app.services.mock_data import AUDIT_RUNS

    failed_runs = [r for r in AUDIT_RUNS if r["failed"] > 0]
    if not failed_runs:
        return 'No failures recorded. <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>'

    html = "<strong>Runs with failures:</strong><br>"
    for r in failed_runs:
        html += f'&#x2022; {r["date"]} -- Study {r["study_id"]}: {r["failed"]} failed out of {r["sent"] + r["failed"]}<br>'
    return html


def _build_remaining_html(study_id: str | None, rc_name: str) -> tuple[str, list[dict] | None]:
    if study_id:
        study = study_service.get_study(study_id)
        if study is None:
            return f'<span style="color:var(--rose);">Study {study_id} not found.</span> Please verify and try again.', None

        remaining = study.total_required - study.already_sent
        html = f"<strong>Invites remaining -- Study {study_id}</strong>"
        html += '<table class="msg-table" style="margin-top:8px;">'
        html += f"<tr><td>Study</td><td>{study.name}</td></tr>"
        html += f"<tr><td>Sent</td><td>{study.already_sent} of {study.total_required} required</td></tr>"
        html += f"<tr><td>Remaining</td><td><strong>{remaining}</strong></td></tr>"
        html += f"<tr><td>Last run</td><td>{study.last_run or 'Never'}</td></tr>"
        html += "</table>"

        actions = []
        if remaining > 0:
            send_count = min(remaining, 10)
            actions.append({
                "label": f"Send {send_count} now",
                "type": "primary",
                "action": "suggest",
                "payload": f"send {send_count} invites for study {study_id}",
            })
        else:
            html += '<br><span style="color:var(--green);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> All invites sent for this study!</span>'
        return html, actions if actions else None

    # All studies for this RC
    rc_studies = study_service.get_studies_for_rc(rc_name)
    total_remaining = 0
    study_lines = ""
    actions = []
    for s in rc_studies:
        remaining = s.total_required - s.already_sent
        if remaining > 0:
            pct = round((s.already_sent / s.total_required) * 100)
            total_remaining += remaining
            study_lines += f"<tr><td>Study {s.id}</td><td>{s.name}</td><td><strong>{remaining}</strong> left ({pct}% sent)</td></tr>"
            send_count = min(remaining, 10)
            actions.append({
                "label": f"Send for {s.id}",
                "type": "primary",
                "action": "suggest",
                "payload": f"send {send_count} invites for study {s.id}",
            })

    if not study_lines:
        return '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> All your studies are fully invited -- nothing remaining.', None

    html = "<strong>Invites remaining across your studies</strong>"
    html += f'<table class="msg-table" style="margin-top:8px;">{study_lines}</table>'
    html += f"<br>Total: <strong>{total_remaining}</strong> invites still needed"
    return html, actions if actions else None


def _build_my_studies_html(rc_name: str) -> tuple[str, list[dict] | None]:
    rc_studies = study_service.get_studies_for_rc(rc_name)
    if not rc_studies:
        return "No studies found for your account.", None

    study_lines = ""
    actions = []
    for s in rc_studies:
        remaining = s.total_required - s.already_sent
        pct = round((s.already_sent / s.total_required) * 100)
        if remaining == 0:
            icon = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>'
        elif s.already_sent == 0:
            icon = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--text-muted);">radio_button_unchecked</span>'
        else:
            icon = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">fiber_manual_record</span>'
        remaining_text = f'<strong>{remaining}</strong> left' if remaining > 0 else '<span style="color:var(--green);">Done</span>'
        study_lines += f"<tr><td>{icon} Study {s.id}<br><span style='font-size:11px;color:var(--text-faint);'>{s.researcher}</span></td><td>{s.name}</td><td>{s.already_sent}/{s.total_required} ({pct}%)</td><td>{remaining_text}</td></tr>"
        if remaining > 0:
            send_count = min(remaining, 10)
            actions.append({
                "label": f"Send for {s.id}",
                "type": "primary",
                "action": "suggest",
                "payload": f"send {send_count} invites for study {s.id}",
            })

    html = "<strong>Your studies:</strong>"
    html += '<table class="msg-table" style="margin-top:8px;">'
    html += '<tr><td style="font-weight:600;">Study</td><td style="font-weight:600;">Name</td><td style="font-weight:600;">Progress</td><td style="font-weight:600;">Remaining</td></tr>'
    html += study_lines + "</table>"
    return html, actions if actions else None


def _build_schedule_html(study_id: str, count: int, scheduled_time: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span> Please verify the ID and try again.', None

    html = (
        f'<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> <strong>Scheduled:</strong> {count} invites for Study {study_id} - {study.name} on {scheduled_time}.<br>'
        f'<span class="msg-hint">I\'ll notify you when it\'s done.</span>'
    )
    actions = [
        {"label": "Cancel", "type": "danger", "action": "cancel_schedule"},
        {"label": "Confirm", "type": "primary", "action": "confirm_schedule"},
    ]
    return html, actions


def _build_help_html() -> str:
    html = "<strong>Here's what I can help you with:</strong><br><br>"
    html += "<strong>Sending invites</strong><br>"
    html += '&#x2022; <em>"Send 10 invites for study 1234567"</em><br>'
    html += '&#x2022; <em>"Send 5 invites for study 1234567 tomorrow at 9am"</em><br><br>'
    html += "<strong>Filtered sending</strong><br>"
    html += '&#x2022; <em>"Send 5 invites for study 1234567 from Japan"</em><br>'
    html += '&#x2022; <em>"Send 5 invites for study 1234567 from India, large enterprise"</em><br><br>'
    html += "<strong>Checking status</strong><br>"
    html += '&#x2022; <em>"How many invites are left?"</em><br>'
    html += '&#x2022; <em>"Status of study 1234567"</em><br>'
    html += '&#x2022; <em>"Today\'s summary"</em>  &#x2022; <em>"Pending studies"</em>  &#x2022; <em>"My studies"</em><br><br>'
    html += "<strong>Participant tracking</strong><br>"
    html += '&#x2022; <em>"Who responded to study 1234567"</em><br>'
    html += '&#x2022; <em>"Who booked for study 1234567"</em><br>'
    html += '&#x2022; <em>"ICF status for study 1234567"</em><br>'
    html += '&#x2022; <em>"Who needs a reminder for study 1234567"</em><br>'
    html += '&#x2022; <em>"How many confirmed for study 1234567"</em><br>'
    html += '&#x2022; <em>"Study progress 1234567"</em><br><br>'
    html += "<strong>Schedules</strong><br>"
    html += '&#x2022; <em>"Show my scheduled invites"</em><br><br>'
    html += "<strong>Other</strong><br>"
    html += '&#x2022; <em>"What failed?"</em>'
    return html


def _build_responses_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    if not participants:
        return f"No participants tracked yet for Study {study_id}.", None

    confirmed = [p for p in participants if p["status"] == "confirmed"]
    booked = [p for p in participants if p["status"] == "booked"]
    no_response = [p for p in participants if p["status"] == "no_response"]
    declined = [p for p in participants if p["status"] == "declined"]
    invited = [p for p in participants if p["status"] == "invited"]

    html = f"<strong>Participant Responses -- Study {study_id}</strong><br>"
    html += f"<span style='font-size:12px;color:var(--text-muted);'>{study.name}</span><br><br>"
    ico_confirmed = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>'
    ico_booked = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--blue);">event</span>'
    ico_invited = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">hourglass_empty</span>'
    ico_no_resp = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">block</span>'
    ico_declined = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">close</span>'
    html += '<table class="msg-table">'
    html += f'<tr><td>{ico_confirmed} Confirmed</td><td><strong style="color:var(--green);">{len(confirmed)}</strong></td></tr>'
    html += f'<tr><td>{ico_booked} Booked (ICF pending)</td><td><strong style="color:var(--amber);">{len(booked)}</strong></td></tr>'
    html += f'<tr><td>{ico_invited} Recently invited</td><td>{len(invited)}</td></tr>'
    html += f'<tr><td>{ico_no_resp} No response</td><td><strong style="color:var(--rose);">{len(no_response)}</strong></td></tr>'
    html += f'<tr><td>{ico_declined} Declined</td><td>{len(declined)}</td></tr>'
    html += f'<tr style="border-top:1px solid var(--card-border);"><td><strong>Total invited</strong></td><td><strong>{len(participants)}</strong></td></tr>'
    html += '</table>'

    actions = []
    if no_response:
        actions.append({"label": "View who needs reminders", "type": "primary", "action": "suggest",
                        "payload": f"who needs a reminder for study {study_id}"})
    if booked:
        actions.append({"label": "View ICF status", "type": "secondary", "action": "suggest",
                        "payload": f"icf status for study {study_id}"})
    return html, actions if actions else None


def _build_bookings_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    booked = [p for p in participants if p["status"] in ("booked", "confirmed")]

    if not booked:
        return f"No participants have booked calendar slots yet for Study {study_id}.", None

    html = f"<strong>Bookings -- Study {study_id}</strong><br>"
    html += f"<span style='font-size:12px;color:var(--text-muted);'>{study.name}</span><br><br>"
    html += '<table class="msg-table">'
    html += '<tr><td style="font-weight:600;">Participant</td><td style="font-weight:600;">Slot</td><td style="font-weight:600;">ICF</td><td style="font-weight:600;">Status</td></tr>'
    for p in booked:
        icf_icon = (
            '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>'
            if p["icf_signed"]
            else '<span style="color:var(--amber);">Pending</span>'
        )
        status_color = "var(--green)" if p["status"] == "confirmed" else "var(--amber)"
        html += f'<tr><td>{p["name"]}</td><td>{p["booked_slot"] or "—"}</td><td>{icf_icon}</td><td style="color:{status_color};font-weight:500;">{p["status"].title()}</td></tr>'
    html += '</table>'
    html += f'<br>{len(booked)} participant{"s" if len(booked) != 1 else ""} with calendar slots booked.'
    return html, None


def _build_icf_status_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    signed = [p for p in participants if p["icf_signed"]]
    pending = [p for p in participants if p["status"] == "booked" and not p["icf_signed"]]

    html = f"<strong>ICF Status -- Study {study_id}</strong><br>"
    html += f"<span style='font-size:12px;color:var(--text-muted);'>{study.name}</span><br><br>"
    html += f'<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> <strong style="color:var(--green);">{len(signed)}</strong> ICF signed<br>'
    html += f'<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> <strong style="color:var(--amber);">{len(pending)}</strong> booked but ICF pending<br><br>'

    if pending:
        html += '<strong>Pending ICF signatures:</strong>'
        html += '<table class="msg-table" style="margin-top:8px;">'
        for p in pending:
            html += f'<tr><td>{p["name"]}</td><td>Booked: {p["booked_slot"] or "—"}</td><td style="color:var(--amber);">ICF pending</td></tr>'
        html += '</table>'

    actions = []
    if pending:
        actions.append({"label": "Send ICF reminders", "type": "primary", "action": "suggest",
                        "payload": f"who needs a reminder for study {study_id}"})
    return html, actions if actions else None


def _build_reminders_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    needs_reminder = [
        p for p in participants
        if (p["status"] == "no_response" and p["days_since_invite"] >= 1)
        or (p["status"] == "booked" and not p["icf_signed"])
    ]

    if not needs_reminder:
        return f'<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> No participants need reminders for Study {study_id} right now.', None

    no_resp = [p for p in needs_reminder if p["status"] == "no_response"]
    pending_icf = [p for p in needs_reminder if p["status"] == "booked"]

    html = f"<strong>Reminders Needed -- Study {study_id}</strong><br>"
    html += f"<span style='font-size:12px;color:var(--text-muted);'>{study.name}</span><br><br>"

    if no_resp:
        html += f'<strong style="color:var(--rose);">Non-responders ({len(no_resp)}):</strong>'
        html += '<table class="msg-table" style="margin-top:6px;margin-bottom:12px;">'
        for p in no_resp:
            html += f'<tr><td>{p["name"]}</td><td>Invited {p["days_since_invite"]} day{"s" if p["days_since_invite"] != 1 else ""} ago</td><td style="color:var(--rose);">No response</td></tr>'
        html += '</table>'

    if pending_icf:
        html += f'<strong style="color:var(--amber);">Pending ICF ({len(pending_icf)}):</strong>'
        html += '<table class="msg-table" style="margin-top:6px;">'
        for p in pending_icf:
            html += f'<tr><td>{p["name"]}</td><td>Booked: {p["booked_slot"] or "—"}</td><td style="color:var(--amber);">ICF not signed</td></tr>'
        html += '</table>'

    html += f'<br><strong>{len(needs_reminder)}</strong> participant{"s" if len(needs_reminder) != 1 else ""} need{"" if len(needs_reminder) == 1 else ""} follow-up.'
    return html, None


def _build_confirmed_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    confirmed = [p for p in participants if p["status"] == "confirmed"]

    if not confirmed:
        return f"No confirmed participants yet for Study {study_id}.", None

    html = f"<strong>Confirmed Participants -- Study {study_id}</strong><br>"
    html += f"<span style='font-size:12px;color:var(--text-muted);'>{study.name}</span><br><br>"
    html += f'<strong style="color:var(--green);">{len(confirmed)}</strong> participant{"s" if len(confirmed) != 1 else ""} fully confirmed (booked + ICF signed).<br><br>'
    html += '<table class="msg-table">'
    html += '<tr><td style="font-weight:600;">Participant</td><td style="font-weight:600;">Slot</td><td style="font-weight:600;">Status</td></tr>'
    for p in confirmed:
        html += f'<tr><td>{p["name"]}</td><td>{p["booked_slot"] or "—"}</td><td style="color:var(--green);font-weight:500;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--green);">check_circle</span> Confirmed</td></tr>'
    html += '</table>'

    actions = [{"label": "View full progress", "type": "secondary", "action": "suggest",
                "payload": f"study progress {study_id}"}]
    return html, actions


def _build_study_progress_html(study_id: str) -> tuple[str, list[dict] | None]:
    study = study_service.get_study(study_id)
    if study is None:
        return f'<span style="color:var(--rose);">Study {study_id} not found.</span>', None

    participants = PARTICIPANTS.get(study_id, [])
    confirmed = sum(1 for p in participants if p["status"] == "confirmed")
    booked = sum(1 for p in participants if p["status"] == "booked")
    no_response = sum(1 for p in participants if p["status"] == "no_response")
    declined = sum(1 for p in participants if p["status"] == "declined")
    invited = sum(1 for p in participants if p["status"] == "invited")
    pending_icf = sum(1 for p in participants if p["status"] == "booked" and not p["icf_signed"])
    total = len(participants)

    remaining_to_send = study.total_required - study.already_sent

    html = f"<strong>Study Progress -- {study_id}</strong><br>"
    html += f"<span style='font-size:13px;color:var(--text-muted);'>{study.name} &middot; {study.researcher}</span><br><br>"

    # Invite pipeline
    html += '<table class="msg-table">'
    html += f'<tr><td style="font-weight:600;">Invite Pipeline</td><td></td></tr>'
    html += f'<tr><td>Total required</td><td><strong>{study.total_required}</strong></td></tr>'
    html += f'<tr><td>Already sent</td><td>{study.already_sent}</td></tr>'
    html += f'<tr><td>Still to send</td><td style="color:var(--amber);font-weight:600;">{remaining_to_send}</td></tr>'
    html += '</table><br>'

    # Participant funnel
    html += '<table class="msg-table">'
    html += f'<tr><td style="font-weight:600;">Participant Funnel</td><td></td></tr>'
    html += f'<tr><td><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> Confirmed (booked + ICF)</td><td><strong style="color:var(--green);">{confirmed}</strong></td></tr>'
    html += f'<tr><td><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--blue);">event</span> Booked, ICF pending</td><td><strong style="color:var(--amber);">{pending_icf}</strong></td></tr>'
    html += f'<tr><td><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">hourglass_empty</span> Recently invited</td><td>{invited}</td></tr>'
    html += f'<tr><td><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">block</span> No response</td><td><strong style="color:var(--rose);">{no_response}</strong></td></tr>'
    html += f'<tr><td><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">close</span> Declined</td><td>{declined}</td></tr>'
    html += f'<tr style="border-top:1px solid var(--card-border);"><td><strong>Total tracked</strong></td><td><strong>{total}</strong></td></tr>'
    html += '</table>'

    # Attention items
    attention: list[str] = []
    no_resp_48h = sum(1 for p in participants if p["status"] == "no_response" and p["days_since_invite"] >= 2)
    if no_resp_48h:
        attention.append(f"{no_resp_48h} haven't responded in 48h+")
    if pending_icf:
        attention.append(f"{pending_icf} booked but ICF not signed")
    if invited:
        attention.append(f"{invited} recently invited, awaiting response")

    if attention:
        html += '<br><strong><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> Needs attention:</strong><br>'
        for item in attention:
            html += f'&#x2022; {item}<br>'

    actions = []
    if remaining_to_send > 0:
        send_count = min(remaining_to_send, 10)
        actions.append({"label": f"Send {send_count} more invites", "type": "primary", "action": "suggest",
                        "payload": f"send {send_count} invites for study {study_id}"})
    if no_response > 0:
        actions.append({"label": "View reminders needed", "type": "secondary", "action": "suggest",
                        "payload": f"who needs a reminder for study {study_id}"})
    return html, actions if actions else None


def _build_unknown_html() -> str:
    html = (
        "I'm not sure what you mean. Here's what I can help with:<br>"
        '&#x2022; <em>"send X invites for study 1234567"</em><br>'
        '&#x2022; <em>"send 5 invites for study 1234567 from Japan"</em><br>'
        '&#x2022; <em>"how many invites are left?"</em><br>'
        '&#x2022; <em>"status of study 1234567"</em><br>'
        'Or type <em>"help"</em> to see all commands.'
    )
    return html


@router.post("/message", response_model=ChatResponse)
def process_message(req: ChatRequest):
    parsed = parse_command(req.message)

    html = ""
    actions = None
    intent = parsed.intent

    if intent == "send_invite":
        html, actions = _build_send_invite_html(parsed.study_id, parsed.count)

    elif intent == "schedule":
        html, actions = _build_schedule_html(parsed.study_id, parsed.count, parsed.scheduled_time)

    elif intent == "status_query":
        html, actions = _build_status_html(parsed.study_id)

    elif intent == "daily_summary":
        html = _build_daily_summary_html()

    elif intent == "pending_studies":
        html, actions = _build_pending_html(req.user_name)

    elif intent == "failure_report":
        html = _build_failure_html()

    elif intent == "invites_remaining":
        html, actions = _build_remaining_html(parsed.study_id, req.user_name)

    elif intent == "scheduled_query":
        from app.services.mock_data import SCHEDULED_JOBS
        active = [j for j in SCHEDULED_JOBS if j["status"] == "scheduled"]
        if not active:
            html = "You have no scheduled invite jobs right now."
            actions = [{"label": "Schedule one now", "type": "secondary", "action": "suggest",
                        "payload": "Send 10 invites for study 1234567 tomorrow at 9am"}]
        else:
            html = "<strong>Your scheduled invite jobs:</strong>"
            html += '<table class="msg-table" style="margin-top:8px;">'
            html += '<tr><td style="font-weight:600;">Study</td><td style="font-weight:600;">Count</td><td style="font-weight:600;">Scheduled for</td></tr>'
            for j in active:
                html += f'<tr><td>Study {j["study_id"]}<br><span style="font-size:11px;color:var(--text-faint);">{j["study_name"]}</span></td><td>{j["count"]} invites</td><td>{j["scheduled_time"]}</td></tr>'
            html += "</table>"

    elif intent == "my_studies":
        html, actions = _build_my_studies_html(req.user_name)

    elif intent == "responses":
        html, actions = _build_responses_html(parsed.study_id)

    elif intent == "bookings":
        html, actions = _build_bookings_html(parsed.study_id)

    elif intent == "icf_status":
        html, actions = _build_icf_status_html(parsed.study_id)

    elif intent == "reminders_needed":
        html, actions = _build_reminders_html(parsed.study_id)

    elif intent == "confirmed_count":
        html, actions = _build_confirmed_html(parsed.study_id)

    elif intent == "study_progress":
        html, actions = _build_study_progress_html(parsed.study_id)

    elif intent == "help":
        html = _build_help_html()

    else:
        html = _build_unknown_html()

    return ChatResponse(html=html, actions=actions, intent=intent)
