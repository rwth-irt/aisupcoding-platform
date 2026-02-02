import socket
from typing import Optional, Any, List, Tuple, Union
from datetime import datetime
import os
import hashlib
import time



def send_tcp_request(
    message: str,
    host: str = "kisupcoding.irt.rwth-aachen.de",
    port: int = 64000,
    timeout: float = 15.0,
    recv_buf: int = 65536,
) -> str:
    if not isinstance(message, str):
        raise TypeError("message must be str")

    data = message.encode("utf-8")

    s: Optional[socket.socket] = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port))
        s.sendall(data)

        chunks: List[bytes] = []
        while True:
            part = s.recv(recv_buf)
            if not part:
                break
            chunks.append(part)
            if len(part) < recv_buf:
                break

        return b"".join(chunks).decode("utf-8", errors="replace")

    except socket.timeout as e:
        raise TimeoutError(f"TCP request timed out after {timeout} seconds") from e
    except OSError as e:
        raise ConnectionError(f"TCP request failed: {e}") from e
    finally:
        if s is not None:
            try:
                s.close()
            except OSError:
                pass
            

          
        
     
    
def mat2str_analog(screenshot: Any) -> str:
    try:
        import numpy as np
    except Exception as e:
        raise RuntimeError("You have to install numpy") from e

    a = np.asarray(screenshot)

    def fmt(x: Any) -> str:

        try:
            fx = float(x)
        except Exception:
            return str(x)
        if fx.is_integer():
            return str(int(fx))
        return f"{fx:.15g}"

    if a.ndim == 0:
        return "[" + fmt(a.item()) + "]"

    if a.ndim == 1:
        return "[" + " ".join(fmt(x) for x in a.tolist()) + "]"

    if a.ndim == 2:
        rows = []
        for row in a.tolist():
            rows.append(" ".join(fmt(x) for x in row))
        return "[" + "; ".join(rows) + "]"

    raise ValueError("mat2str_analog supports only 0D, 1D or 2D arrays")


    
def send_figure_to_server(task_id: str, try_counter: int, student_id: int, screenshot: Any) -> str:
    # MATLAB: requestTime = string(datetime('now'));
    request_time = _matlab_datetime_now()

    screenshot_str = mat2str_analog(screenshot)

    # MATLAB: sprintf('figure#%s#%s#%i#%i#%s\n', ...)
    message = f"figure#{request_time}#{task_id}#{try_counter}#{student_id}#{screenshot_str}\n"

    return send_tcp_request(message)



def generate_student_id() -> Tuple[int, bool]:
   
    username = os.getenv("USERNAME") or os.getenv("USER") or "unknown_user"

    g_ind = {"Ah", "Gl", "Wl", "Ol", "St", "To", "_port_wine_"}
    
    if username in g_ind:
        return 70000007, True

    
    try:
        additional_text = "WeLoveGInd"
        input_str = (username + additional_text).encode("utf-8")

        digest = hashlib.sha256(input_str).digest()      
        first8 = digest[:8]                               

        hash_int = int.from_bytes(first8, byteorder="little", signed=False)

        unique_id = hash_int % (10 ** 8)                 
        return unique_id, False

    except Exception:
        import secrets
        return secrets.randbelow(10 ** 8) + 1, False
    
    


def _matlab_datetime_now() -> str:
    
    return datetime.now().strftime("%d-%b-%Y %H:%M:%S")


def _sanitize_feedback_message(user_message: str) -> str:
    forbidden = ['ä', 'ü', 'ö', 'ß', '#']
    replace =  ['ae', 'ue', 'oe', 'ss', ' ']
    for f, r in zip(forbidden, replace):
        user_message = user_message.replace(f, r)
    return user_message


_last_feedback_call_ts = None

def send_user_feedback_to_server(
    exercise: Union[int, str],
    task: Union[int, str],
    subtask: str,
    user_message: Any,
    time_out: int = 60,
) -> str:
    

    global _last_feedback_call_ts

    if isinstance(exercise, (str,)):
        exercise = int(float(exercise))
    if isinstance(task, (str,)):
        task = int(float(task))

    now_ts = time.time()
    if _last_feedback_call_ts is not None:
        elapsed = now_ts - _last_feedback_call_ts
        if elapsed < time_out:
            remaining = int((time_out - elapsed) + 0.999)
            return f"Please wait {remaining} more seconds before retrying."
    _last_feedback_call_ts = now_ts


    if isinstance(user_message, (list, tuple)) and len(user_message) > 0:
        user_message = user_message[0]
    user_message = str(user_message)


    user_message = _sanitize_feedback_message(user_message)


    student_id, _ = generate_student_id()
    task_id = f"{exercise}_{task}_{subtask}"
    try_counter = -1
    request_time = _matlab_datetime_now()

    user_message = user_message.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n")
    message = f"feedback#{request_time}#{task_id}#{try_counter}#{student_id}#{user_message}\n"
    return send_tcp_request(message)
    


def send_student_text_to_llm(
    task_id: str,
    try_counter: int,
    student_id: int,
    student_text: str,
) -> str:
    request_time = _matlab_datetime_now()
    student_text = student_text.replace("\r\n", "\n").replace("\n", " \\n ")

    correctness_string = ""
    message = (
        f"text#{request_time}#{task_id}#{try_counter}"
        f"#{student_id}#{student_text}{correctness_string}\n"
    )

    return send_tcp_request(message, timeout=120.0)





#For tests:

def build_text_message(request_time: str, task_id: str, try_counter: int, student_id: int, student_text: str) -> str:
    student_text = student_text.replace("\r\n", "\n").replace("\n", " \\n ")
    correctness_string = ""
    return f"text#{request_time}#{task_id}#{try_counter}#{student_id}#{student_text}{correctness_string}\n"


def build_feedback_message(request_time: str, task_id: str, student_id: int, user_message: str) -> str:
    user_message = _sanitize_feedback_message(str(user_message))
    user_message = user_message.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n")
    try_counter = -1
    return f"feedback#{request_time}#{task_id}#{try_counter}#{student_id}#{user_message}\n"


def build_figure_message(request_time: str, task_id: str, try_counter: int, student_id: int, screenshot) -> str:
    screenshot_str = mat2str_analog(screenshot)
    return f"figure#{request_time}#{task_id}#{try_counter}#{student_id}#{screenshot_str}\n"
