"""Tests for Spotify search handler and data module."""

from __future__ import annotations

import json
import time
import urllib.error
from http.client import HTTPResponse
from io import BytesIO
from typing import Any
from unittest.mock import MagicMock, patch

from data.spotify import (
    SpotifyError,
    _pick_image,
    _transform_results,
    get_access_token,
    search,
)
from handlers.spotify_search import handler


def _make_event(
    method: str = "GET",
    query_params: dict[str, str] | None = None,
    user_id: str = "test-user-123",
) -> dict[str, Any]:
    return {
        "httpMethod": method,
        "queryStringParameters": query_params,
        "requestContext": {
            "authorizer": {
                "claims": {"sub": user_id},
            },
        },
    }


_SAMPLE_SPOTIFY_RESPONSE: dict[str, Any] = {
    "artists": {
        "items": [
            {
                "id": "artist-1",
                "name": "Daft Punk",
                "images": [
                    {"url": "https://i.scdn.co/large.jpg", "width": 640, "height": 640},
                    {"url": "https://i.scdn.co/small.jpg", "width": 64, "height": 64},
                ],
                "external_urls": {"spotify": "https://open.spotify.com/artist/artist-1"},
            }
        ]
    },
    "albums": {
        "items": [
            {
                "id": "album-1",
                "name": "Discovery",
                "artists": [{"id": "artist-1", "name": "Daft Punk"}],
                "images": [
                    {"url": "https://i.scdn.co/album-large.jpg", "width": 300, "height": 300},
                ],
                "external_urls": {"spotify": "https://open.spotify.com/album/album-1"},
            }
        ]
    },
    "tracks": {
        "items": [
            {
                "id": "track-1",
                "name": "Around the World",
                "artists": [{"id": "artist-1", "name": "Daft Punk"}],
                "album": {
                    "name": "Homework",
                    "images": [
                        {"url": "https://i.scdn.co/track-thumb.jpg", "width": 64, "height": 64},
                    ],
                },
                "external_urls": {"spotify": "https://open.spotify.com/track/track-1"},
            }
        ]
    },
}


# --- Handler tests ---


@patch("handlers.spotify_search.search")
def test_handler_valid_query(mock_search: MagicMock) -> None:
    mock_search.return_value = {"artists": [{"name": "Daft Punk"}]}
    event = _make_event(query_params={"q": "Daft Punk"})
    response = handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["artists"][0]["name"] == "Daft Punk"
    mock_search.assert_called_once_with("Daft Punk", ["artist", "album", "track"])


@patch("handlers.spotify_search.search")
def test_handler_with_type_param(mock_search: MagicMock) -> None:
    mock_search.return_value = {"artists": []}
    event = _make_event(query_params={"q": "test", "type": "artist"})
    response = handler(event, None)
    assert response["statusCode"] == 200
    mock_search.assert_called_once_with("test", ["artist"])


def test_handler_missing_q_param() -> None:
    event = _make_event(query_params={})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "q parameter is required" in json.loads(response["body"])["error"]


def test_handler_empty_q_param() -> None:
    event = _make_event(query_params={"q": "  "})
    response = handler(event, None)
    assert response["statusCode"] == 400


def test_handler_no_query_params() -> None:
    event = _make_event(query_params=None)
    response = handler(event, None)
    assert response["statusCode"] == 400


def test_handler_invalid_type_param() -> None:
    event = _make_event(query_params={"q": "test", "type": "podcast"})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "type must be one or more of" in json.loads(response["body"])["error"]


@patch("handlers.spotify_search.search")
def test_handler_spotify_429(mock_search: MagicMock) -> None:
    mock_search.side_effect = SpotifyError(429, retry_after="30")
    event = _make_event(query_params={"q": "test"})
    response = handler(event, None)
    assert response["statusCode"] == 429
    assert response["headers"]["Retry-After"] == "30"


@patch("handlers.spotify_search.search")
def test_handler_spotify_429_no_retry_after(mock_search: MagicMock) -> None:
    mock_search.side_effect = SpotifyError(429)
    event = _make_event(query_params={"q": "test"})
    response = handler(event, None)
    assert response["statusCode"] == 429
    assert "Retry-After" not in response["headers"]


@patch("handlers.spotify_search.search")
def test_handler_spotify_500(mock_search: MagicMock) -> None:
    mock_search.side_effect = SpotifyError(500)
    event = _make_event(query_params={"q": "test"})
    response = handler(event, None)
    assert response["statusCode"] == 502
    assert "Spotify unavailable" in json.loads(response["body"])["error"]


def test_handler_unauthorized() -> None:
    event = {
        "httpMethod": "GET",
        "queryStringParameters": {"q": "test"},
        "requestContext": {},
    }
    response = handler(event, None)
    assert response["statusCode"] == 401


def test_handler_options() -> None:
    event = _make_event(method="OPTIONS")
    response = handler(event, None)
    assert response["statusCode"] == 200


def test_handler_post_not_allowed() -> None:
    event = _make_event(method="POST", query_params={"q": "test"})
    response = handler(event, None)
    assert response["statusCode"] == 405


# --- Token caching tests ---


@patch("data.spotify._ssm")
@patch("data.spotify.urllib.request.urlopen")
def test_get_access_token(mock_urlopen: MagicMock, mock_ssm: MagicMock) -> None:
    import data.spotify as spotify_mod

    # Reset module state
    spotify_mod._client_id = None
    spotify_mod._client_secret = None
    spotify_mod._cached_token = None
    spotify_mod._token_expiry = 0.0

    mock_ssm.get_parameters.return_value = {
        "Parameters": [
            {"Name": "/runmaprepeat/spotify/client-id", "Value": "test-client-id"},
            {"Name": "/runmaprepeat/spotify/client-secret", "Value": "test-secret"},
        ]
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({
        "access_token": "test-token-123",
        "token_type": "bearer",
        "expires_in": 3600,
    }).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_urlopen.return_value = mock_resp

    token = get_access_token()
    assert token == "test-token-123"
    mock_ssm.get_parameters.assert_called_once()


@patch("data.spotify._ssm")
@patch("data.spotify.urllib.request.urlopen")
def test_token_caching(mock_urlopen: MagicMock, mock_ssm: MagicMock) -> None:
    import data.spotify as spotify_mod

    spotify_mod._client_id = None
    spotify_mod._client_secret = None
    spotify_mod._cached_token = None
    spotify_mod._token_expiry = 0.0

    mock_ssm.get_parameters.return_value = {
        "Parameters": [
            {"Name": "/runmaprepeat/spotify/client-id", "Value": "cid"},
            {"Name": "/runmaprepeat/spotify/client-secret", "Value": "csecret"},
        ]
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({
        "access_token": "cached-token",
        "token_type": "bearer",
        "expires_in": 3600,
    }).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_urlopen.return_value = mock_resp

    token1 = get_access_token()
    token2 = get_access_token()
    assert token1 == token2 == "cached-token"
    # urlopen called only once (token cached on second call)
    assert mock_urlopen.call_count == 1


@patch("data.spotify._ssm")
@patch("data.spotify.urllib.request.urlopen")
def test_token_refresh_on_expiry(mock_urlopen: MagicMock, mock_ssm: MagicMock) -> None:
    import data.spotify as spotify_mod

    spotify_mod._client_id = "cid"
    spotify_mod._client_secret = "csecret"
    spotify_mod._cached_token = "expired-token"
    spotify_mod._token_expiry = time.time() - 10  # Already expired

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({
        "access_token": "new-token",
        "token_type": "bearer",
        "expires_in": 3600,
    }).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_urlopen.return_value = mock_resp

    token = get_access_token()
    assert token == "new-token"


# --- Response transformation tests ---


def test_transform_results() -> None:
    result = _transform_results(_SAMPLE_SPOTIFY_RESPONSE)

    assert len(result["artists"]) == 1
    assert result["artists"][0]["spotifyId"] == "artist-1"
    assert result["artists"][0]["name"] == "Daft Punk"
    assert result["artists"][0]["type"] == "artist"
    assert result["artists"][0]["spotifyUrl"] == "https://open.spotify.com/artist/artist-1"

    assert len(result["albums"]) == 1
    assert result["albums"][0]["spotifyId"] == "album-1"
    assert result["albums"][0]["artistName"] == "Daft Punk"
    assert result["albums"][0]["type"] == "album"

    assert len(result["tracks"]) == 1
    assert result["tracks"][0]["spotifyId"] == "track-1"
    assert result["tracks"][0]["albumName"] == "Homework"
    assert result["tracks"][0]["artistName"] == "Daft Punk"
    assert result["tracks"][0]["type"] == "track"


def test_transform_results_empty() -> None:
    result = _transform_results({})
    assert result == {}


def test_transform_results_empty_items() -> None:
    result = _transform_results({"artists": {"items": []}, "tracks": {"items": []}})
    assert result["artists"] == []
    assert result["tracks"] == []


def test_transform_results_track_no_artists() -> None:
    raw = {
        "tracks": {
            "items": [
                {
                    "id": "t1",
                    "name": "Unknown",
                    "artists": [],
                    "album": {"name": "Album", "images": []},
                    "external_urls": {"spotify": "https://open.spotify.com/track/t1"},
                }
            ]
        }
    }
    result = _transform_results(raw)
    assert result["tracks"][0]["artistName"] is None


# --- Image selection tests ---


def test_pick_image_selects_smallest_above_min() -> None:
    images = [
        {"url": "large.jpg", "width": 640},
        {"url": "medium.jpg", "width": 300},
        {"url": "small.jpg", "width": 64},
    ]
    assert _pick_image(images) == "small.jpg"


def test_pick_image_no_images() -> None:
    assert _pick_image([]) is None


def test_pick_image_all_below_min() -> None:
    images = [
        {"url": "tiny.jpg", "width": 32},
        {"url": "tinier.jpg", "width": 16},
    ]
    assert _pick_image(images) == "tiny.jpg"


def test_pick_image_custom_min_width() -> None:
    images = [
        {"url": "large.jpg", "width": 640},
        {"url": "medium.jpg", "width": 300},
        {"url": "small.jpg", "width": 64},
    ]
    assert _pick_image(images, min_width=200) == "medium.jpg"


def test_pick_image_exact_min_width() -> None:
    images = [
        {"url": "large.jpg", "width": 640},
        {"url": "exact.jpg", "width": 64},
    ]
    assert _pick_image(images) == "exact.jpg"


# --- Search function tests ---


@patch("data.spotify.get_access_token")
@patch("data.spotify.urllib.request.urlopen")
def test_search_success(mock_urlopen: MagicMock, mock_token: MagicMock) -> None:
    mock_token.return_value = "test-token"
    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(_SAMPLE_SPOTIFY_RESPONSE).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_urlopen.return_value = mock_resp

    result = search("Daft Punk", ["artist", "album", "track"])
    assert "artists" in result
    assert result["artists"][0]["name"] == "Daft Punk"


@patch("data.spotify.get_access_token")
@patch("data.spotify.urllib.request.urlopen")
def test_search_429_error(mock_urlopen: MagicMock, mock_token: MagicMock) -> None:
    mock_token.return_value = "test-token"
    headers = MagicMock()
    headers.get.return_value = "30"
    error = urllib.error.HTTPError(
        url="https://api.spotify.com/v1/search",
        code=429,
        msg="Too Many Requests",
        hdrs=headers,
        fp=BytesIO(b""),
    )
    mock_urlopen.side_effect = error

    try:
        search("test", ["artist"])
        assert False, "Should have raised SpotifyError"
    except SpotifyError as e:
        assert e.status_code == 429
        assert e.retry_after == "30"


@patch("data.spotify.get_access_token")
@patch("data.spotify.urllib.request.urlopen")
def test_search_500_error(mock_urlopen: MagicMock, mock_token: MagicMock) -> None:
    mock_token.return_value = "test-token"
    error = urllib.error.HTTPError(
        url="https://api.spotify.com/v1/search",
        code=500,
        msg="Internal Server Error",
        hdrs=MagicMock(get=MagicMock(return_value=None)),
        fp=BytesIO(b""),
    )
    mock_urlopen.side_effect = error

    try:
        search("test", ["artist"])
        assert False, "Should have raised SpotifyError"
    except SpotifyError as e:
        assert e.status_code == 500
        assert e.retry_after is None


# --- validate_audio tests ---


from handlers.utils.validation import validate_audio


def test_validate_audio_spotify_valid() -> None:
    audio = {
        "source": "spotify",
        "spotifyId": "abc123",
        "type": "artist",
        "name": "Daft Punk",
        "spotifyUrl": "https://open.spotify.com/artist/abc123",
    }
    assert validate_audio(audio) == []


def test_validate_audio_manual_valid() -> None:
    audio = {"source": "manual", "name": "My Playlist"}
    assert validate_audio(audio) == []


def test_validate_audio_no_source_valid() -> None:
    audio = {"name": "Old format"}
    assert validate_audio(audio) == []


def test_validate_audio_not_dict() -> None:
    assert validate_audio("string") == ["audio must be an object"]


def test_validate_audio_invalid_source() -> None:
    errors = validate_audio({"source": "apple_music", "name": "Test"})
    assert any("audio.source" in e for e in errors)


def test_validate_audio_spotify_missing_fields() -> None:
    audio = {"source": "spotify", "name": "Test"}
    errors = validate_audio(audio)
    assert any("spotifyId" in e for e in errors)
    assert any("audio.type" in e for e in errors)
    assert any("spotifyUrl" in e for e in errors)


def test_validate_audio_spotify_invalid_type() -> None:
    audio = {
        "source": "spotify",
        "spotifyId": "abc",
        "type": "podcast",
        "name": "Test",
        "spotifyUrl": "https://open.spotify.com/...",
    }
    errors = validate_audio(audio)
    assert any("audio.type" in e for e in errors)


def test_validate_audio_manual_missing_name() -> None:
    audio = {"source": "manual"}
    errors = validate_audio(audio)
    assert any("audio.name" in e for e in errors)


def test_validate_audio_optional_artist_album_name() -> None:
    audio = {
        "source": "spotify",
        "spotifyId": "abc",
        "type": "track",
        "name": "Song",
        "spotifyUrl": "https://open.spotify.com/track/abc",
        "artistName": "Artist",
        "albumName": "Album",
    }
    assert validate_audio(audio) == []


def test_validate_audio_invalid_artist_name_type() -> None:
    audio = {
        "source": "manual",
        "name": "Test",
        "artistName": 123,
    }
    errors = validate_audio(audio)
    assert any("artistName" in e for e in errors)
