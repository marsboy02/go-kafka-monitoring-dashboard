package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/segmentio/kafka-go"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 개발 환경에서는 모든 origin 허용
	},
}

// ConsumedMessage 소비된 메시지 구조
type ConsumedMessage struct {
	Topic     string    `json:"topic"`
	Partition int       `json:"partition"`
	Offset    int64     `json:"offset"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	Timestamp time.Time `json:"timestamp"`
}

// ConsumeMessages HTTP를 통한 메시지 소비 (특정 오프셋부터)
func ConsumeMessages(c *gin.Context) {
	topic := c.Query("topic")
	partitionStr := c.Query("partition")
	offsetStr := c.Query("offset")

	if topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "topic is required"})
		return
	}

	partition := 0
	if partitionStr != "" {
		p, err := strconv.Atoi(partitionStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid partition"})
			return
		}
		partition = p
	}

	offset := kafka.LastOffset
	if offsetStr != "" {
		o, err := strconv.ParseInt(offsetStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid offset"})
			return
		}
		offset = o
	}

	// Reader 생성
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   []string{kafkaBrokers},
		Topic:     topic,
		Partition: partition,
		MinBytes:  10e3, // 10KB
		MaxBytes:  10e6, // 10MB
		MaxWait:   1 * time.Second,
	})
	defer reader.Close()

	// 특정 오프셋으로 이동
	if offsetStr != "" {
		reader.SetOffset(offset)
	}

	// 메시지 읽기 (최대 10개)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var messages []ConsumedMessage
	for i := 0; i < 10; i++ {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			if err == context.DeadlineExceeded {
				break
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		messages = append(messages, ConsumedMessage{
			Topic:     msg.Topic,
			Partition: msg.Partition,
			Offset:    msg.Offset,
			Key:       string(msg.Key),
			Value:     string(msg.Value),
			Timestamp: msg.Time,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// ConsumeMessagesWebSocket WebSocket을 통한 실시간 메시지 소비
func ConsumeMessagesWebSocket(c *gin.Context) {
	topic := c.Query("topic")
	group := c.Query("group")

	if topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "topic is required"})
		return
	}

	if group == "" {
		group = "default-group"
	}

	// WebSocket 업그레이드
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Consumer Group Reader 생성
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        []string{kafkaBrokers},
		Topic:          topic,
		GroupID:        group,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: 1 * time.Second,
		StartOffset:    kafka.LastOffset,
	})
	defer reader.Close()

	log.Printf("WebSocket consumer started: topic=%s, group=%s", topic, group)

	// 연결 확인을 위한 핑 메시지 전송 고루틴
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Printf("Ping failed: %v", err)
					cancel()
					return
				}
			}
		}
	}()

	// 메시지 수신 및 전송
	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Kafka에서 메시지 읽기
			msg, err := reader.ReadMessage(context.Background())
			if err != nil {
				log.Printf("Error reading message: %v", err)
				errMsg := map[string]string{
					"error": fmt.Sprintf("Failed to read message: %v", err),
				}
				if jsonErr := conn.WriteJSON(errMsg); jsonErr != nil {
					log.Printf("Failed to send error via WebSocket: %v", jsonErr)
					return
				}
				continue
			}

			// 메시지 구조화
			consumedMsg := ConsumedMessage{
				Topic:     msg.Topic,
				Partition: msg.Partition,
				Offset:    msg.Offset,
				Key:       string(msg.Key),
				Value:     string(msg.Value),
				Timestamp: msg.Time,
			}

			// WebSocket으로 전송
			if err := conn.WriteJSON(consumedMsg); err != nil {
				log.Printf("Failed to send message via WebSocket: %v", err)
				return
			}

			log.Printf("Message sent via WebSocket: topic=%s, partition=%d, offset=%d",
				msg.Topic, msg.Partition, msg.Offset)
		}
	}
}

// ConsumerGroupMessage Consumer Group 메시지 구조
type ConsumerGroupMessage struct {
	Type      string          `json:"type"` // "message" or "error"
	Message   *ConsumedMessage `json:"message,omitempty"`
	Error     string          `json:"error,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// StreamMessages 특정 토픽의 메시지를 스트리밍 (Server-Sent Events 대안)
func StreamMessages(c *gin.Context) {
	topic := c.Query("topic")
	group := c.Query("group")

	if topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "topic is required"})
		return
	}

	if group == "" {
		group = "streaming-group"
	}

	// SSE 헤더 설정
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	// Consumer 생성
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        []string{kafkaBrokers},
		Topic:          topic,
		GroupID:        group,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: 1 * time.Second,
		StartOffset:    kafka.LastOffset,
	})
	defer reader.Close()

	// 스트리밍 시작
	for {
		msg, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		consumedMsg := ConsumedMessage{
			Topic:     msg.Topic,
			Partition: msg.Partition,
			Offset:    msg.Offset,
			Key:       string(msg.Key),
			Value:     string(msg.Value),
			Timestamp: msg.Time,
		}

		data, _ := json.Marshal(consumedMsg)
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
	}
}
