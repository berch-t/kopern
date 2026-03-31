"""
Kopern Code Interpreter — FastAPI server for Cloud Run.

Executes Python, Node.js, or Bash code in isolated tmpdir.
Each request gets its own working directory, cleaned up after execution.
Code runs as non-root user 'executor' (uid 1001) for security.

Auth: Bearer token verified against CODE_INTERPRETER_SECRET env var.
In production, use GCP Workload Identity Federation instead.
"""

import asyncio
import base64
import os
import pwd
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CODE_INTERPRETER_SECRET = os.getenv("CODE_INTERPRETER_SECRET", "")
MAX_CODE_LENGTH = 100_000  # 100KB
MAX_OUTPUT_LENGTH = 50_000  # 50KB stdout
MAX_STDERR_LENGTH = 10_000  # 10KB stderr
MAX_FILE_SIZE = 5_000_000  # 5MB per output file
MAX_OUTPUT_FILES = 10
EXECUTOR_UID = 1001  # 'executor' user

app = FastAPI(
    title="Kopern Code Interpreter",
    version="1.0.0",
    docs_url=None,  # Disable Swagger in production
    redoc_url=None,
)

# No CORS needed — only called from Kopern server-side
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_methods=["POST", "GET"],
)

# ---------------------------------------------------------------------------
# Auth middleware
# ---------------------------------------------------------------------------


async def verify_auth(request: Request) -> None:
    """Verify Bearer token. In production, replace with GCP IAM token verification."""
    if not CODE_INTERPRETER_SECRET:
        return  # No secret = dev mode (accept all)
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {CODE_INTERPRETER_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class InputFile(BaseModel):
    name: str = Field(..., max_length=255)
    content_base64: str


class ExecuteRequest(BaseModel):
    language: str = Field(..., pattern=r"^(python|nodejs|bash)$")
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    files: list[InputFile] = Field(default_factory=list, max_length=20)
    timeout: int = Field(default=60, ge=1, le=300)
    env: dict[str, str] = Field(
        default_factory=dict,
        description="Extra environment variables (no secrets — visible in logs)",
    )


class OutputFile(BaseModel):
    name: str
    content_base64: str
    size_bytes: int


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    files: list[OutputFile] = []
    duration_ms: int
    language: str
    timed_out: bool = False


# ---------------------------------------------------------------------------
# Language config
# ---------------------------------------------------------------------------

LANGUAGE_CONFIG = {
    "python": {"cmd": ["python3", "-u"], "ext": ".py"},
    "nodejs": {"cmd": ["node"], "ext": ".js"},
    "bash": {"cmd": ["bash"], "ext": ".sh"},
}

# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------


@app.post("/execute", response_model=ExecuteResponse)
async def execute(req: ExecuteRequest, request: Request):
    await verify_auth(request)

    config = LANGUAGE_CONFIG[req.language]
    run_id = uuid.uuid4().hex[:12]

    # Create isolated working directory
    workdir = Path(tempfile.mkdtemp(prefix=f"kopern-{run_id}-"))
    output_dir = workdir / "output"
    output_dir.mkdir()

    try:
        # Write code file
        code_file = workdir / f"main{config['ext']}"
        code_file.write_text(req.code, encoding="utf-8")

        # Write input files
        for f in req.files:
            file_path = workdir / f.name
            # Prevent path traversal
            if ".." in f.name or f.name.startswith("/"):
                continue
            file_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                file_path.write_bytes(base64.b64decode(f.content_base64))
            except Exception:
                continue  # Skip malformed files

        # Set ownership to executor user
        _chown_recursive(workdir, EXECUTOR_UID)

        # Build environment
        exec_env = {
            "HOME": str(workdir),
            "TMPDIR": str(workdir / "tmp"),
            "OUTPUT_DIR": str(output_dir),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin",
            "PYTHONDONTWRITEBYTECODE": "1",
            "NODE_NO_WARNINGS": "1",
        }
        # Add user-provided env (sanitized — no overriding system vars)
        system_keys = {"HOME", "TMPDIR", "OUTPUT_DIR", "PATH", "LANG", "LC_ALL"}
        for k, v in req.env.items():
            if k.upper() not in system_keys and not k.startswith("_"):
                exec_env[k] = v

        # Ensure tmp dir exists
        (workdir / "tmp").mkdir(exist_ok=True)
        _chown_recursive(workdir / "tmp", EXECUTOR_UID)

        # Execute as non-root user
        start = time.monotonic()
        timed_out = False

        proc = await asyncio.create_subprocess_exec(
            *config["cmd"],
            str(code_file),
            cwd=str(workdir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=exec_env,
            preexec_fn=lambda: _drop_privileges(EXECUTOR_UID),
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=req.timeout
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            timed_out = True
            stdout_bytes = b""
            stderr_bytes = f"Execution timed out after {req.timeout}s".encode()

        duration_ms = int((time.monotonic() - start) * 1000)

        # Collect output files
        output_files: list[OutputFile] = []
        if output_dir.exists():
            for f in sorted(output_dir.iterdir()):
                if len(output_files) >= MAX_OUTPUT_FILES:
                    break
                if f.is_file() and f.stat().st_size <= MAX_FILE_SIZE:
                    output_files.append(
                        OutputFile(
                            name=f.name,
                            content_base64=base64.b64encode(f.read_bytes()).decode(),
                            size_bytes=f.stat().st_size,
                        )
                    )

        return ExecuteResponse(
            stdout=stdout_bytes.decode("utf-8", errors="replace")[:MAX_OUTPUT_LENGTH],
            stderr=stderr_bytes.decode("utf-8", errors="replace")[:MAX_STDERR_LENGTH],
            exit_code=proc.returncode if proc.returncode is not None else -1,
            files=output_files,
            duration_ms=duration_ms,
            language=req.language,
            timed_out=timed_out,
        )

    except Exception as e:
        return ExecuteResponse(
            stdout="",
            stderr=f"Server error: {str(e)}",
            exit_code=-1,
            duration_ms=0,
            language=req.language,
            timed_out=False,
        )
    finally:
        # Cleanup — always remove workdir
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "languages": list(LANGUAGE_CONFIG.keys()),
        "limits": {
            "max_code_length": MAX_CODE_LENGTH,
            "max_timeout": 300,
            "max_output_files": MAX_OUTPUT_FILES,
            "max_file_size": MAX_FILE_SIZE,
        },
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _drop_privileges(uid: int) -> None:
    """Drop to non-root user before exec (called in preexec_fn)."""
    try:
        pw = pwd.getpwuid(uid)
        os.setgid(pw.pw_gid)
        os.setuid(uid)
    except (KeyError, PermissionError):
        pass  # Fallback: run as current user (dev mode)


def _chown_recursive(path: Path, uid: int) -> None:
    """Recursively set ownership of a directory tree."""
    try:
        pw = pwd.getpwuid(uid)
        gid = pw.pw_gid
        for root, dirs, files in os.walk(str(path)):
            os.chown(root, uid, gid)
            for d in dirs:
                os.chown(os.path.join(root, d), uid, gid)
            for f in files:
                os.chown(os.path.join(root, f), uid, gid)
    except (KeyError, PermissionError):
        pass  # Dev mode — skip chown
