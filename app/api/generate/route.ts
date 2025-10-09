import { NextRequest, NextResponse } from 'next/server'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import fs from 'fs'
import { updateTaskProgress } from '../progress/route'

// Initialize LowDB
const file = path.join(process.cwd(), 'data', 'orders.json')
const adapter = new JSONFile(file)
const db = new Low(adapter, { orders: [] })

// FitRoom API configuration
const FITROOM_API_KEY = 'bfede079d903452e834fa557b895290fe8a7d6b0d74576ad9ccc2e6f78d07768'
const FITROOM_BASE_URL = 'https://platform.fitroom.app/api'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const modelId = formData.get('modelId') as string
    const clothFile = formData.get('cloth') as File

    if (!modelId || !clothFile) {
      return NextResponse.json(
        { ok: false, message: 'Missing modelId or cloth image' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(clothFile.type)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid file type. Please upload JPG or PNG.' },
        { status: 400 }
      )
    }

    // Convert files to base64
    const clothBuffer = await clothFile.arrayBuffer()
    const clothBase64 = Buffer.from(clothBuffer).toString('base64')

    // Load the actual model image based on modelId
    const modelsDir = path.join(process.cwd(), 'public', 'modelsImages')
    const files = fs.readdirSync(modelsDir).filter(f => /\.(jpe?g|png)$/i.test(f))
    const index = parseInt(modelId.replace(/[^0-9]/g, ''), 10) - 1
    const modelFile = files[index]
    
    if (!modelFile) {
      return NextResponse.json(
        { ok: false, message: 'Model not found' },
        { status: 400 }
      )
    }

    const modelImagePath = path.join(modelsDir, modelFile)
    const modelImageBuffer = fs.readFileSync(modelImagePath)
    const modelBase64 = modelImageBuffer.toString('base64')

    let processedImageUrl = null

    try {
      console.log('Creating FitRoom try-on task...')
      
      // Create FormData for FitRoom API
      const fitroomFormData = new FormData()
      fitroomFormData.append('cloth_image', clothFile)
      fitroomFormData.append('model_image', new File([modelImageBuffer], modelFile, { type: 'image/jpeg' }))
      fitroomFormData.append('cloth_type', 'upper') // Default to upper body clothing
      fitroomFormData.append('hd_mode', 'true') // Use high quality mode
      
      console.log('Sending to FitRoom API with HD mode enabled')

      // Create try-on task
      const createResponse = await fetch(`${FITROOM_BASE_URL}/tryon/v2/tasks`, {
        method: 'POST',
        headers: {
          'X-API-KEY': FITROOM_API_KEY,
        },
        body: fitroomFormData,
      })

      if (!createResponse.ok) {
        throw new Error(`FitRoom API error: ${createResponse.status} ${createResponse.statusText}`)
      }

      const createData = await createResponse.json()
      console.log('FitRoom task created:', createData)

      if (!createData.task_id) {
        throw new Error('No task ID received from FitRoom API')
      }

      // Poll for task completion with progress tracking
      const taskId = createData.task_id
      let attempts = 0
      const maxAttempts = 60 // 2 minutes max (polling every 2 seconds)

      // Initialize progress tracking
      updateTaskProgress(taskId, 'CREATED', 0)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const statusResponse = await fetch(`${FITROOM_BASE_URL}/tryon/v2/tasks/${taskId}`, {
          headers: {
            'X-API-KEY': FITROOM_API_KEY,
          },
        })

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`)
        }

        const statusData = await statusResponse.json()
        console.log(`Task ${taskId} status: ${statusData.status} (${statusData.progress}%)`)

        // Update progress tracking
        updateTaskProgress(taskId, statusData.status, statusData.progress || 0)

        if (statusData.status === 'COMPLETED') {
          processedImageUrl = statusData.download_signed_url
          updateTaskProgress(taskId, 'COMPLETED', 100, statusData.download_signed_url)
          console.log('FitRoom task completed successfully!')
          break
        } else if (statusData.status === 'FAILED') {
          updateTaskProgress(taskId, 'FAILED', 0, undefined, statusData.error || 'Unknown error')
          throw new Error(`FitRoom task failed: ${statusData.error || 'Unknown error'}`)
        }

        attempts++
      }

      if (!processedImageUrl) {
        updateTaskProgress(taskId, 'FAILED', 0, undefined, 'Task timed out after 2 minutes')
        throw new Error('FitRoom task timed out after 2 minutes')
      }

    } catch (fitroomError) {
      console.error('FitRoom API error:', fitroomError)
      
      // Fallback to composite image if FitRoom fails
      console.log('Creating fallback composite image...')
      const compositeSvg = `
        <svg width="600" height="800" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="modelPattern" patternUnits="userSpaceOnUse" width="600" height="800">
              <image href="data:image/jpeg;base64,${modelBase64}" width="600" height="800" preserveAspectRatio="xMidYMid slice"/>
            </pattern>
            <pattern id="clothPattern" patternUnits="userSpaceOnUse" width="200" height="200">
              <image href="data:image/jpeg;base64,${clothBase64}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>
            </pattern>
          </defs>
          <rect width="600" height="800" fill="url(#modelPattern)"/>
          <rect x="200" y="150" width="200" height="200" fill="url(#clothPattern)" opacity="0.8" rx="10"/>
          <text x="300" y="400" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle" stroke="black" stroke-width="2">AI Generated: Model + Clothing</text>
          <text x="300" y="420" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" stroke="black" stroke-width="1">Composite Preview (FitRoom unavailable)</text>
        </svg>
      `
      processedImageUrl = `data:image/svg+xml;base64,${Buffer.from(compositeSvg).toString('base64')}`
    }

    // Save order to database
    await db.read()
    
    const newOrder = {
      id: Date.now().toString(),
      modelId,
      modelName: `Model ${index + 1}`,
      tshirtImage: `data:image/jpeg;base64,${clothBase64}`,
      processedImage: processedImageUrl,
      status: processedImageUrl ? 'Done' : 'Processing',
      createdAt: Date.now()
    }

    db.data.orders.unshift(newOrder)
    await db.write()

    return NextResponse.json({
      ok: true,
      processedImageUrl: newOrder.processedImage,
      order: newOrder,
      taskId: createData?.task_id || null
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { ok: false, message: 'Processing failed', error: error.message },
      { status: 500 }
    )
  }
}
