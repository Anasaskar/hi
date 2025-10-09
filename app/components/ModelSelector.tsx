'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Check } from 'lucide-react'

interface Model {
  id: string
  name: string
  image: string
}

interface ModelSelectorProps {
  selectedModel: Model | null
  onSelectModel: (model: Model) => void
}

export default function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models')
      const data = await response.json()
      if (data.ok) {
        setModels(data.models)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Select Model
        </h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5" />
        Select Model
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {models.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              selectedModel?.id === model.id
                ? 'border-primary-600 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelectModel(model)}
          >
            <div className="aspect-[3/4] relative">
              <img
                src={model.image}
                alt={model.name}
                className="w-full h-full object-cover"
              />
              {selectedModel?.id === model.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-primary-600 bg-opacity-20 flex items-center justify-center"
                >
                  <div className="bg-primary-600 text-white rounded-full p-2">
                    <Check className="h-4 w-4" />
                  </div>
                </motion.div>
              )}
            </div>
            <div className="p-3 bg-white">
              <p className="text-sm font-medium text-center">{model.name}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No models available</p>
        </div>
      )}
    </div>
  )
}
