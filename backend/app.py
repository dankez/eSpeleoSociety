from dataclasses import dataclass
import base64
import binascii
import json
import logging
import uuid

from backend.audit import AuditEvent
from backend.auth import AuthError, authenticate_bearer, require_any_role
from backend.pagination import InvalidCursorError, paginate_items, parse_limit
from backend.repository import DuplicatePendingEcpRequestError
from backend.serializers import (
    club_to_api,
    ecp_request_to_api,
    ecp_verification_to_api,
    member_detail_to_api,
    member_list_item_to_api,
    member_profile_to_api,
    member_to_api,
    notification_to_api,
    stats_to_api,
)


logger = logging.getLogger(__name__)

API_VERSION = "v1"
MAX_ECP_REQUEST_PHOTO_BYTES = 5 * 1024 * 1024
MEMBER_STATUSES = frozenset({"applicant", "active", "inactive", "blocked"})
ECP_REQUEST_STATUSES = frozenset({"pending", "approved", "rejected"})
ADMIN_ROLES = {"admin"}
STAFF_ROLES = {"admin", "club_president"}


@dataclass(frozen=True)
class ApiResponse:
    status_code: int
    body: str
    headers: dict[str, str]


def json_response(status_code: int, payload: dict) -> ApiResponse:
    return ApiResponse(
        status_code=status_code,
        body=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )


def _get_header(headers: dict, name: str) -> str | None:
    """Case-insensitive header lookup.

    The WSGI adapter (backend/wsgi.py) reconstructs header names with
    str.title(), which turns "X-Request-ID" into "X-Request-Id" (title-casing
    lowercases the "D" in the "ID" acronym). An exact-case or all-lowercase
    match alone therefore misses real client-sent request IDs.
    """
    name_lower = name.lower()
    for key, value in headers.items():
        if key.lower() == name_lower:
            return value
    return None


def error_response(status_code: int, code: str, message: str, request_id: str) -> ApiResponse:
    return json_response(
        status_code,
        {
            "error": {
                "code": code,
                "message": message,
                "requestId": request_id,
            }
        },
    )


class ApiApp:
    def __init__(
        self,
        repository,
        jwt_secret: str | None = None,
        issuer: str = "espeleo-test",
        audience: str = "espeleo-api",
        audit_sink=None,
        token_verifier=None,
    ):
        self.repository = repository
        self.jwt_secret = jwt_secret
        self.issuer = issuer
        self.audience = audience
        self.audit_sink = audit_sink or repository
        self.token_verifier = token_verifier

    def handle_request(self, method: str, path: str, headers=None, query=None, body=None) -> ApiResponse:
        headers = headers or {}
        query = query or {}
        body = body or ""
        request_id = _get_header(headers, "X-Request-ID") or f"req_{uuid.uuid4().hex}"
        context = None
        error_code = None
        route = self._route_template(method, path)
        try:
            if method == "GET" and path == "/api/v1/health":
                response = json_response(200, {"status": "ok", "version": API_VERSION})
            else:
                ecp_verify_token = self._match_ecp_verify_path(method, path)
                if ecp_verify_token is not None:
                    response = self._verify_ecp_token(ecp_verify_token, request_id)
                else:
                    context = authenticate_bearer(
                        headers,
                        jwt_secret=self.jwt_secret,
                        audience=self.audience,
                        issuer=self.issuer,
                        token_verifier=self.token_verifier,
                    )
                    if method == "GET" and path == "/api/v1/clubs":
                        response = self._list_clubs(query, context)
                    elif method == "GET" and path == "/api/v1/me":
                        response = self._get_member_profile(context, request_id)
                    elif method == "POST" and path == "/api/v1/me/ecp-requests":
                        response = self._create_member_ecp_request(context, body, request_id)
                    else:
                        member_id = self._match_member_path(method, path)
                        if member_id is not None:
                            response = self._update_member_profile(member_id, context, body, request_id)
                        else:
                            club_members_id = self._match_club_members_path(method, path)
                            if club_members_id is not None:
                                response = self._list_club_members(club_members_id, query, context)
                            else:
                                response = self._route_admin(method, path, query, context, request_id)
                                if response is None:
                                    response = error_response(404, "not_found", "Endpoint not found.", request_id)
                                    error_code = "not_found"
        except AuthError as exc:
            error_code = exc.code
            response = error_response(exc.status_code, exc.code, exc.message, request_id)
        except InvalidCursorError:
            error_code = "invalid_cursor"
            response = error_response(400, "invalid_cursor", "Pagination cursor is invalid or corrupted.", request_id)
        self._record_audit_event(request_id, method, route, response, context, error_code)
        return response

    def _record_audit_event(self, request_id: str, method: str, route: str, response: ApiResponse, context, error_code):
        recorder = getattr(self.audit_sink, "record_api_audit_event", None)
        if not recorder:
            return
        subject = context.subject if context else "anonymous"
        roles = tuple(sorted(context.roles)) if context else ()
        if response.status_code < 400:
            outcome = "success"
        elif response.status_code < 500:
            outcome = "client_error"
        else:
            outcome = "server_error"
        event = AuditEvent(
            request_id=request_id,
            method=method,
            route=route,
            status_code=response.status_code,
            subject=subject,
            roles=roles,
            outcome=outcome,
            error_code=error_code,
        )
        try:
            recorder(event)
        except Exception:
            logger.exception("Failed to record API audit event for request_id=%s", request_id)

    def _route_template(self, method: str, path: str) -> str:
        if method == "GET" and path == "/api/v1/health":
            return "/api/v1/health"
        if method == "GET" and path == "/api/v1/clubs":
            return "/api/v1/clubs"
        if method == "GET" and path == "/api/v1/me":
            return "/api/v1/me"
        if method == "POST" and path == "/api/v1/me/ecp-requests":
            return "/api/v1/me/ecp-requests"
        if self._match_member_path(method, path) is not None:
            return "/api/v1/members/{member_id}"
        if self._match_club_members_path(method, path) is not None:
            return "/api/v1/clubs/{club_id}/members"
        if self._match_ecp_verify_path(method, path) is not None:
            return "/api/v1/ecp/verify/{token}"
        if method == "GET" and path in self.ADMIN_STATIC_ROUTES:
            return path
        if self._match_member_detail_path(method, path) is not None:
            return "/api/v1/members/{member_id}"
        return "unmatched"

    def _list_clubs(self, query: dict, context) -> ApiResponse:
        require_any_role(context, {"admin", "club_president"})
        limit = parse_limit(query.get("limit"))
        cursor = query.get("cursor")
        filter_text = query.get("filter") or query.get("q") or ""
        page, next_cursor = self.repository.list_clubs(
            limit=limit,
            cursor=cursor,
            filter_text=filter_text,
        )
        return json_response(
            200,
            {
                "items": [club_to_api(club) for club in page],
                "nextCursor": next_cursor,
            },
        )

    def _get_member_profile(self, context, request_id: str) -> ApiResponse:
        require_any_role(context, {"member"})
        if context.member_id is None:
            raise AuthError(403, "member_identity_required", "Authenticated caller is not linked to a member profile.")
        profile = self.repository.fetch_member_portal_profile(context.member_id)
        if not profile:
            return error_response(404, "member_profile_not_found", "Member profile was not found.", request_id)
        return json_response(200, member_profile_to_api(profile))

    def _create_member_ecp_request(self, context, body: str, request_id: str) -> ApiResponse:
        require_any_role(context, {"member"})
        if context.member_id is None:
            raise AuthError(403, "member_identity_required", "Authenticated caller is not linked to a member profile.")
        try:
            payload = json.loads(body or "{}")
        except json.JSONDecodeError:
            return error_response(400, "invalid_json", "Request body must be valid JSON.", request_id)
        if not isinstance(payload, dict):
            return error_response(422, "invalid_request_body", "Request body must be a JSON object.", request_id)
        raw_photo = str(payload.get("photoBase64") or "").strip()
        if not raw_photo:
            return error_response(422, "photo_required", "photoBase64 is required.", request_id)
        try:
            photo_bytes = base64.b64decode(raw_photo, validate=True)
        except (binascii.Error, ValueError):
            return error_response(422, "invalid_photo_base64", "photoBase64 must be valid base64.", request_id)
        if not photo_bytes:
            return error_response(422, "photo_required", "photoBase64 is required.", request_id)
        if len(photo_bytes) > MAX_ECP_REQUEST_PHOTO_BYTES:
            return error_response(422, "photo_too_large", "Photo must be 5 MB or smaller.", request_id)
        content_type = str(payload.get("contentType") or "image/jpeg").strip().lower()
        if content_type not in {"image/jpeg", "image/png"}:
            return error_response(422, "unsupported_photo_content_type", "Photo content type must be image/jpeg or image/png.", request_id)
        if payload.get("gdprConsent") is not True:
            return error_response(422, "gdpr_consent_required", "gdprConsent must be true to request eCP.", request_id)
        try:
            request = self.repository.create_member_ecp_request(
                member_id=context.member_id,
                photo_bytes=photo_bytes,
                content_type=content_type,
                gdpr_consent=True,
                notifications_enabled=bool(payload.get("notificationsEnabled", True)),
            )
        except DuplicatePendingEcpRequestError:
            return error_response(
                409,
                "ecp_request_already_pending",
                "Member already has a pending eCP request.",
                request_id,
            )
        return json_response(
            201,
            {
                "id": request.get("request_id"),
                "memberId": request.get("member_id"),
                "ecpRecordId": request.get("ecp_record_id"),
                "photoHash": request.get("photo_hash"),
                "photoUrl": request.get("photo_url"),
                "status": request.get("status"),
                "requestDate": request.get("request_date"),
            },
        )

    def _update_member_profile(self, member_id: int, context, body: str, request_id: str) -> ApiResponse:
        require_any_role(context, {"admin", "club_president"})
        if not context.has_role("admin") and not self.repository.member_belongs_to_any_club(member_id, context.club_ids):
            raise AuthError(403, "forbidden", "Authenticated caller is not allowed to access this member.")
        try:
            payload = json.loads(body or "{}")
        except json.JSONDecodeError:
            return error_response(400, "invalid_json", "Request body must be valid JSON.", request_id)
        if not isinstance(payload, dict):
            return error_response(422, "invalid_request_body", "Request body must be a JSON object.", request_id)

        field_map = {
            "status": "member_status",
            "titlePrefix": "title_prefix",
            "firstName": "first_name",
            "lastName": "last_name",
            "titleSuffix": "title_suffix",
            "email": "email",
            "phone": "phone",
            "discountedMembership": "discounted_membership",
        }
        allowed_statuses = {"applicant", "active", "inactive", "blocked"}
        changes = {}
        for api_field, raw_value in payload.items():
            if api_field not in field_map:
                return error_response(
                    422,
                    "unknown_member_update_field",
                    f"Field '{api_field}' cannot be updated through this endpoint.",
                    request_id,
                )
            db_field = field_map[api_field]
            if db_field == "discounted_membership":
                if not isinstance(raw_value, bool):
                    return error_response(422, "invalid_member_update_value", "discountedMembership must be boolean.", request_id)
                changes[db_field] = raw_value
                continue

            value = "" if raw_value is None else str(raw_value).strip()
            if db_field == "member_status":
                if value not in allowed_statuses:
                    return error_response(422, "invalid_member_status", "Unsupported member status.", request_id)
            elif db_field in {"first_name", "last_name"} and not value:
                return error_response(422, "invalid_member_name", "firstName and lastName cannot be empty.", request_id)
            changes[db_field] = value

        if not changes:
            return error_response(422, "no_update_fields", "At least one member field is required.", request_id)

        try:
            member = self.repository.update_member_profile(member_id, changes)
        except ValueError:
            return error_response(422, "unknown_member_update_field", "Request contains unsupported member fields.", request_id)
        if not member:
            return error_response(404, "member_not_found", "Member was not found.", request_id)
        return json_response(200, member_to_api(member))

    def _list_club_members(self, club_id: int, query: dict, context) -> ApiResponse:
        require_any_role(context, {"admin", "club_president"})
        if not context.has_role("admin") and club_id not in context.club_ids:
            raise AuthError(403, "forbidden", "Authenticated caller is not allowed to access this club.")
        limit = parse_limit(query.get("limit"))
        cursor = query.get("cursor")
        filter_text = query.get("filter") or query.get("q") or ""
        page, next_cursor = self.repository.list_club_members(
            club_id=club_id,
            limit=limit,
            cursor=cursor,
            filter_text=filter_text,
        )
        return json_response(
            200,
            {
                "items": [member_to_api(member) for member in page],
                "nextCursor": next_cursor,
            },
        )

    ADMIN_STATIC_ROUTES = frozenset({
        "/api/v1/members",
        "/api/v1/stats",
        "/api/v1/ecp-requests",
        "/api/v1/notifications",
    })

    def _route_admin(self, method: str, path: str, query: dict, context, request_id: str):
        if method != "GET":
            return None
        if path == "/api/v1/members":
            return self._list_members(query, context, request_id)
        if path == "/api/v1/stats":
            return self._get_stats(context)
        if path == "/api/v1/ecp-requests":
            return self._list_ecp_requests(query, context, request_id)
        if path == "/api/v1/notifications":
            return self._list_notifications(context)
        member_id = self._match_member_detail_path(method, path)
        if member_id is not None:
            return self._get_member_detail(member_id, context, request_id)
        return None

    def _list_members(self, query: dict, context, request_id: str) -> ApiResponse:
        require_any_role(context, STAFF_ROLES)
        status = query.get("status") or None
        if status is not None and status not in MEMBER_STATUSES:
            return error_response(422, "invalid_member_status", "Unsupported member status.", request_id)
        paid = None
        raw_paid = query.get("paid")
        if raw_paid not in (None, ""):
            if raw_paid not in ("true", "false"):
                return error_response(422, "invalid_paid_filter", "paid must be 'true' or 'false'.", request_id)
            paid = raw_paid == "true"

        club_ids = None
        raw_club_id = query.get("clubId")
        if raw_club_id not in (None, ""):
            try:
                club_ids = {int(raw_club_id)}
            except ValueError:
                return error_response(422, "invalid_club_id", "clubId must be an integer.", request_id)

        if not context.has_role("admin"):
            allowed = set(context.club_ids)
            if club_ids is not None and not club_ids <= allowed:
                raise AuthError(403, "forbidden", "Authenticated caller is not allowed to access this club.")
            club_ids = club_ids if club_ids is not None else allowed

        page, next_cursor = self.repository.list_members(
            limit=parse_limit(query.get("limit")),
            cursor=query.get("cursor"),
            filter_text=query.get("filter") or query.get("q") or "",
            club_ids=club_ids,
            status=status,
            paid=paid,
        )
        return json_response(
            200,
            {"items": [member_list_item_to_api(member) for member in page], "nextCursor": next_cursor},
        )

    def _get_member_detail(self, member_id: int, context, request_id: str) -> ApiResponse:
        require_any_role(context, STAFF_ROLES)
        if not context.has_role("admin") and not self.repository.member_belongs_to_any_club(member_id, context.club_ids):
            raise AuthError(403, "forbidden", "Authenticated caller is not allowed to access this member.")
        member = self.repository.fetch_member_detail(member_id)
        if not member:
            return error_response(404, "member_not_found", "Member was not found.", request_id)
        return json_response(200, member_detail_to_api(member))

    def _get_stats(self, context) -> ApiResponse:
        require_any_role(context, ADMIN_ROLES)
        return json_response(200, stats_to_api(self.repository.fetch_dashboard_stats()))

    def _list_ecp_requests(self, query: dict, context, request_id: str) -> ApiResponse:
        require_any_role(context, ADMIN_ROLES)
        status = query.get("status") or None
        if status is not None and status not in ECP_REQUEST_STATUSES:
            return error_response(422, "invalid_ecp_request_status", "Unsupported eCP request status.", request_id)
        page, next_cursor = self.repository.list_ecp_requests(
            limit=parse_limit(query.get("limit")),
            cursor=query.get("cursor"),
            status=status,
        )
        return json_response(200, {"items": [ecp_request_to_api(row) for row in page], "nextCursor": next_cursor})

    def _list_notifications(self, context) -> ApiResponse:
        require_any_role(context, ADMIN_ROLES)
        return json_response(200, {"items": [notification_to_api(row) for row in self.repository.list_notifications()]})

    def _match_member_detail_path(self, method: str, path: str) -> int | None:
        if method != "GET":
            return None
        prefix = "/api/v1/members/"
        if not path.startswith(prefix):
            return None
        raw_id = path[len(prefix):].strip("/")
        if not raw_id or "/" in raw_id:
            return None
        try:
            return int(raw_id)
        except ValueError:
            return None

    def _match_club_members_path(self, method: str, path: str) -> int | None:
        if method != "GET":
            return None
        prefix = "/api/v1/clubs/"
        suffix = "/members"
        if not path.startswith(prefix) or not path.endswith(suffix):
            return None
        raw_id = path[len(prefix):-len(suffix)]
        try:
            return int(raw_id)
        except ValueError:
            return None

    def _match_member_path(self, method: str, path: str) -> int | None:
        if method != "PATCH":
            return None
        prefix = "/api/v1/members/"
        if not path.startswith(prefix):
            return None
        raw_id = path[len(prefix):].strip("/")
        if not raw_id or "/" in raw_id:
            return None
        try:
            return int(raw_id)
        except ValueError:
            return None

    def _verify_ecp_token(self, token: str, request_id: str) -> ApiResponse:
        record = self.repository.fetch_ecp_verification_by_token(token)
        if not record:
            return error_response(404, "ecp_verification_not_found", "eCP verification token was not found.", request_id)
        return json_response(200, ecp_verification_to_api(record))

    def _match_ecp_verify_path(self, method: str, path: str) -> str | None:
        if method != "GET":
            return None
        prefix = "/api/v1/ecp/verify/"
        if not path.startswith(prefix):
            return None
        token = path[len(prefix):].strip("/")
        return token or None
