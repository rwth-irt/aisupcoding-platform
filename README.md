# matlab-intelligent-tutor
Intelligent matlab tutor platform for Machine Learning in industrial control application at the Institute of Automatic Control, RWTH Aachen University. 

## Abstract
Implementing control and machine learning algorithms in languages such as MATLAB and Simulink is a critical competency in advanced control engineering. While immediate feedback is essential for fostering intuitive understanding, it is traditionally constrained to scheduled exercise sessions or consultation hours. To bridge this gap, this project introduces an open-source intelligent tutoring platform that provides continuous, on-demand feedback.

To accommodate diverse coding styles, the platform employs a hybrid evaluation strategy combining result-based and code-based metrics. This ensures that valid alternative solutions, which differ from predefined templates, are not erroneously penalized. Furthermore, a Large Language Model (LLM), contextualized with sample solutions and task classification results, offers auxiliary support for students struggling to initiate or complete tasks. Instructional scaffolding is adaptively adjusted to guide learners toward independent problem-solving. We position this platform as a supplementary tool designed to enhance, rather than replace, valuable interactions between students and human tutors. Built on open-source technologies, the system is architected for portability, allowing educators across engineering domains to easily adapt the framework to their teaching needs.

## How to deploy
The entire project can be deployed using docker and docker compose.
To build the project you can use: `docker compose up -d --build .`
Please adapt the specific keys in your `.env` file.