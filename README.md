# AIsupCoding platform
Intelligent tutoring platform for [Machine Learning in Industrial Control Engineering](https://www.irt.rwth-aachen.de/cms/irt/studium/lehrveranstaltungen/~qizba/maschinelles-lernen-in-der-industriellen/?lidx=1) at the [Institute of Automatic Control](https://www.irt.rwth-aachen.de/cms/~iung/irt/lidx/1/), RWTH Aachen University. 
The software was developed as part of the project "AIsupCoding" funded by [Stiftung Innovation in der Hochschullehre](https://stiftung-hochschullehre.de/) under project number Freiraum-282/2023.

## Abstract
Implementing control and machine learning algorithms in languages such as MATLAB and Simulink is a critical competency in advanced control engineering. While immediate feedback is essential for fostering intuitive understanding, it is traditionally constrained to scheduled exercise sessions or consultation hours. To bridge this gap, this project introduces an open-source intelligent tutoring platform that provides continuous, on-demand feedback.

To accommodate diverse coding styles, the platform employs a hybrid evaluation strategy combining result-based and code-based metrics. This ensures that valid alternative solutions, which differ from predefined templates, are not erroneously penalized. Furthermore, a Large Language Model (LLM), contextualized with sample solutions and task classification results, offers auxiliary support for students struggling to initiate or complete tasks. Instructional scaffolding is adaptively adjusted to guide learners toward independent problem-solving. We position this platform as a supplementary tool designed to enhance, rather than replace, valuable interactions between students and human tutors. Built on open-source technologies, the system is architected for portability, allowing educators across engineering domains to easily adapt the framework to their teaching needs.

## How to deploy
The entire project can be deployed using docker and docker compose.
To build the project you can use: `docker compose up -d --build .`
Please adapt the specific keys in your `.env` file.

## Licensing and Attribution

This project is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license. You are free to share and adapt the material as long as appropriate credit is given.

### Third-Party Software and Models
While the project code is open, it utilizes several components that carry their own licenses:

* **Database:** MongoDB is used under the Server Side Public License (SSPL).
* **LLM Service:** Ollama and its associated tools are used under the MIT License.
* **Model Weights:** The `qwen2.5-coder:32b` model is subject to the Alibaba Cloud Qwen Research License Agreement.
* **MATLAB Components:** The `databased-classifier` service requires a valid MATLAB license to operate (referenced via `MLM_LICENSE_FILE`).
