package main

import (
	"log"
	"os"

	"backend/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Kafka 브로커 주소 설정
	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	// Gin 라우터 초기화
	router := gin.Default()

	// CORS 설정
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	router.Use(cors.New(config))

	// 핸들러 초기화
	handlers.InitKafkaClient(kafkaBrokers)

	// API 라우트 설정
	api := router.Group("/api")
	{
		// Producer API
		api.POST("/produce", handlers.ProduceMessage)
		api.POST("/produce/batch", handlers.ProduceBatchMessages)

		// Consumer API
		api.GET("/consume", handlers.ConsumeMessages)
		api.GET("/consume/ws", handlers.ConsumeMessagesWebSocket)

		// Topic 관리 API
		api.GET("/topics", handlers.ListTopics)
		api.POST("/topics", handlers.CreateTopic)
		api.GET("/topics/:name", handlers.GetTopicDetails)
		api.DELETE("/topics/:name", handlers.DeleteTopic)

		// Metrics API
		api.GET("/metrics/consumer-groups", handlers.GetConsumerGroups)
		api.GET("/metrics/lag", handlers.GetConsumerLag)
		api.GET("/brokers", handlers.GetBrokers)
		api.GET("/metrics/cluster", handlers.GetClusterMetrics)
	}

	// 헬스 체크 엔드포인트
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
			"kafka":  kafkaBrokers,
		})
	})

	// 서버 시작
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s, connecting to Kafka at %s", port, kafkaBrokers)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
