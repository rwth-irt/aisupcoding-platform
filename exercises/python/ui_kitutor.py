import ipywidgets as widgets
from IPython.display import display, clear_output

from .classify_exercise import classify_exercise
from .tcp_client import send_user_feedback_to_server


def build_ui():
    exercise_field = widgets.Text(placeholder="z.B. 12", description="Übung:")
    task_field = widgets.Text(placeholder="z.B. 2", description="Aufgabe:")
    subtask_field = widgets.Text(placeholder="z.B. a", description="Teilaufgabe:")

    run_button = widgets.Button(description="KI-Tutor", button_style="primary")
    output_area = widgets.Textarea(value="", disabled=True,
                                   layout=widgets.Layout(width="100%", height="220px"))
    info_label = widgets.HTML(value="")

    feedback_field = widgets.Textarea(
        placeholder="Ihr Feedback hier eingeben...",
        layout=widgets.Layout(width="100%", height="110px")
    )
    send_feedback_button = widgets.Button(description="Feedback senden")

    status = widgets.Output()

    def _read_inputs():
        ex = exercise_field.value.strip()
        t = task_field.value.strip()
        sub = subtask_field.value.strip()
        if not ex or not t or not sub:
            info_label.value = "<b style='color:#b00020'>Bitte alle Felder ausfüllen (Übung, Aufgabe, Teilaufgabe).</b>"
            return None
        info_label.value = ""
        return ex, t, sub

    def on_run_clicked(_):
        with status:
            clear_output()
            inputs = _read_inputs()
            if inputs is None:
                return

            ex, t, sub = inputs
            run_button.disabled = True
            try:
                output_area.value = ""
                info_label.value = f"<b>Starte Code-basierte Diagnose für Aufgabe {ex} {t} {sub}</b>"

                response = classify_exercise(ex, t, sub)
                output_area.value = response

            except Exception as e:
                info_label.value = f"<b style='color:#b00020'>Fehler: {e}</b>"
            finally:
                run_button.disabled = False
                info_label.value = ""

    def on_feedback_clicked(_):
        with status:
            clear_output()
            fb = feedback_field.value.strip()
            if not fb:
                info_label.value = "<b style='color:#b00020'>Bitte geben Sie Feedback ein, bevor Sie es senden.</b>"
                return

            inputs = _read_inputs()
            if inputs is None:
                return
            ex, t, sub = inputs

            send_feedback_button.disabled = True
            try:
                send_user_feedback_to_server(ex, t, sub, fb)
                feedback_field.value = ""
                info_label.value = "<b style='color:#1b5e20'>Danke für Ihr Feedback!</b>"
            except Exception as e:
                info_label.value = f"<b style='color:#b00020'>Fehler: {e}</b>"
            finally:
                send_feedback_button.disabled = False

    run_button.on_click(on_run_clicked)
    send_feedback_button.on_click(on_feedback_clicked)

    ui = widgets.VBox([
        widgets.HTML("<h3>KITutor</h3>"),
        widgets.HTML("Klicken Sie auf den Button, um Feedback zu erhalten."),
        widgets.HBox([exercise_field, task_field, subtask_field, run_button]),
        output_area,
        info_label,
        widgets.HTML("<b>Feedback</b>"),
        feedback_field,
        send_feedback_button,
        status
    ])

    return ui


def show():
    display(build_ui())