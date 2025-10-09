#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Copy model images from modelsImages to public/modelsImages
function copyModelImages() {
  const sourceDir = path.join(process.cwd(), 'modelsImages')
  const destDir = path.join(process.cwd(), 'public', 'modelsImages')
  
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.log('modelsImages directory not found, skipping copy...')
    return
  }
  
  // Get all image files from source
  const files = fs.readdirSync(sourceDir).filter(file =>
    file.toLowerCase().endsWith('.jpg') ||
    file.toLowerCase().endsWith('.jpeg') ||
    file.toLowerCase().endsWith('.png')
  )
  
  if (files.length === 0) {
    console.log('No model images found in modelsImages directory')
    return
  }
  
  // Copy each file
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const destPath = path.join(destDir, file)
    
    try {
      fs.copyFileSync(sourcePath, destPath)
      console.log(`✅ Copied ${file} to public/modelsImages/`)
    } catch (error) {
      console.error(`❌ Failed to copy ${file}:`, error.message)
    }
  })
  
  console.log(`🎉 Successfully copied ${files.length} model image(s)`)
}

// Run the copy function
copyModelImages()
