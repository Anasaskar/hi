import { NextRequest, NextResponse } from 'next/server'

// Store active tasks in memory (in production, use Redis or database)
const activeTasks = new Map()

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json()
    
    if (!taskId) {
      return NextResponse.json(
        { ok: false, message: 'Task ID required' },
        { status: 400 }
      )
    }

    const taskData = activeTasks.get(taskId)
    if (!taskData) {
      return NextResponse.json(
        { ok: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      taskId: taskData.taskId,
      status: taskData.status,
      progress: taskData.progress,
      downloadUrl: taskData.downloadUrl,
      error: taskData.error
    })

  } catch (error) {
    console.error('Progress check error:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to check progress' },
      { status: 500 }
    )
  }
}

// Helper function to update task progress
export function updateTaskProgress(taskId: string, status: string, progress: number, downloadUrl?: string, error?: string) {
  activeTasks.set(taskId, {
    taskId,
    status,
    progress,
    downloadUrl,
    error,
    updatedAt: Date.now()
  })
}

// Helper function to get task progress
export function getTaskProgress(taskId: string) {
  return activeTasks.get(taskId)
}
