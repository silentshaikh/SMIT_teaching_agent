import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


# TC-045
@patch("api.routes.reports.get_report_from_store")
def test_get_report_returns_200_when_found(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    assert r.status_code == 200


# TC-046
@patch("api.routes.reports.get_report_from_store")
def test_report_response_has_score(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    data = r.json()
    assert "score" in data
    assert isinstance(data["score"], int)
    assert 0 <= data["score"] <= 100


# TC-047
@patch("api.routes.reports.get_report_from_store")
def test_report_response_has_grade(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    data = r.json()
    assert "grade" in data
    assert data["grade"] in ["A", "B", "C", "D", "F"]


# TC-048
@patch("api.routes.reports.get_report_from_store")
def test_report_response_has_explanation_fields(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    data = r.json()
    assert "explanation_en" in data
    assert "explanation_urdu" in data
    assert len(data["explanation_en"]) > 0
    assert len(data["explanation_urdu"]) > 0


# TC-049
@patch("api.routes.reports.get_report_from_store")
def test_report_response_has_mistakes_list(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    data = r.json()
    assert "mistakes" in data
    assert isinstance(data["mistakes"], list)


# TC-050
@patch("api.routes.reports.get_report_from_store")
def test_report_response_has_suggestions_and_topics(mock_get, client, mock_report_dict):
    mock_get.return_value = mock_report_dict
    sid = mock_report_dict["submission_id"]
    r = client.get(f"/api/v1/report/{sid}")
    data = r.json()
    assert "suggestions" in data
    assert "next_topics" in data
    assert isinstance(data["suggestions"], list)
    assert isinstance(data["next_topics"], list)
