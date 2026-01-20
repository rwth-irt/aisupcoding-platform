package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"time"

	// mongo db
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	// Ollama
	ollama "github.com/prathyushnallamothu/ollamago"
)

// Config holds all configuration for the server
type Config struct {
	ListenAddr        string
	MongoURI          string
	FigureServiceAddr string
	DataServiceAddr   string
	LLMServiceAddr    string
	LLMModelName      string
}

type promptTemplateDoc struct {
	TemplateId int `bson:"TemplateId"`
	Template string `bson:"Template"`
}
	
type taskDataDoc struct {
	SampleSolution string `bson:"SampleSolution"`
	ExerciseTemplate string `bson:"ExerciseTemplate"`
	ExerciseContext string `bson:"ExerciseContext"`
	AdditionalInformation string `bson:"AdditionalInformation"`
	AdditionalRules string `bson:"AdditionalRules"`
	ProblemDescription string `bson:"ProblemDescription"`
}

// Server holds all application dependencies
type Server struct {
	config *Config
	// Context collections
	collAcceptedLoss *mongo.Collection
	collPrompts      *mongo.Collection
	collPromptTemplate      *mongo.Collection
	// Result collections
	collFeedback *mongo.Collection
	collFigure   *mongo.Collection
	collData     *mongo.Collection
	collLLM      *mongo.Collection
	collText	 *mongo.Collection
}

// RequestData holds the common parsed info for all requests
type RequestData struct {
	Time       	string
	TaskID     	string
	TryCounter 	string
	StudentID  	string
	Content    	string
	Correctness string
}

// NewServer initializes a new Server with all its dependencies
func NewServer(client *mongo.Client, cfg *Config) *Server {
	dbStudent := client.Database("studentRequests")

	return &Server{
		config: cfg,
		// collections used for configuration of the exercises
		collPrompts:      dbStudent.Collection("prompts"),
		collPromptTemplate:      dbStudent.Collection("promptTemplate"),
		// Result collections
		collFeedback: dbStudent.Collection("feedbacks"),
		collFigure:   dbStudent.Collection("figures"),
		collData:     dbStudent.Collection("data"),
		collLLM:      dbStudent.Collection("llms"),
		collText: dbStudent.Collection("text"),
	}
}

// getEnv is a helper to read an environment variable or return a default
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func main() {
	// 1. Load Configuration
	cfg := &Config{
		ListenAddr:        getEnv("LISTEN_ADDR", ":1000"),
		MongoURI:          os.Getenv("MONGO_URI"),
		FigureServiceAddr: getEnv("FIGURE_SERVICE_ADDR", "image-classifier:55000"),
		DataServiceAddr:   getEnv("DATA_SERVICE_ADDR", "databased-classifier:56000"),
		LLMServiceAddr:    getEnv("LLM_SERVICE_ADDR", "http://134.130.45.45:11434"),
		LLMModelName:      getEnv("LLM_MODEL_NAME", "qwen2.5-coder:32b"),
	}

	if cfg.MongoURI == "" {
		log.Fatal("[Error] MONGO_URI environment variable was not set.")
	}

	// 2. Connect to MongoDB
	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	mongoClient, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		log.Fatalf("[Error] Could not connect to MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	// 3. Create the Server (with all dependencies)
	s := NewServer(mongoClient, cfg)

	// 4. Start TCP Listener
	ln, err := net.Listen("tcp", cfg.ListenAddr)
	if err != nil {
		log.Fatalf("[Error] Could not start TCP server: %v", err)
	}
	defer ln.Close()
	log.Printf("[Info] Listening for TCP connections on %s.", cfg.ListenAddr)
	log.Println("==================================================")

	// 5. Accept connections
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("[Error] Connection refused: %v", err)
			continue
		}
		log.Printf("[Info] Client connected with ip %s.", conn.RemoteAddr().String())

		// Handle each connection in a separate goroutine
		go s.handleConnection(conn)
	}
}

// handleConnection acts as a dispatcher
func (s *Server) handleConnection(conn net.Conn) {
	defer func() {
		if err := conn.Close(); err != nil {
			log.Printf("[Error] Connection can not be closed: %v", err)
		}
	}()

	// Receive the tcp message
	reader := bufio.NewReader(conn)
	message, err := reader.ReadString('\n')
	if err != nil {
		log.Printf("[Info] Connection closed with ip %s.", conn.RemoteAddr().String())
		return
	}

	// Preprocess the tcp message
	sanitizedMessage := sanitizeMessage(message)
	messageType, requestTime, taskID, tryCounter, studentID, messageContent, correctness := splitMessage(sanitizedMessage)

	// Create a data struct to pass to handlers
	req := &RequestData{
		Time:      		requestTime,
		TaskID:     	taskID,
		TryCounter: 	tryCounter,
		StudentID:  	studentID,
		Content:    	messageContent,
		Correctness:	correctness,
	}

	// Main decision point: dispatch to the correct method
	var tcpResponse string
	switch strings.ToLower(messageType) {
	case "feedback":
		tcpResponse = s.handleFeedback(req)
	case "figure":
		tcpResponse = s.handleFigure(req)
	case "data":
		tcpResponse = s.handleData(req)
	case "llm":
		tcpResponse = s.handleLLM(req)
	case "text":
		tcpResponse = s.handleText(req)	
	default:
		tcpResponse = "[Error] Message type unknown."
	}

	// Write response to the client
	log.Printf("[Info] Writing response to client")

	// The main handler is responsible for adding the final newline
	_, err = conn.Write([]uint8(fmt.Sprintf("%s\n", tcpResponse)))
	if err != nil {
		log.Printf("[Error] Could not write response: %v", err)
		return
	}
	log.Printf("[Info] Response written successfully to IP %s.", conn.RemoteAddr().String())
	log.Println("----------------------------------------------")
}

// handleConnection functions

func (s *Server) handleFeedback(req *RequestData) string {
	doc := bson.M{
		"time":         req.Time,
		"taskId":       req.TaskID,
		"tryCounter":   req.TryCounter,
		"studentId":    req.StudentID,
		"feedbackText": req.Content,
		"correctness":  req.Correctness,
	}

	if _, err := s.collFeedback.InsertOne(context.Background(), doc); err != nil {
		log.Printf("[Error] Could not insert document into MongoDB: %v", err)
	}
	return "Thank you for your feedback!"
}

func (s *Server) handleFigure(req *RequestData) string {
	msg := fmt.Sprintf("%s#%s", req.TaskID, req.Content)

	// Use the reusable TCP query helper
	classification, err := s.queryTCPService(s.config.FigureServiceAddr, msg)
	if err != nil {
		return fmt.Sprintf("[Error] %s", err.Error())
	}

	doc := bson.M{
		"time":                 req.Time,
		"taskId":               req.TaskID,
		"tryCounter":           req.TryCounter,
		"studentId":            req.StudentID,
		"figure":               req.Content,
		"figureClassification": classification,
		"correctness":			req.Correctness,
	}

	if _, err = s.collFigure.InsertOne(context.Background(), doc); err != nil {
		log.Printf("[Error] Could not insert document into MongoDB: %v", err)
	}

	// Return the classification text as the response
	return classification
}

func (s *Server) handleData(req *RequestData) string {
	// 1. Get accepted loss 
	acceptedLoss := s.getAcceptedLoss(req.TaskID)

	// 2. Prepare and send message
	msg := fmt.Sprintf("%s#%s#%s\n", req.TaskID, removeNewlines(req.Content), acceptedLoss)

	resultString, err := s.queryTCPService(s.config.DataServiceAddr, msg)
	if err != nil {
		return fmt.Sprintf("[Error] %s", err.Error())
	}

	// Split the resultString
	parts := strings.SplitN(resultString, "#", 2)
	classification := parts[0] 
	loss := parts[1]

	// 3. Continue with DB insert
	doc := bson.M{
		"time":               req.Time,
		"taskId":             req.TaskID,
		"tryCounter":         req.TryCounter,
		"studentId":          req.StudentID,
		"data":               req.Content,
		"dataClassification": classification,
		"loss":			 	  loss,
		"correctness": 		  req.Correctness,
	}

	if _, err = s.collData.InsertOne(context.Background(), doc); err != nil {
		log.Printf("[Error] Could not insert document into MongoDB: %v", err)
	}

	return classification
}

func (s *Server) handleLLM(req *RequestData) string {
	// --- 1. Get context prompt from MongoDB ---
	var ptDoc promptTemplateDoc
	var tdDoc taskDataDoc
	var promptTemplate string
	var sampleSolution string

	// get prompt template from database
	filter := bson.M{"TemplateId": 1} // Using TemplateId: 1 as in your code
	err := s.collPromptTemplate.FindOne(context.Background(), filter).Decode(&ptDoc)

	if err == mongo.ErrNoDocuments {
		log.Printf("[Info] No prompt template found. Proceeding without prompt template.")
	} else if err != nil {
		log.Printf("[Error] Failed to find prompt template: %v. Proceeding without prompt template.", err)
	} else {
		// Success: We found a context prompt
		promptTemplate = ptDoc.Template
		log.Printf("[Info] Found prompt template.")
	}

	// get the specific data for the task
	filterTaskData := bson.M{"TaskIdentifier": req.TaskID}
	errTaskData := s.collPrompts.FindOne(context.Background(), filterTaskData).Decode(&tdDoc)

	if errTaskData == mongo.ErrNoDocuments {
		log.Printf("[Info] No task data found for task %s. Proceeding without context.", req.TaskID)
	} else if errTaskData != nil {
		log.Printf("[Error] Failed to find task data for task %s: %v. Proceeding without context.", req.TaskID, err)
	} else {
		// Success: We found a document. sampleSolution is now populated via tdDoc.
		sampleSolution = tdDoc.SampleSolution
		log.Printf("[Info] Found task data for task %s", req.TaskID)
	}

	// --- 2. Construct the final prompt ---
	var finalPrompt string
	if promptTemplate != "" {
		// We have a template, let's replace the markers
		log.Println("[Info] Using prompt template for replacement.")

		// Use strings.NewReplacer for efficient, simultaneous replacement.
		replacer := strings.NewReplacer(
			// Markers from req data (based on your new template)
			"#TaskIdentifier", 		req.TaskID,
			"#StudentSolution", 	req.Content, 
			"#numberOfAttempt", 	req.TryCounter, 
			"#correctness", 		req.Correctness,

			// Markers from the tdDoc (task data)
			"#ProblemDescription", 		tdDoc.ProblemDescription,
			"#ExerciseTemplate", 		tdDoc.ExerciseTemplate,
			"#SampleSolution", 			tdDoc.SampleSolution,
			"#AdditionalInformation", 	tdDoc.AdditionalInformation,
			"#AdditionalRules", 		tdDoc.AdditionalRules,
			"#ExerciseContext", 		tdDoc.ExerciseContext,
		)

		finalPrompt = replacer.Replace(promptTemplate)
		log.Printf("[Info] Prompt replacement worked.")

	} else if sampleSolution != "" {
		// Fallback to old behavior if no template but sample solution exists
		log.Println("[Info] No prompt template found. Using legacy format.")
		finalPrompt = fmt.Sprintf("Context: %s\n\nQuestion: %s", sampleSolution, req.Content)

	} else {
		// No template, no context, just use the user's message
		log.Println("[Info] No prompt template or context found. Sending content directly.")
		finalPrompt = req.Content
	}

	// --- 3. Call LLM Client (unchanged setup) ---
	llmClient := ollama.NewClient(
		ollama.WithTimeout(time.Minute*2),
		ollama.WithBaseURL(s.config.LLMServiceAddr),
	)

	temp := float64(0.0)
	options := &ollama.Options{
		Temperature: &temp,
	}

	// Generate response using the finalPrompt
	resp, err := llmClient.Generate(context.Background(), ollama.GenerateRequest{
		Model:   s.config.LLMModelName,
		Prompt:  finalPrompt, // Use the new prompt
		Options: options,
	})
	if err != nil {
		log.Printf("[Error] LLM call failed: %v\n", err)
		return "[Error] LLM service failed"
	}

	// --- 4. Write to DB ---
	doc := bson.M{
		"time":        			req.Time,
		"taskId":      			req.TaskID,
		"tryCounter":  			req.TryCounter,
		"studentId":   			req.StudentID,
		"studentSolution":   	req.Content, 
		"llmResponse": 			resp.Response,
		"finalPrompt": 			finalPrompt, 
		"correctness": 			req.Correctness,
	}

	if _, err = s.collLLM.InsertOne(context.Background(), doc); err != nil {
		log.Printf("[Error] Could not insert document into MongoDB: %v", err)
	}

	// Return just the response string
	return resp.Response
}

// evaluate text answers from students 
func (s *Server) handleText(req *RequestData) string {
	// Get context prompt from MongoDB ---
	var ptDoc promptTemplateDoc
	var tdDoc taskDataDoc
	var promptTemplate string
	var sampleSolution string

	// get prompt template from database
	filter := bson.M{"TemplateId": 2} // Default for text based analysis
	err := s.collPromptTemplate.FindOne(context.Background(), filter).Decode(&ptDoc)

	if err == mongo.ErrNoDocuments {
		log.Printf("[Info] No prompt template found. Proceeding without prompt template.")
	} else if err != nil {
		log.Printf("[Error] Failed to find prompt template: %v. Proceeding without prompt template.", err)
	} else {
		// Success: We found a context prompt
		promptTemplate = ptDoc.Template
		log.Printf("[Info] Found prompt template.")
	}

	// get the specific data for the task
	filterTaskData := bson.M{"TaskIdentifier": req.TaskID}
	errTaskData := s.collPrompts.FindOne(context.Background(), filterTaskData).Decode(&tdDoc)

	if errTaskData == mongo.ErrNoDocuments {
		log.Printf("[Info] No task data found for task %s. Proceeding without context.", req.TaskID)
	} else if errTaskData != nil {
		log.Printf("[Error] Failed to find task data for task %s: %v. Proceeding without context.", req.TaskID, err)
	} else {
		// Success: We found a document. sampleSolution is now populated via tdDoc.
		sampleSolution = tdDoc.SampleSolution
		log.Printf("[Info] Found task data for task %s", req.TaskID)
	}

	// --- 2. Construct the final prompt ---
	var finalPrompt string
	if promptTemplate != "" {
		// We have a template, let's replace the markers
		log.Println("[Info] Using prompt template for replacement.")

		// Use strings.NewReplacer for efficient, simultaneous replacement.
		replacer := strings.NewReplacer(
			// Markers from req data (based on your new template)
			"#TaskIdentifier", 		req.TaskID,
			"#StudentSolution", 	req.Content, 
			"#numberOfAttempt", 	req.TryCounter, 

			// Markers from the tdDoc (task data)
			"#ProblemDescription", 		tdDoc.ProblemDescription,
			"#ExerciseTemplate", 		tdDoc.ExerciseTemplate,
			"#SampleSolution", 			tdDoc.SampleSolution,
			"#AdditionalInformation", 	tdDoc.AdditionalInformation,
			"#AdditionalRules", 		tdDoc.AdditionalRules,
			"#ExerciseContext", 		tdDoc.ExerciseContext,
		)

		finalPrompt = replacer.Replace(promptTemplate)
		log.Printf("[Info] Prompt replacement worked.")

	} else if sampleSolution != "" {
		// Fallback to old behavior if no template but sample solution exists
		log.Println("[Info] No prompt template found. Using legacy format.")
		finalPrompt = fmt.Sprintf("Context: %s\n\nQuestion: %s", sampleSolution, req.Content)

	} else {
		// No template, no context, just use the user's message
		log.Println("[Info] No prompt template or context found. Sending content directly.")
		finalPrompt = req.Content
	}

	// --- 3. Call LLM Client (unchanged setup) ---
	llmClient := ollama.NewClient(
		ollama.WithTimeout(time.Minute*2),
		ollama.WithBaseURL(s.config.LLMServiceAddr),
	)

	temp := float64(0.0)
	options := &ollama.Options{
		Temperature: &temp,
	}

	// Generate response using the finalPrompt
	resp, err := llmClient.Generate(context.Background(), ollama.GenerateRequest{
		Model:   s.config.LLMModelName,
		Prompt:  finalPrompt, 
		Options: options,
	})
	if err != nil {
		log.Printf("[Error] Free Text LLM call failed: %v\n", err)
		return "[Error] Free Text LLM service failed"
	}

	// --- 4. Write to DB ---
	doc := bson.M{
		"time":        			req.Time,
		"taskId":      			req.TaskID,
		"tryCounter":  			req.TryCounter,
		"studentId":   			req.StudentID,
		"studentSolution":   	req.Content, 
		"llmResponse": 			resp.Response,
		"finalPrompt": 			finalPrompt, 
	}

	if _, err = s.collText.InsertOne(context.Background(), doc); err != nil {
		log.Printf("[Error] Could not insert document into MongoDB: %v", err)
	}

	// Return just the response string
	return resp.Response
}



// --- Helper Functions ---

// queryTCPService is a reusable helper for "figure" and "data" cases
func (s *Server) queryTCPService(addr, message string) (string, error) {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Printf("[Error] Failed to connect to %s: %v\n", addr, err)
		return "", fmt.Errorf("could not reach service")
	}
	// Use defer to ensure connection is always closed
	defer conn.Close()

	if _, err := conn.Write([]byte(message)); err != nil {
		log.Printf("[Error] Failed to send message: %v\n", err)
		return "", fmt.Errorf("could not send data")
	}

	response, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		log.Printf("[Error] Failed to receive message: %v\n", err)
		return "", fmt.Errorf("no response from service")
	}

	return strings.TrimSpace(response), nil
}

// getAcceptedLoss safely retrieves the loss value from MongoDB
func (s *Server) getAcceptedLoss(taskID string) string {
	const defaultLoss = "0.1"
	filter := bson.M{"TaskIdentifier": trimAfterLastUnderscore(taskID)}

	type lossDoc struct {
		AcceptedLoss float64 `bson:"AcceptedLoss"`
	}
	var lDoc lossDoc

	// Use the correct collection from the Server struct
	err := s.collPrompts.FindOne(context.Background(), filter).Decode(&lDoc)

	switch {
	case err == mongo.ErrNoDocuments:
		log.Printf("[Info] No document found with TaskIdentifier = %s, using default %s\n", taskID, defaultLoss)
		return defaultLoss
	case err != nil:
		log.Printf("[Error] find failed for task %s: %v, using default %s\n", taskID, err, defaultLoss)
		return defaultLoss
	default:
		log.Printf("[Info] Retrieved accepted loss: %f\n", lDoc.AcceptedLoss)
		return fmt.Sprintf("%f", lDoc.AcceptedLoss)
	}
}

// --- Utility functions ---

func sanitizeMessage(input string) string {
	var sb strings.Builder
	for _, r := range input {
		switch r {
		case 'ö', 'ä', 'ü', 'ß':
			// can't write those characters
		default:
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

func removeNewlines(s string) string {
	return strings.Map(func(r rune) rune {
		switch r {
		case '\n', '\r':
			return -1 // drop this rune
		default:
			return r
		}
	}, s)
}

func splitMessage(input string) (messageType, requestTime, taskID, tryCounter, studentID, messageContent, correctness string) {
	parts := strings.SplitN(input, "#", 7)
	// Ensure we have at least 7 elements
	paddedParts := make([]string, 7)
	copy(paddedParts, parts)
	for i := len(parts); i < 7; i++ {
		paddedParts[i] = ""
	}
	return paddedParts[0], paddedParts[1], paddedParts[2], paddedParts[3], paddedParts[4], paddedParts[5], paddedParts[6]
}

func trimAfterLastUnderscore(s string) string {
	// Find the index of the last underscore
	index := strings.LastIndex(s, "_")

	// If no underscore is found (index is -1), return the original string
	if index == -1 {
		return s
	}

	// Otherwise, return the slice of the string up to that index
	return s[:index]
}