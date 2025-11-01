package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"
)

// ConsumerGroupInfo Consumer Group 정보
type ConsumerGroupInfo struct {
	GroupID     string              `json:"group_id"`
	Topics      []string            `json:"topics"`
	Members     int                 `json:"members"`
	State       string              `json:"state"`
	Coordinator BrokerInfo          `json:"coordinator"`
	Offsets     []ConsumerGroupOffset `json:"offsets"`
}

// ConsumerGroupOffset Consumer Group 오프셋 정보
type ConsumerGroupOffset struct {
	Topic     string `json:"topic"`
	Partition int    `json:"partition"`
	Offset    int64  `json:"offset"`
	Lag       int64  `json:"lag"`
}

// LagInfo Consumer Lag 정보
type LagInfo struct {
	Topic          string           `json:"topic"`
	Group          string           `json:"group"`
	TotalLag       int64            `json:"total_lag"`
	PartitionLags  []PartitionLag   `json:"partition_lags"`
}

// PartitionLag 파티션별 Lag 정보
type PartitionLag struct {
	Partition     int   `json:"partition"`
	CurrentOffset int64 `json:"current_offset"`
	LogEndOffset  int64 `json:"log_end_offset"`
	Lag           int64 `json:"lag"`
}

// ClusterMetrics 클러스터 메트릭 정보
type ClusterMetrics struct {
	Timestamp      time.Time          `json:"timestamp"`
	BrokerCount    int                `json:"broker_count"`
	TopicCount     int                `json:"topic_count"`
	PartitionCount int                `json:"partition_count"`
	Topics         []TopicMetrics     `json:"topics"`
}

// TopicMetrics 토픽별 메트릭
type TopicMetrics struct {
	Name           string `json:"name"`
	PartitionCount int    `json:"partition_count"`
	TotalMessages  int64  `json:"total_messages"`
	TotalSize      int64  `json:"total_size"`
}

// GetConsumerGroups Consumer Group 목록 조회
func GetConsumerGroups(c *gin.Context) {
	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	// Consumer Group 목록 조회
	// Note: kafka-go는 직접적인 consumer group 목록 조회를 지원하지 않으므로
	// 일반적으로 알려진 그룹을 쿼리하거나, 별도의 관리 도구를 사용해야 함
	// 여기서는 기본 구조만 제공

	groups := []ConsumerGroupInfo{
		{
			GroupID: "example-group",
			Topics:  []string{"test-topic"},
			Members: 1,
			State:   "Stable",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"groups": groups,
		"count":  len(groups),
	})
}

// GetConsumerLag Consumer Lag 조회
func GetConsumerLag(c *gin.Context) {
	topic := c.Query("topic")
	group := c.Query("group")

	if topic == "" || group == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "topic and group are required",
		})
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

	// 토픽의 파티션 정보 조회
	partitions, err := conn.ReadPartitions(topic)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read partitions: %v", err),
		})
		return
	}

	var partitionLags []PartitionLag
	var totalLag int64

	// 각 파티션의 Lag 계산
	for _, partition := range partitions {
		// 파티션의 마지막 오프셋 조회
		partitionConn, err := kafka.DialLeader(context.Background(), "tcp", kafkaBrokers, topic, partition.ID)
		if err != nil {
			continue
		}

		logEndOffset, err := partitionConn.ReadLastOffset()
		partitionConn.Close()
		if err != nil {
			continue
		}

		// Consumer Group의 현재 오프셋 조회
		client := &kafka.Client{
			Addr: kafka.TCP(kafkaBrokers),
		}

		offsetFetchReq := &kafka.OffsetFetchRequest{
			GroupID: group,
			Topics: map[string][]int{
				topic: {partition.ID},
			},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		resp, err := client.OffsetFetch(ctx, offsetFetchReq)
		cancel()

		currentOffset := int64(0)
		if err == nil && len(resp.Topics) > 0 {
			if topicOffsets, ok := resp.Topics[topic]; ok && len(topicOffsets) > 0 {
				currentOffset = topicOffsets[0].CommittedOffset
			}
		}

		lag := logEndOffset - currentOffset
		if lag < 0 {
			lag = 0
		}

		totalLag += lag

		partitionLags = append(partitionLags, PartitionLag{
			Partition:     partition.ID,
			CurrentOffset: currentOffset,
			LogEndOffset:  logEndOffset,
			Lag:           lag,
		})
	}

	lagInfo := LagInfo{
		Topic:         topic,
		Group:         group,
		TotalLag:      totalLag,
		PartitionLags: partitionLags,
	}

	c.JSON(http.StatusOK, lagInfo)
}

// GetClusterMetrics 클러스터 전체 메트릭 조회
func GetClusterMetrics(c *gin.Context) {
	conn, err := kafka.Dial("tcp", kafkaBrokers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to connect to Kafka: %v", err),
		})
		return
	}
	defer conn.Close()

	// 브로커 수
	brokers, err := conn.Brokers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get brokers: %v", err),
		})
		return
	}

	// 파티션 정보
	partitions, err := conn.ReadPartitions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read partitions: %v", err),
		})
		return
	}

	// 토픽별로 그룹화 및 메트릭 계산
	topicMap := make(map[string][]kafka.Partition)
	for _, p := range partitions {
		topicMap[p.Topic] = append(topicMap[p.Topic], p)
	}

	var topicMetrics []TopicMetrics
	for topic, topicPartitions := range topicMap {
		var totalMessages int64

		// 각 파티션의 메시지 수 계산
		for _, p := range topicPartitions {
			first, last := getPartitionOffsets(topic, p.ID)
			if first >= 0 && last >= 0 {
				totalMessages += (last - first)
			}
		}

		topicMetrics = append(topicMetrics, TopicMetrics{
			Name:           topic,
			PartitionCount: len(topicPartitions),
			TotalMessages:  totalMessages,
			TotalSize:      0, // 정확한 크기는 별도 계산 필요
		})
	}

	metrics := ClusterMetrics{
		Timestamp:      time.Now(),
		BrokerCount:    len(brokers),
		TopicCount:     len(topicMap),
		PartitionCount: len(partitions),
		Topics:         topicMetrics,
	}

	c.JSON(http.StatusOK, metrics)
}

// GetTopicMetrics 특정 토픽의 메트릭 조회
func GetTopicMetrics(c *gin.Context) {
	topic := c.Param("topic")
	if topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "topic is required",
		})
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

	partitions, err := conn.ReadPartitions(topic)
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

	var totalMessages int64
	partitionDetails := make([]map[string]interface{}, 0)

	for _, p := range partitions {
		first, last := getPartitionOffsets(topic, p.ID)
		messages := int64(0)
		if first >= 0 && last >= 0 {
			messages = last - first
		}
		totalMessages += messages

		partitionDetails = append(partitionDetails, map[string]interface{}{
			"partition":      p.ID,
			"leader":         p.Leader.ID,
			"replicas":       len(p.Replicas),
			"isr":            len(p.Isr),
			"first_offset":   first,
			"last_offset":    last,
			"message_count":  messages,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"topic":            topic,
		"partition_count":  len(partitions),
		"total_messages":   totalMessages,
		"partitions":       partitionDetails,
		"timestamp":        time.Now(),
	})
}

// GetPartitionMetrics 특정 파티션의 메트릭 조회
func GetPartitionMetrics(c *gin.Context) {
	topic := c.Param("topic")
	partitionStr := c.Param("partition")

	if topic == "" || partitionStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "topic and partition are required",
		})
		return
	}

	partition := 0
	fmt.Sscanf(partitionStr, "%d", &partition)

	first, last := getPartitionOffsets(topic, partition)
	if first < 0 || last < 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Partition not found or error reading offsets",
		})
		return
	}

	messages := last - first

	c.JSON(http.StatusOK, gin.H{
		"topic":         topic,
		"partition":     partition,
		"first_offset":  first,
		"last_offset":   last,
		"message_count": messages,
		"timestamp":     time.Now(),
	})
}
