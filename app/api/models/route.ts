import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const modelsPath = path.join(process.cwd(), 'public', 'modelsImages')
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true })
    }

    const files = fs.readdirSync(modelsPath)
    const modelImages = files.filter(file =>
      file.toLowerCase().endsWith('.jpg') ||
      file.toLowerCase().endsWith('.jpeg') ||
      file.toLowerCase().endsWith('.png')
    )

    const models = modelImages.map((file, index) => ({
      id: `model${index + 1}`,
      name: `Model ${index + 1}`,
      image: `/modelsImages/${file}`
    }))

    // If no models found, create some placeholder models
    if (models.length === 0) {
      const placeholderModels = [
        {
          id: 'model1',
          name: 'Female Model 1',
          image: 'https://via.placeholder.com/300x400/6366f1/ffffff?text=Female+Model+1'
        },
        {
          id: 'model2', 
          name: 'Male Model 1',
          image: 'https://via.placeholder.com/300x400/8b5cf6/ffffff?text=Male+Model+1'
        },
        {
          id: 'model3',
          name: 'Female Model 2', 
          image: 'https://via.placeholder.com/300x400/06b6d4/ffffff?text=Female+Model+2'
        },
        {
          id: 'model4',
          name: 'Male Model 2',
          image: 'https://via.placeholder.com/300x400/10b981/ffffff?text=Male+Model+2'
        }
      ]
      return NextResponse.json({ ok: true, models: placeholderModels })
    }

    return NextResponse.json({ ok: true, models })
  } catch (error) {
    console.error('Error reading models directory:', error)
    return NextResponse.json(
      { ok: false, message: 'Error loading models' },
      { status: 500 }
    )
  }
}
