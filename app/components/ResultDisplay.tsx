'use client'

import { motion } from 'framer-motion'
import { Download, RotateCcw, Image as ImageIcon } from 'lucide-react'

interface ResultDisplayProps {
  resultImage: string | null
  isGenerating: boolean
  progress: number
  onDownload: () => void
  onGenerateNew: () => void
}

export default function ResultDisplay({ 
  resultImage, 
  isGenerating, 
  progress,
  onDownload, 
  onGenerateNew 
}: ResultDisplayProps) {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5" />
        Result
      </h2>

      <div className="min-h-[400px] flex items-center justify-center">
        {isGenerating ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating your AI result...</p>
            <p className="text-sm text-gray-500 mt-2">
              Using FitRoom AI for high-quality results
            </p>
            
            {/* Progress Bar */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-primary-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {progress < 20 && "Initializing AI model..."}
                {progress >= 20 && progress < 50 && "Processing images..."}
                {progress >= 50 && progress < 80 && "Generating try-on..."}
                {progress >= 80 && progress < 100 && "Finalizing result..."}
                {progress === 100 && "Complete!"}
              </p>
            </div>
          </motion.div>
        ) : resultImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 mb-4">
              <img
                src={resultImage}
                alt="AI Generated Result"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownload}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Result
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGenerateNew}
                className="btn-secondary flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Generate New
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500"
          >
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Your generated image will appear here</p>
            <p className="text-sm">
              Select a model and upload clothing to get started
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
