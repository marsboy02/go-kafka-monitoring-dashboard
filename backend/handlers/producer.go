package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"
)

var kafkaWriter *kafka.Writer

// ProduceRequest 단일 메시지 전송 요청
type ProduceRequest struct {
	Topic     string `json:"topic" binding:"required"`
	Key       string `json:"key"`
	Value     string `json:"value" binding:"required"`
	Partition *int   `json:"partition"`
}

// BatchMessage 배치 메시지
type BatchMessage struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// ProduceBatchRequest 배치 메시지 전송 요청
type ProduceBatchRequest struct {
	Topic    string         `json:"topic" binding:"required"`
	Messages []BatchMessage `json:"messages" binding:"required"`
}

// ProduceMessage 단일 메시지 전송 핸들러
func ProduceMessage(c *gin.Context) {
	var req ProduceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Writer 생성 (토픽별로)
	writer := &kafka.Writer{
		Addr:         kafka.TCP(kafkaBrokers),
		Topic:        req.Topic,
		Balancer:     &kafka.Hash{}, // Key 기반 파티션 분배
		RequiredAcks: kafka.RequireAll,
		Async:        false,
	}
	defer writer.Close()

	// 메시지 생성
	msg := kafka.Message{
		Key:   []byte(req.Key),
		Value: []byte(req.Value),
		Time:  time.Now(),
	}

	// 파티션이 지정된 경우
	if req.Partition != nil {
		msg.Partition = *req.Partition
	}

	// 메시지 전송
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := writer.WriteMessages(ctx, msg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to produce message: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"topic":   req.Topic,
		"key":     req.Key,
		"message": "Message sent successfully",
	})
}

// ProduceBatchMessages 배치 메시지 전송 핸들러
func ProduceBatchMessages(c *gin.Context) {
	var req ProduceBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Writer 생성
	writer := &kafka.Writer{
		Addr:         kafka.TCP(kafkaBrokers),
		Topic:        req.Topic,
		Balancer:     &kafka.Hash{},
		RequiredAcks: kafka.RequireAll,
		Async:        false,
	}
	defer writer.Close()

	// 배치 메시지 생성
	messages := make([]kafka.Message, len(req.Messages))
	for i, m := range req.Messages {
		messages[i] = kafka.Message{
			Key:   []byte(m.Key),
			Value: []byte(m.Value),
			Time:  time.Now(),
		}
	}

	// 배치 전송
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err := writer.WriteMessages(ctx, messages...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to produce batch messages: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"topic":         req.Topic,
		"message_count": len(req.Messages),
		"message":       "Batch messages sent successfully",
	})
}
