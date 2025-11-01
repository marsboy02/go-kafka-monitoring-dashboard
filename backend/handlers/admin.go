package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"
)

var kafkaBrokers string

// InitKafkaClient Kafka 클라이언트 초기화
func InitKafkaClient(brokers string) {
	kafkaBrokers = brokers
}

// CreateTopicRequest 토픽 생성 요청
type CreateTopicRequest struct {
	Name              string `json:"name" binding:"required"`
	Partitions        int    `json:"partitions" binding:"required,min=1"`
	ReplicationFactor int    `json:"replicationFactor" binding:"required,min=1"`
}

// TopicInfo 토픽 정보
type TopicInfo struct {
	Name       string          `json:"name"`
	Partitions []PartitionInfo `json:"partitions"`
}

// PartitionInfo 파티션 정보
type PartitionInfo struct {
	ID       int     `json:"id"`
	Leader   int     `json:"leader"`
	Replicas []int   `json:"replicas"`
	ISR      []int   `json:"isr"`
	Offsets  Offsets `json:"offsets"`
}

// Offsets 오프셋 정보
type Offsets struct {
	First int64 `json:"first"`
	Last  int64 `json:"last"`
}

// ListTopics 토픽 목록 조회
func ListTopics(c *gin.Context) {
	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	partitions, err := conn.ReadPartitions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read partitions: %v", err),
		})
		return
	}

	// 토픽별로 그룹화
	topicMap := make(map[string]bool)
	for _, p := range partitions {
		topicMap[p.Topic] = true
	}

	topics := make([]string, 0, len(topicMap))
	for topic := range topicMap {
		topics = append(topics, topic)
	}

	c.JSON(http.StatusOK, gin.H{
		"topics": topics,
		"count":  len(topics),
	})
}

// CreateTopic 토픽 생성
func CreateTopic(c *gin.Context) {
	var req CreateTopicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get controller: %v", err),
		})
		return
	}

	controllerConn, err := kafka.Dial("tcp", fmt.Sprintf("%s:%d", controller.Host, controller.Port))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to controller: %v", err),
		})
		return
	}
	defer controllerConn.Close()

	topicConfigs := []kafka.TopicConfig{
		{
			Topic:             req.Name,
			NumPartitions:     req.Partitions,
			ReplicationFactor: req.ReplicationFactor,
		},
	}

	err = controllerConn.CreateTopics(topicConfigs...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to create topic: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"topic":   req.Name,
		"message": "Topic created successfully",
	})
}

// GetTopicDetails 토픽 상세 정보 조회
func GetTopicDetails(c *gin.Context) {
	topicName := c.Param("name")

	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	partitions, err := conn.ReadPartitions(topicName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read partitions: %v", err),
		})
		return
	}

	if len(partitions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Topic not found",
		})
		return
	}

	// 각 파티션의 상세 정보 수집
	var partitionInfos []PartitionInfo
	for _, p := range partitions {
		// 오프셋 정보 조회
		firstOffset, lastOffset := getPartitionOffsets(topicName, p.ID)

		partitionInfos = append(partitionInfos, PartitionInfo{
			ID:       p.ID,
			Leader:   p.Leader.ID,
			Replicas: getReplicaIDs(p.Replicas),
			ISR:      getReplicaIDs(p.Isr),
			Offsets: Offsets{
				First: firstOffset,
				Last:  lastOffset,
			},
		})
	}

	topicInfo := TopicInfo{
		Name:       topicName,
		Partitions: partitionInfos,
	}

	c.JSON(http.StatusOK, topicInfo)
}

// DeleteTopic 토픽 삭제
func DeleteTopic(c *gin.Context) {
	topicName := c.Param("name")

	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get controller: %v", err),
		})
		return
	}

	controllerConn, err := kafka.Dial("tcp", fmt.Sprintf("%s:%d", controller.Host, controller.Port))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to controller: %v", err),
		})
		return
	}
	defer controllerConn.Close()

	err = controllerConn.DeleteTopics(topicName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete topic: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"topic":   topicName,
		"message": "Topic deleted successfully",
	})
}

// getPartitionOffsets 파티션의 첫 번째와 마지막 오프셋 조회
func getPartitionOffsets(topic string, partition int) (int64, int64) {
	conn, err := kafka.DialLeader(context.Background(), "tcp", kafkaBrokers, topic, partition)
	if err != nil {
		return -1, -1
	}
	defer conn.Close()

	firstOffset, err := conn.ReadFirstOffset()
	if err != nil {
		firstOffset = -1
	}

	lastOffset, err := conn.ReadLastOffset()
	if err != nil {
		lastOffset = -1
	}

	return firstOffset, lastOffset
}

// getReplicaIDs 복제본 ID 리스트 추출
func getReplicaIDs(brokers []kafka.Broker) []int {
	ids := make([]int, len(brokers))
	for i, broker := range brokers {
		ids[i] = broker.ID
	}
	return ids
}

// BrokerInfo 브로커 정보
type BrokerInfo struct {
	ID   int    `json:"id"`
	Host string `json:"host"`
	Port int    `json:"port"`
	Rack string `json:"rack,omitempty"`
}

// GetBrokers 브로커 목록 조회
func GetBrokers(c *gin.Context) {
	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	brokers, err := conn.Brokers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get brokers: %v", err),
		})
		return
	}

	var brokerInfos []BrokerInfo
	for _, broker := range brokers {
		brokerInfos = append(brokerInfos, BrokerInfo{
			ID:   broker.ID,
			Host: broker.Host,
			Port: broker.Port,
			Rack: broker.Rack,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"brokers": brokerInfos,
		"count":   len(brokerInfos),
	})
}

// GetClusterInfo 클러스터 정보 조회
func GetClusterInfo(c *gin.Context) {
	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	// 브로커 정보
	brokers, err := conn.Brokers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get brokers: %v", err),
		})
		return
	}

	// 컨트롤러 정보
	controller, err := conn.Controller()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get controller: %v", err),
		})
		return
	}

	// 토픽 수
	partitions, err := conn.ReadPartitions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read partitions: %v", err),
		})
		return
	}

	topicMap := make(map[string]bool)
	for _, p := range partitions {
		topicMap[p.Topic] = true
	}

	c.JSON(http.StatusOK, gin.H{
		"cluster_id":      fmt.Sprintf("kafka-cluster-%d", time.Now().Unix()),
		"broker_count":    len(brokers),
		"topic_count":     len(topicMap),
		"partition_count": len(partitions),
		"controller": gin.H{
			"id":   controller.ID,
			"host": controller.Host,
			"port": controller.Port,
		},
	})
}
