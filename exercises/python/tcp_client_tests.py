import unittest
from unittest.mock import patch
import numpy as np

import tcp_client as kc


class TestKISupClientMessages(unittest.TestCase):

    def test_build_text_message_replaces_newlines(self):
        request_time = "01-Jan-2000 00:00:00"
        msg = kc.build_text_message(
            request_time=request_time,
            task_id="0_0_a",
            try_counter=1,
            student_id=12345678,
            student_text="hello\nworld"
        )
        self.assertEqual(
            msg,
            "text#01-Jan-2000 00:00:00#0_0_a#1#12345678#hello \\n world\n"
        )

    def test_build_feedback_message_sanitizes_chars(self):
        request_time = "01-Jan-2000 00:00:00"
        msg = kc.build_feedback_message(
            request_time=request_time,
            task_id="1_2_a",
            student_id=111,
            user_message="ä ü ö ß #"
        )
        self.assertEqual(
            msg,
            "feedback#01-Jan-2000 00:00:00#1_2_a#-1#111#ae ue oe ss  "
        )

    def test_mat2str_analog_2d(self):
        arr = np.array([[1, 2], [3, 4]])
        s = kc.mat2str_analog(arr)
        self.assertEqual(s, "[1 2; 3 4]")

    def test_build_figure_message(self):
        request_time = "01-Jan-2000 00:00:00"
        arr = np.array([[1, 2], [3, 4]])
        msg = kc.build_figure_message(
            request_time=request_time,
            task_id="0_1_a",
            try_counter=7,
            student_id=999,
            screenshot=arr
        )
        self.assertEqual(
            msg,
            "figure#01-Jan-2000 00:00:00#0_1_a#7#999#[1 2; 3 4]\n"
        )

    def test_feedback_antispam_blocks_second_call(self):
        kc._last_feedback_call_ts = None

        def fake_send_tcp_request(message: str, **kwargs):
            return "OK"

        original = kc.send_tcp_request
        kc.send_tcp_request = fake_send_tcp_request
        try:
            first = kc.send_user_feedback_to_server(1, 1, "a", "hello", time_out=60)
            self.assertEqual(first, "OK")

            second = kc.send_user_feedback_to_server(1, 1, "a", "hello", time_out=60)
            self.assertIn("Please wait", second)
        finally:
            kc.send_tcp_request = original

    def test_send_user_feedback_builds_correct_message(self):
        kc._last_feedback_call_ts = None
        sent = {}

        def fake_send_tcp_request(message: str, **kwargs):
            sent["message"] = message
            return "OK"

        original_send = kc.send_tcp_request
        original_time = kc._matlab_datetime_now
        original_gen = kc.generate_student_id

        try:
            kc.send_tcp_request = fake_send_tcp_request
            kc._matlab_datetime_now = lambda: "01-Jan-2000 00:00:00"
            kc.generate_student_id = lambda: (111, False)

            ans = kc.send_user_feedback_to_server(1, 2, "a", "ä#ß", time_out=0)
            self.assertEqual(ans, "OK")

            self.assertEqual(
                sent["message"],
                "feedback#01-Jan-2000 00:00:00#1_2_a#-1#111#ae ss"
            )
        finally:
            kc.send_tcp_request = original_send
            kc._matlab_datetime_now = original_time
            kc.generate_student_id = original_gen
            
    def test_send_figure_to_server_builds_correct_message(self):
        sent = {}

        def fake_send_tcp_request(message: str, **kwargs):
            sent["message"] = message
            return "OK"

        original_send = kc.send_tcp_request
        original_time = kc._matlab_datetime_now

        try:
            kc.send_tcp_request = fake_send_tcp_request
            kc._matlab_datetime_now = lambda: "01-Jan-2000 00:00:00"

            arr = np.array([[1, 2], [3, 4]])
            ans = kc.send_figure_to_server("0_1_a", 7, 999, arr)
            self.assertEqual(ans, "OK")

            self.assertEqual(
                sent["message"],
                "figure#01-Jan-2000 00:00:00#0_1_a#7#999#[1 2; 3 4]\n"
            )
        finally:
            kc.send_tcp_request = original_send
            kc._matlab_datetime_now = original_time
            
            
    def test_send_student_text_to_llm_builds_correct_message_and_timeout(self):
        sent = {}

        def fake_send_tcp_request(message: str, **kwargs):
            sent["message"] = message
            sent["kwargs"] = kwargs
            return "OK"

        original_send = kc.send_tcp_request
        original_time = kc._matlab_datetime_now

        try:
            kc.send_tcp_request = fake_send_tcp_request
            kc._matlab_datetime_now = lambda: "01-Jan-2000 00:00:00"

            ans = kc.send_student_text_to_llm(
                task_id="0_0_a",
                try_counter=5,
                student_id=12345678,
                student_text="line1\nline2"
            )
            self.assertEqual(ans, "OK")

            self.assertEqual(
                sent["message"],
                "text#01-Jan-2000 00:00:00#0_0_a#5#12345678#line1 \\n line2\n"
            )
            self.assertIn("timeout", sent["kwargs"])
            self.assertEqual(sent["kwargs"]["timeout"], 120.0)

        finally:
            kc.send_tcp_request = original_send
            kc._matlab_datetime_now = original_time
        
        


class TestSendTcpRequest(unittest.TestCase):

    @patch("tcp_client.socket.socket")
    def test_send_tcp_request_requires_str(self, mock_socket_ctor):
        with self.assertRaises(TypeError):
            kc.send_tcp_request(123)

    @patch("tcp_client.socket.socket")
    def test_send_tcp_request_timeout(self, mock_socket_ctor):
        sock = mock_socket_ctor.return_value
        sock.recv.side_effect = kc.socket.timeout()

        with self.assertRaises(TimeoutError):
            kc.send_tcp_request("hello", timeout=0.01)

        self.assertTrue(sock.close.called)

    @patch("tcp_client.socket.socket")
    def test_send_tcp_request_oserror(self, mock_socket_ctor):
        sock = mock_socket_ctor.return_value
        sock.connect.side_effect = OSError("boom")

        with self.assertRaises(ConnectionError):
            kc.send_tcp_request("hello")

        self.assertTrue(sock.close.called)
        
        
class TestGenerateStudentId(unittest.TestCase):

    @patch("tcp_client.os.getenv")
    def test_generate_student_id_developer(self, mock_getenv):
        def getenv_side_effect(key):
            if key == "USERNAME":
                return "_port_wine_"
            if key == "USER":
                return None
            return None

        mock_getenv.side_effect = getenv_side_effect

        uid, dev = kc.generate_student_id()
        self.assertEqual(uid, 70000007)
        self.assertTrue(dev)

    @patch("tcp_client.os.getenv")
    def test_generate_student_id_normal_is_deterministic_and_in_range(self, mock_getenv):
        # фиксируем username
        def getenv_side_effect(key):
            if key == "USERNAME":
                return "some_student"
            if key == "USER":
                return None
            return None

        mock_getenv.side_effect = getenv_side_effect

        uid1, dev1 = kc.generate_student_id()
        uid2, dev2 = kc.generate_student_id()

        self.assertFalse(dev1)
        self.assertFalse(dev2)
        self.assertEqual(uid1, uid2)               
        self.assertGreaterEqual(uid1, 0)
        self.assertLess(uid1, 10 ** 8)             
        
 
        
        
if __name__ == "__main__": unittest.main()