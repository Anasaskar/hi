'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ModelSelector from './components/ModelSelector'
import UploadArea from './components/UploadArea'
import ResultDisplay from './components/ResultDisplay'
import PreviousOrders from './components/PreviousOrders'

export default function Dashboard() {
  const [selectedModel, setSelectedModel] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [orders, setOrders] = useState([])
  const [progress, setProgress] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState(null)

  const handleGenerate = async () => {
    if (!selectedModel || !uploadedImage) {
      alert('Please select a model and upload a clothing image')
      return
    }
    //d

    setIsGenerating(true)
    setProgress(0)
    setCurrentTaskId(null)

    try {
      const formData = new FormData()
      formData.append('modelId', selectedModel.id)
      formData.append('cloth', uploadedImage)

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        setResultImage(data.processedImageUrl)
        setCurrentTaskId(data.taskId)

        // If we have a task ID, start polling for progress
        if (data.taskId) {
          pollProgress(data.taskId)
        }

        // Refresh orders to show the new one
        fetchOrders()
      } else {
        alert('Generation failed: ' + data.message)
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const pollProgress = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId }),
        })

        const data = await response.json()

        if (data.ok) {
          setProgress(data.progress)

          if (data.status === 'COMPLETED' && data.downloadUrl) {
            setResultImage(data.downloadUrl)
            clearInterval(pollInterval)
            setIsGenerating(false)
            fetchOrders() // Refresh orders
          } else if (data.status === 'FAILED') {
            alert('Generation failed: ' + (data.error || 'Unknown error'))
            clearInterval(pollInterval)
            setIsGenerating(false)
          }
        }
      } catch (error) {
        console.error('Progress polling error:', error)
        clearInterval(pollInterval)
        setIsGenerating(false)
      }
    }, 2000) // Poll every 2 seconds

    // Clear interval after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isGenerating) {
        setIsGenerating(false)
        alert('Generation timed out. Please try again.')
      }
    }, 120000)
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      if (data.ok) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Clothing Try-On Dashboard
          </h1>
          <p className="text-gray-600">
            Upload clothing and see how it looks on different models
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <UploadArea
              uploadedImage={uploadedImage}
              onUpload={setUploadedImage}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="card text-center">
            <button
              onClick={handleGenerate}
              disabled={!selectedModel || !uploadedImage || isGenerating}
              className={`btn-primary text-lg px-8 py-3 ${(!selectedModel || !uploadedImage || isGenerating)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 transform transition-transform'
                }`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </div>
              ) : (
                'Generate AI Result'
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <ResultDisplay
            resultImage={resultImage}
            isGenerating={isGenerating}
            progress={progress}
            onDownload={() => {
              if (resultImage) {
                const link = document.createElement('a')
                link.href = resultImage
                link.download = 'ai-generated-result.jpg'
                link.click()
              }
            }}
            onGenerateNew={() => {
              setResultImage(null)
              setSelectedModel(null)
              setUploadedImage(null)
              setProgress(0)
              setCurrentTaskId(null)
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <PreviousOrders
            orders={orders}
            onRefresh={fetchOrders}
          />
        </motion.div>
      </div>
    </div>
  )
}
