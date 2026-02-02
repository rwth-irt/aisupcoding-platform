from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union
import tcp_client
import numpy as np
import json


@dataclass(frozen=True)
class ExtractedBlocks:
    code_blocks: List[str]
    text_blocks: List[str]


# ---------- persistent-like storage ----------
_last_call_by_task: Dict[str, float] = {}
_attempt_counter_by_task: Dict[str, int] = {}


# ---------- helpers: normalize inputs ----------
def _to_int_maybe(x: Union[int, str]) -> int:
    if isinstance(x, str):
        return int(float(x))
    return int(x)


def _task_id(exercise: int, task: int, subtask: str) -> str:
    return f"{exercise}_{task}_{subtask}"


# ---------- helpers: extract blocks from .py ( liveScriptToString + pick_relevantPartInString) ----------
def _extract_numbered_blocks(source: str, kind: str, task_id: str) -> List[str]:
    blocks: List[str] = []
    i = 1
    while True:
        start_marker = f"# - start {kind} {task_id}_{i}"
        end_marker = f"# - end {kind} {task_id}_{i}"

        start_idx = source.find(start_marker)
        if start_idx == -1:
            break

        content_start = start_idx + len(start_marker)
        end_idx = source.find(end_marker, content_start)
        if end_idx == -1:
            break

        block = source[content_start:end_idx]
        block = block.strip("\n").strip()
        blocks.append(block)
        i += 1

    return blocks


def _read_solution_file_to_string(solution_path: str) -> str:
    if not os.path.isfile(solution_path):
        raise FileNotFoundError(solution_path)

    _, ext = os.path.splitext(solution_path)
    ext = ext.lower()

    
    if ext != ".ipynb":
        with open(solution_path, "r", encoding="utf-8") as f:
            return f.read()

    
    with open(solution_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    cells = nb.get("cells", [])
    parts: List[str] = []

    for cell in cells:
        src = cell.get("source", [])
        if isinstance(src, list):
            parts.append("".join(src))
        elif isinstance(src, str):
            parts.append(src)

        parts.append("\n")

    return "\n".join(parts)


def _extract_blocks_from_solution_file(solution_path: str, task_id: str) -> ExtractedBlocks:
    complete_string = _read_solution_file_to_string(solution_path)
    code_blocks = _extract_numbered_blocks(complete_string, kind="solution", task_id=task_id)
    text_blocks = _extract_numbered_blocks(complete_string, kind="freeText", task_id=task_id)
    return ExtractedBlocks(code_blocks=code_blocks, text_blocks=text_blocks)


# ---------- helpers: figures discovery for Python ----------
def _find_figure_payloads(task_id: str, figures_dir: str) -> List[np.ndarray]:

    payloads: List[np.ndarray] = []
    i = 1
    while True:
        fname = f"{task_id}_{i}.npy"
        fpath = os.path.join(figures_dir, fname)
        if not os.path.isfile(fpath):
            break
        payloads.append(np.load(fpath, allow_pickle=False))
        i += 1
    return payloads


def _build_figure_correctness_summary(task_id: str, anomaly_flags: List[str]) -> Tuple[str, List[bool]]:

    parts: List[str] = []
    correct_list: List[bool] = []

    for idx, flag in enumerate(anomaly_flags, start=1):
        flag = flag.replace("\\n", "").replace("\n", "").strip()
        if flag not in ("0", "1"):
            raise ValueError("Anomaly Detection failed")

        is_correct = (flag == "0")
        correct_list.append(is_correct)

        frag = f"Figure {task_id}_{idx} looks "
        frag += "correct. " if is_correct else "**INCORRECT**. "
        parts.append(frag)

    return "".join(parts), correct_list


# ---------- main: classify_exercise in Python ----------
def classify_exercise(
    exercise: Union[int, str],
    task: Union[int, str],
    subtask: str,
    solution_file_path: Optional[str] = None,
    figures_dir: str = "figures",
    time_out: int = 15,
    results_based_feedback: bool = True,
) -> str:
    ex_i = _to_int_maybe(exercise)
    t_i = _to_int_maybe(task)
    task_id = _task_id(ex_i, t_i, subtask)

    student_id, developer = tcp_client.generate_student_id()

    field_name = f"task_{task_id}"

    # --- timeout ---
    now_ts = time.time()
    last_ts = _last_call_by_task.get(field_name)
    if last_ts is not None:
        elapsed = now_ts - last_ts
        if elapsed < time_out and not developer:
            remaining = int((time_out - elapsed) + 0.999)
            return f"Please wait {remaining} more seconds before retrying."

    # --- attemptCounter ---
    _attempt_counter_by_task[field_name] = _attempt_counter_by_task.get(field_name, 0) + 1
    this_attempt_counter = _attempt_counter_by_task[field_name]

    # --- figures classification ---
    figure_correctness_string = ""
    try:
        figure_payloads = _find_figure_payloads(task_id, figures_dir=figures_dir)
        anomaly_flags: List[str] = []

        for fig_index, payload in enumerate(figure_payloads, start=1):
            # MATLAB: send_dataToServer([task_id '_' figIndex], attempt, studentID, data)
            # Python: send_figure_to_server with task_id "<task_id>_<figIndex>"
            fig_task_id = f"{task_id}_{fig_index}"
            resp = tcp_client.send_figure_to_server(
                task_id=fig_task_id,
                try_counter=this_attempt_counter,
                student_id=student_id,
                screenshot=payload,
            )
            anomaly_flags.append(str(resp).replace("\\n", "").replace("\n", "").strip())

        if anomaly_flags:
            figure_correctness_string, figures_correct = _build_figure_correctness_summary(task_id, anomaly_flags)

            if all(figures_correct):
                if results_based_feedback:
                    _last_call_by_task[field_name] = now_ts
                    return figure_correctness_string + "Well done!"

    except Exception:
        pass

    # --- read & extract student solution ---
    if solution_file_path is None:
        # Uebung_<exercise>.mlx
        solution_file_path = f"Uebung_{ex_i}.ipynb"

    try:
        blocks = _extract_blocks_from_solution_file(solution_file_path, task_id=task_id)
    except FileNotFoundError:
        _last_call_by_task[field_name] = now_ts
        return (
            f"[Error] Could not read {os.path.basename(solution_file_path)}. "
            "Please check if the file exists in your directory."
        )

    if not blocks.code_blocks and not blocks.text_blocks:
        # MATLAB: return figureCorrectnessString if exists else error
        _last_call_by_task[field_name] = now_ts
        if figure_correctness_string:
            return figure_correctness_string
        return "[Error] No content (Code/Text) found and Anomaly Detection unavailable."

    student_code = "\n".join(blocks.code_blocks).strip()
    student_text = "\n".join(blocks.text_blocks).strip()

    # --- prepare answer: start with figure results ---
    answer = figure_correctness_string
    if answer:
        answer = answer + "\n\n"

    # --- send data to server (LLM) ---
    try:
        llm_response = ""

        #  text → send_studentTextToLLM
        if student_text:
            llm_response = tcp_client.send_student_text_to_llm(
                task_id=task_id,
                try_counter=this_attempt_counter,
                student_id=student_id,
                student_text=student_text,
            )

        # code → send_studentSolutionToLLM
        if student_code:
            if "send_student_solution_to_llm" in globals():
                llm_response = tcp_client.send_student_solution_to_llm(
                    task_id=task_id,
                    try_counter=this_attempt_counter,
                    student_id=student_id,
                    student_code=student_code,
                    figure_correctness=figure_correctness_string,
                )
            else:
                # fallback
                payload = "STUDENT_CODE:\n" + student_code
                if figure_correctness_string:
                    payload = payload + "\n\nFIGURE_RESULTS:\n" + figure_correctness_string
                llm_response = tcp_client.send_student_text_to_llm(
                    task_id=task_id,
                    try_counter=this_attempt_counter,
                    student_id=student_id,
                    student_text=payload,
                )

        answer = answer + llm_response

    except Exception as e:
        answer = answer + f"[Error] Server communication failed: {e}"

    _last_call_by_task[field_name] = now_ts
    return answer